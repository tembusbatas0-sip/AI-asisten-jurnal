import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalysisHistory, KnowledgeItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth'; // Import pembaca .docx di frontend
import { GoogleGenAI } from '@google/genai'; // Import mesin AI Gemini

interface Props {
  knowledgeBase: KnowledgeItem[];
  onSaveHistory: (history: AnalysisHistory) => void;
}

export default function TaskInterface({ knowledgeBase, onSaveHistory }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<'editor' | 'reviewer' | 'copyeditor'>('copyeditor');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Fungsi pembantu mengekstrak file .docx langsung di browser
  const extractTextFromFile = (fileToExtract: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(fileToExtract);
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Gagal membaca data file naskah.'));
          return;
        }
        try {
          const res = await mammoth.extractRawText({ arrayBuffer });
          resolve(res.value);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file dari sistem lokal.'));
    });
  };

  const processManuscript = async () => {
    if (!file) {
      setErrorMsg('Tolong unggah naskah terlebih dahulu.');
      return;
    }
    
    setIsProcessing(true);
    setErrorMsg('');
    setResult(null);

    try {
      // 1. Susun Basis Pengetahuan (Knowledge Base)
      let kbContext = '';
      if (role === 'editor') {
        const templates = knowledgeBase.filter(k => k.type === 'template');
        kbContext = templates.map(t => t.content).join('\n\n---\n\n');
      } else if (role === 'reviewer' || role === 'copyeditor') {
        const refs = knowledgeBase.filter(k => k.type === 'reference');
        kbContext = refs.map(r => r.content).join('\n\n---\n\n');
      }

      // 2. Ekstrak teks naskah penulis secara lokal
      const manuscriptText = await extractTextFromFile(file);

      // 3. Hubungkan langsung ke SDK Gemini menggunakan API Key dari file .env
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      // 4. Tentukan instruksi spesifik berdasarkan tombol Mode Asisten yang dipilih
      let systemInstruction = "";
      if (role === 'editor') {
        systemInstruction = "Anda adalah seorang Editor Jurnal Ilmiah senior. Tugas Anda adalah memeriksa kesesuaian format naskah naskah berdasarkan gaya selingkung atau template yang disediakan.";
      } else if (role === 'reviewer') {
        systemInstruction = "Anda adalah seorang Reviewer Ahli (Mitra Bestari). Tugas Anda adalah menganalisis kedalaman substansi naskah ilmiah, metodologi, dan kontribusi ilmiahnya serta memberikan saran perbaikan konten.";
      } else {
        systemInstruction = "Anda adalah seorang Copyeditor Bahasa. Perbaiki naskah berdasarkan aturan PUEBI, ejaan, efektivitas kalimat, dan tata bahasa jurnal ilmiah.";
      }

      const prompt = `
        ${systemInstruction}
        
        Berikut adalah teks dokumen acuan dari Basis Pengetahuan (Knowledge Base) yang harus kamu ikuti:
        ${kbContext ? kbContext : "Tidak ada dokumen acuan spesifik yang diunggah. Gunakan standar umum jurnal ilmiah terakreditasi."}
        
        Tugas: Analisis naskah penulis di bawah ini. Berikan ulasan/rekomendasi perbaikan. Jika ada bagian kalimat yang direvisi atau diperbaiki, tandai bagian yang diubah dengan cetak tebal (bold) menggunakan format Markdown agar penulis mudah melihat perbedaannya.
        
        Naskah Penulis yang Harus Dianalisis:
        ${manuscriptText}
      `;

      // 5. Panggil model Gemini secara langsung dari browser (Client-Side)
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: prompt,
      });

      const aiResultText = response.text;
      
      if (!aiResultText) {
        throw new Error('AI tidak mengembalikan respon yang valid.');
      }

      // Tampilkan hasil analisis AI ke layar komponen kanan
      setResult(aiResultText);

      // Simpan riwayat ke menu Riwayat
      let usedRefs: string[] = [];
      if (role === 'editor') usedRefs = knowledgeBase.filter(k => k.type === 'template').map(t => t.title);
      else if (role === 'reviewer' || role === 'copyeditor') usedRefs = knowledgeBase.filter(k => k.type === 'reference').map(t => t.title);

      onSaveHistory({
        id: uuidv4(),
        filename: file.name,
        role: role,
        date: new Date().toISOString(),
        originalText: manuscriptText,
        resultText: aiResultText,
        kbReferences: usedRefs,
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat meminta analisis dari AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocx = async () => {
    if (!result) return;
    
    try {
      // Catatan: Jika fitur unduh file ini nanti butuh backend terpisah, pastikan endpoint ini siap. 
      // Untuk sementara, fungsi ini tetap dipertahankan sesuai struktur kode asli kamu.
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result })
      });

      if (!res.ok) throw new Error('Gagal membuat dokumen');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hasil_${role}_${file?.name || 'naskah.docx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengunduh dokumen');
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analisis Naskah Penulis</h2>
        <p className="text-slate-500">Unggah naskah dan pilih mode analisis. AI akan memberikan ulasan dan menandai bagian yang diubah dengan cetak tebal.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri: Tombol Unggah & Pilihan Mode */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">1. Unggah Naskah</h3>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}>
              {file ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <span className="text-sm font-medium text-emerald-700 text-center">{file.name}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                  <span className="text-sm font-medium text-indigo-600">Pilih File .docx</span>
                </>
              )}
              <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">2. Pilih Mode Asisten</h3>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'editor' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <input type="radio" className="mt-1" checked={role === 'editor'} onChange={() => setRole('editor')} />
                <div>
                  <div className="font-semibold text-sm">Editor
