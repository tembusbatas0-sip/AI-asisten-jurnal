import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalysisHistory, KnowledgeItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

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

  const processManuscript = async () => {
    if (!file) {
      setErrorMsg('Tolong unggah naskah terlebih dahulu.');
      return;
    }
    
    setIsProcessing(true);
    setErrorMsg('');
    setResult(null);

    try {
      // Build knowledge base contextual string
      let kbContext = '';
      if (role === 'editor') {
        const templates = knowledgeBase.filter(k => k.type === 'template');
        kbContext = templates.map(t => t.content).join('\n\n---\n\n');
      } else if (role === 'reviewer' || role === 'copyeditor') {
        const refs = knowledgeBase.filter(k => k.type === 'reference');
        kbContext = refs.map(r => r.content).join('\n\n---\n\n');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', role);
      formData.append('kbContext', kbContext);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Gagal memproses naskah');
      }

      const data = await response.json();
      setResult(data.result);

      // Save to history
      const activeReferences = role === 'editor' 
        ? knowledgeBase.filter(k => k.type === 'template').map(t => t.title)
        : role === 'reviewer'
          ? knowledgeBase.filter(k => k.type === 'reference').map(r => r.title)
          : knowledgeBase.map(k => k.title); // copyeditor uses all if available, or maybe references? Wait, the server prompt actually uses kbContext. In my updated copyeditor prompt, it says "Basis Referensi Jurnal Terbitan". So it uses the same as reviewer? Let's just use whatever has content. I'll just check which ones were used.
      
      let usedRefs: string[] = [];
      if (role === 'editor') usedRefs = knowledgeBase.filter(k => k.type === 'template').map(t => t.title);
      else if (role === 'reviewer') usedRefs = knowledgeBase.filter(k => k.type === 'reference').map(t => t.title);
      else if (role === 'copyeditor') usedRefs = knowledgeBase.filter(k => k.type === 'reference').map(t => t.title);

      onSaveHistory({
        id: uuidv4(),
        filename: file.name,
        role: role,
        date: new Date().toISOString(),
        originalText: data.originalText,
        resultText: data.result,
        kbReferences: usedRefs,
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocx = async () => {
    if (!result) return;
    
    try {
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
        
        {/* Left column: Controls */}
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
                  <div className="text-xs text-slate-500">Cek format & pedoman gaya selingkung</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'reviewer' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <input type="radio" className="mt-1" checked={role === 'reviewer'} onChange={() => setRole('reviewer')} />
                <div>
                  <div className="font-semibold text-sm">Reviewer Substansi</div>
                  <div className="text-xs text-slate-500">Analisis kelayakan terbit & revisi konten</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'copyeditor' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <input type="radio" className="mt-1" checked={role === 'copyeditor'} onChange={() => setRole('copyeditor')} />
                <div>
                  <div className="font-semibold text-sm">Copyeditor Tata Bahasa</div>
                  <div className="text-xs text-slate-500">Perbaikan Ejaan, PUEBI, & alur kalimat</div>
                </div>
              </label>
            </div>
          </div>

          <button 
            onClick={processManuscript}
            disabled={!file || isProcessing}
            className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm flex justify-center items-center gap-2 transition-colors ${
              !file || isProcessing ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isProcessing ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Memproses...</>
            ) : (
              <><FileText className="w-5 h-5" /> Mulai Analisis</>
            )}
          </button>
          
          {errorMsg && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex gap-2">
               <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
               <p>{errorMsg}</p>
             </div>
          )}
        </div>

        {/* Right column: Result */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">Hasil Analisis & Revisi</h3>
              {result && (
                <button 
                  onClick={downloadDocx}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Unduh .docx
                </button>
              )}
            </div>

            {isProcessing ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <RefreshCw className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                 <p>AI sedang menganalisis naskah Anda berdasarkan basis pengetahuan...</p>
                 <p className="text-sm mt-2 max-w-sm text-center">Proses ini mungkin memerlukan waktu beberapa puluh detik tergantung panjang naskah.</p>
               </div>
            ) : result ? (
               <div className="flex-1 overflow-y-auto pr-2 bg-slate-50 rounded-xl p-5 border border-slate-100 markdown-body font-serif text-base text-slate-700">
                 <ReactMarkdown>{result}</ReactMarkdown>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <FileText className="w-12 h-12 mb-4 text-slate-200" />
                 <p>Hasil analisis akan muncul di sini</p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
