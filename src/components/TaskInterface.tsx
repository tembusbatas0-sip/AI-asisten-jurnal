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

  const processManuscript = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg('');
    setResult(null);

    try {
      let kbContext = '';
      if (role === 'editor') {
        const templates = knowledgeBase.filter(k => k.type === 'template');
        kbContext = templates.map(t => t.content).join('\n\n---\n\n');
      } else if (role === 'reviewer' || role === 'copyeditor') {
        const refs = knowledgeBase.filter(k => k.type === 'reference');
        kbContext = refs.map(r => r.content).join('\n\n---\n\n');
      }

      const manuscriptText = await extractTextFromFile(file);

      // Inisialisasi menggunakan class GoogleGenAI yang benar
      const ai = new GoogleGenAI({ apiKey: "AIzaSyA2910jEh3J7b16O2KMbU9aUpL94ZTuDCw" // Masukkan langsung API Key kamu di sini
});
      
      let systemInstruction = "";
      if (role === 'editor') systemInstruction = "Anda adalah Editor Jurnal Ilmiah senior. Periksa kesesuaian format berdasarkan gaya selingkung.";
      else if (role === 'reviewer') systemInstruction = "Anda adalah Reviewer Ahli. Analisis substansi dan metodologi ilmiah.";
      else systemInstruction = "Anda adalah Copyeditor Bahasa. Perbaiki ejaan dan tata bahasa.";

      const prompt = `${systemInstruction}\n\nAcuan: ${kbContext || "Standar umum jurnal ilmiah."}\n\nNaskah: ${manuscriptText}\n\nTugas: Analisis naskah, tandai revisi dengan **bold** (Markdown).`;

      // Cara panggil model yang benar untuk SDK @google/genai versi terbaru
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });
      
      const aiResultText = aiResponse.text;
      
      if (!aiResultText) {
        throw new Error('AI tidak mengembalikan respon yang valid.');
      }

      setResult(aiResultText);

      onSaveHistory({
        id: uuidv4(),
        filename: file.name,
        role: role,
        date: new Date().toISOString(),
        originalText: manuscriptText,
        resultText: aiResultText,
        kbReferences: []
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsProcessing(false);
    }
  };

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
