import React from 'react';
import { AnalysisHistory } from '../types';
import { Clock, FileText, Download, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  history: AnalysisHistory[];
}

export default function HistoryList({ history }: Props) {
  const [selectedItem, setSelectedItem] = React.useState<AnalysisHistory | null>(null);

  const downloadDocx = async (item: AnalysisHistory) => {
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.resultText })
      });

      if (!res.ok) throw new Error('Gagal membuat dokumen');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Riwayat_${item.role}_${item.filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh dokumen');
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Clock className="w-16 h-16 mb-4 text-slate-200" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Belum Ada Riwayat</h2>
        <p>Anda belum melakukan analisis naskah apapun.</p>
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedItem(null)}
          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
        >
          &larr; Kembali ke Daftar Riwayat
        </button>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm min-h-[600px]">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedItem.filename}</h2>
              <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{selectedItem.role}</span>
                <span>•</span>
                <span>{new Date(selectedItem.date).toLocaleString()}</span>
                {selectedItem.kbReferences && selectedItem.kbReferences.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                      {selectedItem.kbReferences.length} Referensi Terpakai
                    </span>
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={() => downloadDocx(selectedItem)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Unduh .docx
            </button>
          </div>

          {selectedItem.kbReferences && selectedItem.kbReferences.length > 0 && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Acuan Penilaian</h4>
              <ul className="text-sm text-slate-600 list-disc list-inside">
                {selectedItem.kbReferences.map((ref, idx) => (
                  <li key={idx}>{ref}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-6 border border-slate-100 markdown-body font-serif text-base text-slate-700">
             <ReactMarkdown>{selectedItem.resultText}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Riwayat Analisis</h2>
        <p className="text-slate-500">Daftar naskah yang pernah diperiksa oleh AI Asisten Jurnal.</p>
      </div>

      <div className="grid gap-4">
        {history.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-800 mb-1">{item.filename}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                  <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {item.role}
                  </span>
                  <span>{new Date(item.date).toLocaleString()}</span>
                  {item.kbReferences && item.kbReferences.length > 0 && (
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                      {item.kbReferences.length} Referensi
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center md:opacity-0 group-hover:opacity-100 transition-opacity justify-end text-indigo-600 font-medium text-sm">
              Lihat Detail
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
