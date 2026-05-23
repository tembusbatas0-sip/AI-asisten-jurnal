import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { AnalysisHistory, KnowledgeItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai'; // Menggunakan library asli kamu sesuai package.json

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
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

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

  // ... (Bagian import dan setup state tetap sama)

export default function TaskInterface({ knowledgeBase, onSaveHistory }: Props) {
  // ... (State seperti file, role, dll tetap sama)

  const extractTextFromFile = (fileToExtract: File): Promise<string> => {
    // ... (Fungsi ini tetap sama)
  };

  // --- MULAI PENYELIPAN ---
  const processManuscript = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg('');
    setResult(null);

    try {
      // 1. Cek File
      console.log("Langkah 1: Membaca file...");
      const manuscriptText = await extractTextFromFile(file);
      if (!manuscriptText) throw new Error("File kosong atau gagal dibaca.");

      // 2. Inisialisasi AI (Di sini kamu selipkan API Key-mu)
      console.log("Langkah 2: Menginisialisasi AI...");
      const apiKey = "AIzaSyA2910jEh3J7b16O2KMbU9aUpL94ZTuDCw"; // <--- MASUKKAN API KEY KAMU DI SINI
      if (!apiKey || apiKey === "AIzaSy...") throw new Error("API Key belum diisi di kode.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      // 3. Persiapan Prompt
      console.log("Langkah 3: Mengirim ke Gemini...");
      const prompt = `Analisis naskah berikut: ${manuscriptText}`;

      // 4. Panggil AI
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });
      
      // 5. Cek Respon
      console.log("Langkah 4: Mendapatkan respon...", aiResponse);
      if (!aiResponse || !aiResponse.text) {
        throw new Error("AI tidak memberikan respon (Cek kuota API).");
      }

      setResult(aiResponse.text);

    } catch (err: any) {
      // --- BAGIAN PENGIDENTIFIKASI KESALAHAN ---
      console.error("=== TERJADI KESALAHAN ===");
      console.error("Lokasi Error:", err.stack);
      console.error("Pesan Error:", err.message);
      
      const userFriendlyMsg = `Error: ${err.message}`;
      setErrorMsg(userFriendlyMsg);
      alert("Gagal memproses! Periksa Inspect > Console untuk detail:\n\n" + userFriendlyMsg);
      
    } finally {
      setIsProcessing(false);
      console.log("Selesai proses.");
    }
  };
  // --- SELESAI PENYELIPAN ---

  return (
    // ... (Bagian return JSX tetap sama)
  );
}

  return (
    <div className="space-y-8 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analisis Naskah Penulis</h2>
        <p className="text-slate-500">Unggah naskah dan pilih mode analisis. AI akan memberikan ulasan langsung dari browser Anda.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
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
                  <div className="font-semibold text-sm">Editor Jurnal</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'reviewer' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <input type="radio" className="mt-1" checked={role === 'reviewer'} onChange={() => setRole('reviewer')} />
                <div>
                  <div className="font-semibold text-sm">Reviewer Substansi</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'copyeditor' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <input type="radio" className="mt-1" checked={role === 'copyeditor'} onChange={() => setRole('copyeditor')} />
                <div>
                  <div className="font-semibold text-sm">Copyeditor Bahasa</div>
                </div>
              </label>
            </div>
          </div>
          
          <button 
            onClick={processManuscript}
            disabled={!file || isProcessing}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-sm flex justify-center items-center gap-2"
          >
            {isProcessing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Memproses...</> : 'Mulai Analisis'}
          </button>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
                <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-2" />
                <p>AI sedang menganalisis naskah Anda...</p>
              </div>
            ) : result ? (
              <div className="prose bg-slate-50 rounded-xl p-5 border border-slate-100 max-h-[600px] overflow-y-auto">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
                <FileText className="w-12 h-12 mb-2 text-slate-200" />
                <p>Hasil analisis akan muncul di sini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
