import React, { useState, useEffect } from 'react';
import { BookOpen, FileSignature, History, Settings, FileText } from 'lucide-react';
import { AnalysisHistory, KnowledgeItem } from './types';
import TaskInterface from './components/TaskInterface';
import KnowledgeBase from './components/KnowledgeBase';
import HistoryList from './components/HistoryList';

export default function App() {
  const [activeTab, setActiveTab] = useState<'task' | 'kb' | 'history'>('task');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);

  useEffect(() => {
    // Load from localStorage
    const savedKb = localStorage.getItem('journal_kb');
    if (savedKb) setKnowledgeBase(JSON.parse(savedKb));

    const savedHistory = localStorage.getItem('journal_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const saveKnowledgeBase = (newKb: KnowledgeItem[]) => {
    setKnowledgeBase(newKb);
    localStorage.setItem('journal_kb', JSON.stringify(newKb));
  };

  const saveHistory = (newHistory: AnalysisHistory[]) => {
    setHistory(newHistory);
    localStorage.setItem('journal_history', JSON.stringify(newHistory));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 mb-8 px-2 md:mt-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold flex items-center justify-center">
            AI
          </div>
          <div>
            <h1 className="font-semibold text-xl tracking-tight leading-tight">Asisten Jurnal</h1>
          </div>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button
            onClick={() => setActiveTab('task')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'task' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSignature className="w-5 h-5" />
            Analisis Naskah
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'kb' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            Basis Pengetahuan
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-5 h-5" />
            Riwayat
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-h-screen overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto h-full">
          {activeTab === 'task' && (
            <TaskInterface
              knowledgeBase={knowledgeBase}
              onSaveHistory={(item) => saveHistory([item, ...history])}
            />
          )}
          {activeTab === 'kb' && (
            <KnowledgeBase
              knowledgeBase={knowledgeBase}
              onUpdate={saveKnowledgeBase}
            />
          )}
          {activeTab === 'history' && (
            <HistoryList history={history} />
          )}
        </div>
      </main>
    </div>
  );
}
