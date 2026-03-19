import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import RnPdfKingModule from './RnPdfKingModule';
import { requireNativeViewManager } from 'expo-modules-core';

// Define the shape of the context
interface PdfDocumentContextType {
  loading: boolean;
  pageCount: number;
  filePath: string | null;
  fileName: string | null;
  pickFile: () => Promise<void>;
  loadPdf: (path: string) => Promise<void>;
  error: string | null;
  clearAllSelections: () => Promise<void>;
}

const PdfDocumentContext = createContext<PdfDocumentContextType | undefined>(undefined);

interface PdfDocumentProps {
  children: ReactNode;
  onLoadSuccess?: (path: string, name: string, pageCount: number) => void;
  onLoadError?: (error: string) => void;
}

// Native View for Manager Mode
const NativePdfView = requireNativeViewManager('RnPdfKing');

export const PdfDocumentProvider: React.FC<PdfDocumentProps> = ({ 
  children, 
  onLoadSuccess, 
  onLoadError 
}) => {
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Register listeners
    const startedSubscription = RnPdfKingModule.addListener('onPdfLoadStarted', () => {
      setLoading(true);
      setError(null);
    });

    const successSubscription = RnPdfKingModule.addListener('onPdfLoadSuccess', (event) => {
      setLoading(false);
      setPageCount(event.pageCount);
      setFilePath(event.filePath);
      setFileName(event.fileName);
      setError(null);
      if (onLoadSuccess) onLoadSuccess(event.filePath, event.fileName, event.pageCount);
    });

    const errorSubscription = RnPdfKingModule.addListener('onPdfLoadError', (event) => {
      setLoading(false);
      setError(event.message);
      if (onLoadError) onLoadError(event.message);
    });

    return () => {
      startedSubscription.remove();
      successSubscription.remove();
      errorSubscription.remove();
    };
  }, [onLoadSuccess, onLoadError]);

  const pickFile = async () => {
    try {
      setError(null);
      await RnPdfKingModule.pickFile();
    } catch (e: any) {
      setLoading(false);
      setError(e.message);
    }
  };

  const loadPdf = async (path: string) => {
    try {
      setError(null);
      await RnPdfKingModule.loadPdf(path);
    } catch (e: any) {
      setLoading(false);
      setError(e.message);
    }
  };

  const clearAllSelections = async () => {
    try {
      await RnPdfKingModule.clearAllSelections();
    } catch (e: any) {
      console.warn("Failed to clear selections", e);
    }
  };

  return (
    <PdfDocumentContext.Provider 
      value={{ 
        loading, 
        pageCount, 
        filePath, 
        fileName, 
        pickFile, 
        loadPdf,
        error,
        clearAllSelections
      }}
    >
      {/* Mount hidden manager view to initialize file picker */}
      <NativePdfView 
        mode="manager" 
        style={{ width: 0, height: 0, position: 'absolute' }} 
      />
      {children}
    </PdfDocumentContext.Provider>
  );
};

export const usePdfDocument = () => {
  const context = useContext(PdfDocumentContext);
  if (context === undefined) {
    throw new Error('usePdfDocument must be used within a PdfDocumentProvider');
  }
  return context;
};
