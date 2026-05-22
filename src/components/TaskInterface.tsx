import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalysisHistory, KnowledgeItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      let kbContext = '';
      if (role === 'editor') {
        const templates = knowledgeBase.filter(k => k.type === 'template');
        kbContext = templates.map(t => t.content).join('\n\n---\n\n');
      } else if (role === 'reviewer' || role === 'copyeditor') {
        const refs = knowledgeBase.filter(k => k.type === 'reference');
        kbContext = refs.map(r => r.content).join('\n\n---\n\n');
      }

      const manuscriptText = await extractTextFromFile(file);

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      let systemInstruction = "";
      if (role === 'editor') systemInstruction = "Anda adalah Editor Jurnal Ilmiah senior. Periksa kesesuaian format berdasarkan gaya selingkung.";
      else if (role === 'reviewer') systemInstruction = "Anda adalah Reviewer Ahli. Analisis substansi dan metodologi ilmiah.";
      else systemInstruction = "Anda adalah Copyeditor Bahasa. Perbaiki ejaan dan tata bahasa.";

      const prompt = `${systemInstruction}\n\nAcuan: ${kbContext || "Standar umum jurnal ilmiah."}\n\nNaskah: ${manuscriptText}\n\nTugas: Analisis naskah, tandai revisi dengan **bold** (Markdown).`;

      const aiResponse = await model.generateContent(prompt);
      const aiResultText = aiResponse.response.text();
      
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

  const downloadDocx = async () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hasil_${role}_${file?.name || 'naskah.docx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analisis Naskah</h2>
        <p className="text-slate-500">Unggah naskah untuk dianalisis AI.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <label className="flex flex-col items-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
            <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
            <span className="text-sm font-medium">Pilih File .docx</span>
            <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
          </label>
          
          <button 
            onClick={processManuscript}
            disabled={!file || isProcessing}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl"
          >
            {isProcessing ? 'Memproses...' : 'Mulai Analisis'}
          </button>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border min-h-[500px]">
            {isProcessing ? <RefreshCw className="animate-spin w-10 h-10" /> : result ? <ReactMarkdown>{result}</ReactMarkdown> : <p>Hasil akan muncul di sini</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
