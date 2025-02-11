// lib/context/page-data-context.tsx
'use client';

import { createContext, useContext, useState } from 'react';

interface EditorPageData {
  imageIds: string[];
  userId: string;
  projectId: string;
  clickedImageId: string,
}

interface PageDataContextType {
  editorData: EditorPageData | null;
  setEditorData: (data: EditorPageData) => void;
}

const PageDataContext = createContext<PageDataContextType | undefined>(undefined);

export function PageDataProvider({ children }: { children: React.ReactNode }) {
  const [editorData, setEditorData] = useState<EditorPageData | null>(null);

  return (
    <PageDataContext.Provider value={{ editorData, setEditorData }}>
      {children}
    </PageDataContext.Provider>
  );
}

export function usePageData() {
  const context = useContext(PageDataContext);
  if (!context) {
    throw new Error('usePageData must be used within a PageDataProvider');
  }
  return context;
}