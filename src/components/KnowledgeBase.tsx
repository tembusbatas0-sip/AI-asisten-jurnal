import React, { useState } from 'react';
import { FileUp, Trash2, BookTemplate, ScrollText } from 'lucide-react';
import { KnowledgeItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import mammoth from 'mammoth'; // 1. Import library mammoth yang sudah diinstall

interface Props {
  knowledgeBase: KnowledgeItem[];
  onUpdate: (kb: KnowledgeItem[]) => void;
}

export default function KnowledgeBase({ knowledgeBase, onUpdate }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'template' | 'reference') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setErrorMsg('Hanya file .docx yang didukung');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    // 2. Gunakan FileReader untuk membaca file sebagai ArrayBuffer di browser
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;

      try {
        if (!arrayBuffer) throw new Error('Gagal membaca data file');

        // 3. Ekstraksi teks murni langsung dari arrayBuffer menggunakan mammoth
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const extractedText = result.value; // Hasil teks murni .docx

        const newItem: KnowledgeItem = {
          id: uuidv4(),
          title: file.name,
          type,
          content: extractedText, // Masukkan teks hasil ekstraksi ke content
          dateAdded: new Date().toISOString(),
        };

        onUpdate([newItem, ...knowledgeBase]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Terjadi kesalahan saat mengekstrak file');
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari sistem lokal');
      setIsUploading(false);
    };
  };

  const removeKb = (id: string) => {
    onUpdate(knowledgeBase.filter(k => k.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Basis Pengetahuan (Knowledge Base)</h2>
        <p className="text-slate-500">Unggah template gaya selingkung atau jurnal yang sudah terbit sebagai acuan tata bahasa dan format untuk AI.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
          {errorMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Templates Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
              <BookTemplate className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Template / Panduan</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Unggah file pedoman penulisan atau gaya selingkung (.docx)</p>
          
          <label className="flex justify-center flex-col items-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors mt-auto">
            <FileUp className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-indigo-600">Pilih File .docx</span>
            <input 
              type="file" 
              accept=".docx" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'template')}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* References Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <ScrollText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Jurnal Referensi</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Unggah contoh jurnal yang sudah terbit sebagai standar kualitas (.docx)</p>
          
          <label className="flex justify-center flex-col items-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors mt-auto">
            <FileUp className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-emerald-600">Pilih File .docx</span>
            <input 
              type="file" 
              accept=".docx" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'reference')}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-bold mb-4">Daftar Acuan Tersimpan</h3>
        {knowledgeBase.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400">
            Belum ada acuan yang diunggah
          </div>
        ) : (
          <div className="grid gap-3">
            {knowledgeBase.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  {item.type === 'template' ? (
                    <BookTemplate className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <ScrollText className="w-5 h-5 text-emerald-600" />
                  )}
                  <div>
                    <h4 className="font-medium text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-400">
                      {item.type === 'template' ? 'Template' : 'Referensi'} • {new Date(item.dateAdded).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => removeKb(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
