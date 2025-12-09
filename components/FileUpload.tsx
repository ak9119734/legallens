import React, { useCallback, useState } from 'react';
import { extractTextFromFile } from '../services/fileProcessor';

interface FileUploadProps {
  onDataLoaded: (text: string, fileName: string) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [manualText, setManualText] = useState('');
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false); // New local state for file processing

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await extractTextFromFile(file);
      if(text.includes("Unable to extract")) {
           setMode('paste');
           setManualText("Could not auto-parse PDF in this demo. Please paste content here.");
      } else {
           onDataLoaded(text, file.name);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error reading file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  }, [onDataLoaded]);

  const handleManualSubmit = () => {
    if (manualText.trim().length < 50) return alert("Please enter more text for a valid analysis.");
    onDataLoaded(manualText, "Manual Paste.txt");
  };

  // Show processing state (Parsing PDF/OCR) OR loading state (AI Analysis)
  if (isLoading || isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
        <div className="w-16 h-16 border-4 border-legal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-legal-700 font-semibold">
          {isProcessing ? "Reading Document & Extracting Text..." : "Analyzing with LegalLens AI..."}
        </p>
        <p className="text-xs text-legal-500">
          {isProcessing ? "Running OCR/Text Extraction locally..." : "Checking Indian Law Compliance..."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl border border-legal-100">
      <h2 className="text-2xl font-bold text-legal-900 mb-2 text-center">LegalLens India</h2>
      <p className="text-center text-legal-500 mb-6">Privacy-First Contract Analysis & Risk Detection</p>

      <div className="flex justify-center space-x-4 mb-6">
        <button 
          onClick={() => setMode('upload')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'upload' ? 'bg-legal-100 text-legal-800' : 'text-gray-400 hover:text-legal-600'}`}
        >
          <i className="fas fa-file-upload mr-2"></i> Upload File
        </button>
        <button 
          onClick={() => setMode('paste')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'paste' ? 'bg-legal-100 text-legal-800' : 'text-gray-400 hover:text-legal-600'}`}
        >
           <i className="fas fa-paste mr-2"></i> Paste Text
        </button>
      </div>

      {mode === 'upload' ? (
        <div 
          className={`relative h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors
            ${dragActive ? 'border-legal-500 bg-legal-50' : 'border-gray-300 bg-gray-50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <i className="fas fa-file-contract text-4xl text-legal-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium">Drag & Drop your legal document</p>
          <p className="text-xs text-gray-400 mt-2">Supports .txt, .pdf, .jpg, .png</p>
          
          <label className="mt-4 px-6 py-2 bg-legal-600 hover:bg-legal-700 text-white rounded-lg cursor-pointer shadow-md transition-transform active:scale-95">
            <span>Browse Files</span>
            <input 
              type="file" 
              className="hidden" 
              accept=".txt,.md,.pdf,.jpg,.jpeg,.png" 
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  await processFile(e.target.files[0]);
                  // Reset value so the same file can be selected again if needed
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          <textarea 
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-legal-500 focus:border-transparent font-serif text-sm leading-relaxed resize-none"
            placeholder="Paste your contract, rental agreement, or legal notice here..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          ></textarea>
          <button 
            onClick={handleManualSubmit}
            className="w-full py-3 bg-legal-800 hover:bg-legal-900 text-white font-bold rounded-lg shadow-md transition-all"
          >
            Analyze Text
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-center items-center space-x-6 text-xs text-gray-400">
        <span className="flex items-center"><i className="fas fa-shield-alt mr-1"></i> Zero Data Retention</span>
        <span className="flex items-center"><i className="fas fa-bolt mr-1"></i> Instant Analysis</span>
        <span className="flex items-center"><i className="fas fa-balance-scale mr-1"></i> Indian Law Logic</span>
      </div>
    </div>
  );
};

export default FileUpload;