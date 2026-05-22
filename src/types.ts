export interface KnowledgeItem {
  id: string;
  title: string;
  type: 'template' | 'reference';
  content: string; // Extracted text
  dateAdded: string;
}

export interface AnalysisHistory {
  id: string;
  filename: string;
  role: 'editor' | 'reviewer' | 'copyeditor';
  date: string;
  originalText: string;
  resultText: string;
  kbReferences?: string[];
}
