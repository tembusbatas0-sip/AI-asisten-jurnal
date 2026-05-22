import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import * as docx from 'docx';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Lazy initialization of Gemini
let ai: GoogleGenAI | null = null;
function getGemini() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// Route to extract text from a docx file (for Knowledge Base)
app.post('/api/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    res.json({ text: result.value });
  } catch (error: any) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: error.message || 'Failed to extract text' });
  }
});

// Route to analyze manuscript
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const role = req.body.role; // 'editor', 'reviewer', 'copyeditor'
    const kbContext = req.body.kbContext || '';
    
    const extracted = await mammoth.extractRawText({ buffer: req.file.buffer });
    const manuscriptText = extracted.value;
    
    const genAI = getGemini();
    const model = 'gemini-2.5-pro'; // or gemini-3.1-pro-preview depending on availability, let's use gemini-2.5-pro for complex writing
    
    let systemInstruction = "Anda adalah Asisten Jurnal AI profesional.";
    let prompt = "";
    
    if (role === 'editor') {
      systemInstruction = `Anda adalah Editor Jurnal yang sangat teliti. Tugas utama Anda adalah memastikan naskah penulis sesuai dengan acuan (Template/Gaya Selingkung Jurnal) yang diberikan.
Aturan:
1. Analisis apakah naskah sesuai dengan acuan gaya selingkung.
2. Berikan saran perbaikan otomatis berdasarkan pedoman tersebut.
3. Pertahankan teks asli penulis semaksimal mungkin.
4. JIKA Anda MENGUBAH, MENAMBAH, atau MENGGANTI kata/kalimat, Anda WAJIB menandainya dengan cetak tebal (menggunakan format markdown **kata yang diubah**).`;
      prompt = `Acuan Template/Gaya Selingkung:\n${kbContext}\n\nNaskah Penulis:\n${manuscriptText}\n\nBerikan analisis komprehensif. Pada bagian akhir, berikan Teks Naskah Hasil Revisi secara utuh dengan perubahan yang dicetak tebal (**ubah**).`;
    } else if (role === 'reviewer') {
      systemInstruction = `Anda adalah Reviewer Jurnal (Mitra Bebestari) yang kritis dan objektif.
Tugas Anda:
1. Analisis substansi penelitian (Latar belakang, Metode, Hasil, Kesimpulan).
2. Tentukan apakah naskah layak dipublikasikan, perlu revisi minor, revisi mayor, atau ditolak.
3. Berikan argumen yang mendalam untuk setiap komentar.`;
      prompt = `Konteks Jurnal Terbitan Sebelumnya (sebagai acuan kualitas jika ada):\n${kbContext}\n\nNaskah Penulis:\n${manuscriptText}\n\nMohon lakukan review substansi secara menyeluruh dan terstruktur. Tidak perlu menulis ulang seluruh teks, cukup berikan feedback per bab dan kesimpulan akhir.`;
    } else if (role === 'copyeditor') {
      systemInstruction = `Anda adalah Copyeditor Jurnal profesional.
Tugas utama Anda:
1. Mengoreksi tata bahasa, memperbaiki struktur kalimat yang janggal, dan meningkatkan kejelasan.
2. Memastikan alur tulisan yang logis, mulus, dan mudah diikuti oleh pembaca tanpa merusak makna asli.
3. Menyesuaikan dengan standar gaya penulisan jurnal jika ada referensi.
4. JIKA Anda MENGUBAH, MENAMBAH, atau MENGGANTI kata/kalimat, Anda WAJIB menyorotnya dengan cetak tebal (menggunakan format markdown **contoh kata**).`;
       prompt = `Basis Referensi Jurnal Terbitan (Jika ada, gunakan ini sebagai panduan gaya bahasa dan standar kelancaran kalimat):\n${kbContext}\n\nNaskah Penulis:\n${manuscriptText}\n\nTolong perbaiki tata bahasa, tingkatkan kejelasan kalimat, dan pastikan alur tulisan logis serta mudah dipahami. Berikan Teks Naskah Hasil Revisi secara utuh dengan bagian yang Anda perbaiki dicetak tebal (**ubah**). Jika ada catatan, taruh di awal atau akhir.`;
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for consistency, especially for copyediting
      }
    });

    const aiResult = response.text || '';
    
    // Attempt to split feedback and revised text if possible, but returning raw is safer
    res.json({ result: aiResult, originalText: manuscriptText });
    
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze manuscript' });
  }
});

// Route to generate Docx from markdown-like text (simple *bold* support)
app.post('/api/generate-docx', express.json(), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const paragraphs = text.split('\n');
    const docParagraphs: docx.Paragraph[] = [];

    for (const pText of paragraphs) {
      if (pText.trim() === '') {
        docParagraphs.push(new docx.Paragraph({ children: [] }));
        continue;
      }
      
      // Simple parse for **bold**
      const parts = pText.split(/(\*\*.*?\*\*)/g);
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new docx.TextRun({ text: part.slice(2, -2), bold: true });
        }
        return new docx.TextRun({ text: part });
      });

      docParagraphs.push(new docx.Paragraph({ children: runs }));
    }

    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: docParagraphs,
      }]
    });

    const buffer = await docx.Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="hasil-revisi.docx"');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating docx:', error);
    res.status(500).json({ error: error.message || 'Failed to generate document' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
