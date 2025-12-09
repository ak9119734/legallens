import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ClausePanel from './components/ClausePanel';
import ChatWindow from './components/ChatWindow';
import { analyzeDocument, initChat } from './services/geminiService';
import { AnalysisResult } from './types';
import jsPDF from 'jspdf';

type Tab = 'chat' | 'analysis';

function App() {
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  
  // Lifted state for rewrites so it can be accessed by PDF exporter
  const [rewrites, setRewrites] = useState<Record<number, string>>({});

  const handleDocumentLoaded = async (text: string, fileName: string) => {
    setDocumentText(text);
    setDocName(fileName);
    setIsLoading(true);
    setRewrites({}); // Reset rewrites on new file

    try {
      // 1. Analyze
      const result = await analyzeDocument(text);
      setAnalysis(result);
      
      // 2. Init Chat Context
      initChat(text);
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Please check your API Key and try again.");
      setDocumentText(null); // Reset on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleRewriteUpdate = (id: number, text: string) => {
    setRewrites(prev => ({ ...prev, [id]: text }));
  };

  const handleReset = () => {
    setDocumentText(null);
    setAnalysis(null);
    setRewrites({});
    setActiveTab('chat');
  };

  const handleExportPDF = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxTextWidth = pageWidth - (margin * 2);
    
    // Header
    doc.setFillColor(16, 42, 67); // legal-900
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`LegalLens India Analysis`, margin, 16);
    
    // Meta Info
    let y = 35;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Document: ${docName}`, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Domain: ${analysis.domain}   |   Risk Score: ${analysis.overallRiskScore}/100`, margin, y);
    
    // Summary
    y += 12;
    doc.setFillColor(240, 244, 248);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(margin, y, maxTextWidth, 30, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(analysis.summary, maxTextWidth - 10);
    doc.text(summaryLines, margin + 5, y + 10);
    y += 30 + 10;

    // Next Steps / Recommendations
    if (analysis.nextSteps && analysis.nextSteps.length > 0) {
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.setDrawColor(191, 219, 254);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.text("Recommended Next Steps", margin, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      analysis.nextSteps.forEach(step => {
        const stepLines = doc.splitTextToSize(`• ${step}`, maxTextWidth);
        if (y + (stepLines.length * 5) > 280) { doc.addPage(); y = 20; }
        doc.text(stepLines, margin, y);
        y += (stepLines.length * 5) + 2;
      });
      y += 5;
    }

    // Red Flags
    if (analysis.redFlags.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Critical Red Flags", margin, y);
        y += 6;
        doc.setTextColor(50, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        analysis.redFlags.forEach(flag => {
            const flagLines = doc.splitTextToSize(`• ${flag}`, maxTextWidth);
            doc.text(flagLines, margin, y);
            y += (flagLines.length * 5) + 2;
        });
        y += 5;
    }

    // Clauses
    doc.setTextColor(16, 42, 67);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Clause Analysis", margin, y);
    y += 10;

    analysis.clauses.forEach((clause) => {
        // Check page break
        if (y > 220) { doc.addPage(); y = 20; }

        // Clause Title & Risk
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0,0,0);
        doc.text(`Clause: ${clause.title} [${clause.riskLevel}]`, margin, y);
        y += 5;

        // Clause Text (Italic)
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(80,80,80);
        const textLines = doc.splitTextToSize(`"${clause.text}"`, maxTextWidth);
        doc.text(textLines, margin, y);
        y += (textLines.length * 4) + 3;

        // Explanation
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0,0,0);
        const explanationLines = doc.splitTextToSize(`Analysis: ${clause.explanation}`, maxTextWidth);
        doc.text(explanationLines, margin, y);
        y += (explanationLines.length * 4) + 2;

        // Law Ref
        doc.setTextColor(180, 83, 9); // Amber
        const lawLines = doc.splitTextToSize(`Indian Law: ${clause.indianLawReference}`, maxTextWidth);
        doc.text(lawLines, margin, y);
        y += (lawLines.length * 4) + 4;

        // Suggested Rewrite (If exists)
        if (rewrites[clause.id]) {
           doc.setTextColor(16, 185, 129); // Emerald-500
           doc.setFont("helvetica", "bold");
           doc.text("Safe Rewrite Suggested:", margin, y);
           y += 5;
           
           doc.setFont("helvetica", "italic");
           doc.setTextColor(6, 95, 70); // Emerald-800
           const rewriteLines = doc.splitTextToSize(`"${rewrites[clause.id]}"`, maxTextWidth);
           doc.text(rewriteLines, margin, y);
           y += (rewriteLines.length * 4) + 4;
        }
        
        y += 4; // Extra spacing between clauses
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1; // fix for empty last page sometimes
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by LegalLens India - Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save('LegalLens_Report.pdf');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* Navbar */}
      <header className="bg-legal-900 text-white h-14 flex items-center justify-between px-4 md:px-6 shadow-md z-10 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-legal-800 rounded-lg flex items-center justify-center border border-legal-700 shadow-inner">
             <i className="fas fa-balance-scale text-legal-300"></i>
          </div>
          <div className="flex flex-col">
              <span className="font-serif font-bold text-lg tracking-wide leading-none">LegalLens</span>
              <span className="text-[10px] text-legal-400 font-medium uppercase tracking-[0.2em] leading-none">India</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {analysis && (
            <>
               <button onClick={handleExportPDF} className="text-xs bg-legal-700 hover:bg-legal-600 px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center border border-legal-600 shadow-sm">
                <i className="fas fa-file-pdf mr-2 text-red-400"></i> <span className="hidden md:inline">Download Report</span>
                <span className="md:hidden">PDF</span>
              </button>
              <button onClick={handleReset} className="text-xs text-legal-300 hover:text-white transition-colors">
                <i className="fas fa-times-circle text-lg md:text-sm"></i>
              </button>
            </>
          )}
          {!analysis && (
             <div className="text-xs text-legal-400 hidden md:block"><i className="fas fa-lock mr-1"></i>Secure & Private</div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {!documentText || isLoading ? (
          <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200">
             <FileUpload onDataLoaded={handleDocumentLoaded} isLoading={isLoading} />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full relative">
            
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-gray-200 bg-white shadow-sm z-20">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'chat' ? 'border-legal-600 text-legal-800 bg-legal-50' : 'border-transparent text-gray-500'}`}
              >
                <i className="fas fa-robot mr-2"></i> AI Assistant
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'analysis' ? 'border-legal-600 text-legal-800 bg-legal-50' : 'border-transparent text-gray-500'}`}
              >
                <i className="fas fa-chart-pie mr-2"></i> Risk Report
              </button>
            </div>

            {/* Chat & Doc View */}
            <div className={`flex flex-col md:w-[65%] h-full border-r border-gray-300 bg-white ${activeTab === 'chat' ? 'block' : 'hidden md:flex'}`}>
               {/* Context Header */}
               <div className="h-10 md:h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px] flex items-center">
                    <i className="fas fa-file-alt mr-2 text-legal-500"></i> {docName}
                  </span>
                  <div className="flex items-center space-x-2">
                     <span className="text-[10px] md:text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center shadow-sm">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> 
                        Live Context
                     </span>
                  </div>
               </div>
               
               {/* Chat Interface */}
               <div className="flex-1 overflow-hidden relative">
                 <ChatWindow />
               </div>
            </div>

            {/* Clause Analysis */}
            <div className={`md:w-[35%] h-full ${activeTab === 'analysis' ? 'block' : 'hidden md:block'} z-10 shadow-xl md:shadow-none`}>
               {analysis && (
                 <ClausePanel 
                    analysis={analysis} 
                    rewrites={rewrites}
                    onRewriteUpdate={handleRewriteUpdate}
                 />
               )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;