import React, { useState } from 'react';
import { AnalysisResult, Clause, RiskLevel } from '../types';
import { rewriteClause } from '../services/geminiService';

interface ClausePanelProps {
  analysis: AnalysisResult;
  rewrites: Record<number, string>;
  onRewriteUpdate: (id: number, text: string) => void;
}

const ClausePanel: React.FC<ClausePanelProps> = ({ analysis, rewrites, onRewriteUpdate }) => {
  const [expandedClauseId, setExpandedClauseId] = useState<number | null>(null);
  const [rewritingId, setRewritingId] = useState<number | null>(null);

  const toggleClause = (id: number) => {
    setExpandedClauseId(expandedClauseId === id ? null : id);
  };

  const handleRewrite = async (clause: Clause) => {
    setRewritingId(clause.id);
    try {
      const newText = await rewriteClause(clause.text, analysis.domain);
      onRewriteUpdate(clause.id, newText);
    } catch (e) {
      alert("Failed to rewrite clause");
    } finally {
      setRewritingId(null);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.HIGH: return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100';
      case RiskLevel.MEDIUM: return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100';
      case RiskLevel.LOW: return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case RiskLevel.HIGH: return 'bg-red-500';
      case RiskLevel.MEDIUM: return 'bg-amber-400';
      case RiskLevel.LOW: return 'bg-emerald-400';
      default: return 'bg-gray-300';
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'Property': return 'home';
      case 'Employment': return 'briefcase';
      case 'Financial': return 'rupee-sign';
      case 'Commercial': return 'building';
      case 'Consumer': return 'shopping-bag';
      case 'IT': return 'laptop-code';
      default: return 'file-contract';
    }
  };

  // Calculate circular progress dash array
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analysis.overallRiskScore / 100) * circumference;
  const scoreColor = analysis.overallRiskScore > 70 ? 'text-red-500' : analysis.overallRiskScore > 30 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="h-full flex flex-col bg-gray-50/50 border-l border-gray-200 overflow-hidden font-sans">
      {/* Header Dashboard */}
      <div className="p-5 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2 text-legal-500 mb-1">
               <span className="p-1.5 bg-legal-50 rounded-md text-xs">
                 <i className={`fas fa-${getDomainIcon(analysis.domain)} fa-fw`}></i>
               </span>
               <span className="text-xs font-bold uppercase tracking-wider">{analysis.domain}</span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">Legal Analysis</h3>
          </div>
          
          {/* Circular Score Gauge */}
          <div className="relative w-12 h-12 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
               <circle cx="24" cy="24" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="4" />
               <circle 
                 cx="24" cy="24" r={radius} 
                 fill="transparent" 
                 stroke="currentColor" 
                 strokeWidth="4" 
                 strokeDasharray={circumference} 
                 strokeDashoffset={strokeDashoffset}
                 strokeLinecap="round"
                 className={`${scoreColor} transition-all duration-1000 ease-out`}
               />
             </svg>
             <span className={`absolute text-xs font-bold ${scoreColor}`}>{analysis.overallRiskScore}</span>
          </div>
        </div>

        {/* Heatmap Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
             <span>Clause Risk Map</span>
             <span>{analysis.clauses.length} Clauses</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
            {analysis.clauses.map((clause, idx) => (
              <div 
                key={idx} 
                className={`h-full flex-1 border-r border-white/50 ${getRiskBg(clause.riskLevel as string)}`} 
                title={`${clause.title}: ${clause.riskLevel}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 md:pb-6">
        
        {/* Executive Summary */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
             <i className="fas fa-align-left mr-2"></i> Executive Summary
           </h4>
           <p className="text-sm text-gray-700 leading-relaxed break-words">{analysis.summary}</p>
        </div>

        {/* Actionable Next Steps */}
        {analysis.nextSteps && analysis.nextSteps.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
             <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center">
               <i className="fas fa-gavel mr-2"></i> Next Steps & Recommendations
             </h4>
             <ul className="space-y-2">
               {analysis.nextSteps.map((step, idx) => (
                 <li key={idx} className="flex items-start text-xs text-blue-900">
                    <i className="fas fa-check-circle text-blue-500 mt-0.5 mr-2 shrink-0"></i>
                    <span className="leading-relaxed">{step}</span>
                 </li>
               ))}
             </ul>
          </div>
        )}

        {/* Red Flags Dashboard */}
        {analysis.redFlags.length > 0 && (
          <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm ring-1 ring-red-50">
             <div className="bg-red-50/50 px-4 py-3 border-b border-red-100 flex items-center">
                <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs mr-2 shrink-0">
                   <i className="fas fa-exclamation"></i>
                </div>
                <h4 className="text-sm font-bold text-red-900">Critical Risks Found</h4>
             </div>
             <ul className="p-4 space-y-3">
               {analysis.redFlags.map((flag, idx) => (
                 <li key={idx} className="flex items-start text-xs text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-100/50">
                   <i className="fas fa-circle text-[6px] text-red-500 mt-1.5 mr-2.5 shrink-0"></i>
                   <span className="leading-relaxed break-words">{flag}</span>
                 </li>
               ))}
             </ul>
          </div>
        )}

        {/* Detailed Clauses */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Clause Breakdown</h4>
          
          {analysis.clauses.map((clause) => (
            <div key={clause.id} className={`bg-white border rounded-xl transition-all duration-200 overflow-hidden ${expandedClauseId === clause.id ? 'shadow-md border-legal-300 ring-1 ring-legal-100' : 'border-gray-200 hover:border-gray-300'}`}>
              
              {/* Clause Card Header */}
              <div 
                onClick={() => toggleClause(clause.id)}
                className="p-3.5 cursor-pointer flex gap-3 items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-gray-800 truncate">{clause.title}</h4>
                    {clause.riskLevel === RiskLevel.HIGH && <i className="fas fa-fire text-red-500 text-xs" title="High Risk"></i>}
                  </div>
                  <p className="text-xs text-gray-500 truncate w-full pr-4">"{clause.text}"</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${getRiskColor(clause.riskLevel as RiskLevel)}`}>
                  {clause.riskLevel}
                </span>
              </div>

              {/* Expanded Content */}
              {expandedClauseId === clause.id && (
                <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-4 text-sm animate-fade-in">
                  
                  {/* Full Text */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <p className="font-serif italic text-gray-600 text-xs leading-relaxed break-words whitespace-pre-wrap">
                      "{clause.text}"
                    </p>
                  </div>
                  
                  {/* Analysis Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="font-semibold text-xs text-legal-600 uppercase mb-1.5 flex items-center">
                         <i className="fas fa-microscope mr-1.5"></i> Analysis
                      </p>
                      <p className="text-gray-700 text-xs leading-relaxed break-words">{clause.explanation}</p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-200 group">
                      <p className="font-semibold text-xs text-amber-600 uppercase mb-1.5 flex items-center justify-between">
                         <span><i className="fas fa-book-open mr-1.5"></i> Indian Law</span>
                         <a 
                           href={`https://www.google.com/search?q=${encodeURIComponent(clause.indianLawReference + " Indian Law")}`} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-[10px] text-amber-500 hover:text-amber-700 hover:underline flex items-center"
                           onClick={(e) => e.stopPropagation()}
                         >
                           Read Act <i className="fas fa-external-link-alt ml-1"></i>
                         </a>
                      </p>
                      <p className="text-gray-700 text-xs leading-relaxed break-words">{clause.indianLawReference}</p>
                    </div>
                  </div>

                  {/* Rewrite Section */}
                  {rewrites[clause.id] ? (
                     <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                           <p className="font-bold text-xs text-emerald-800 uppercase flex items-center">
                             <i className="fas fa-shield-alt mr-1.5"></i> Safe Rewrite
                           </p>
                           <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">AI Suggestion</span>
                        </div>
                        <p className="text-xs text-emerald-900 font-serif leading-relaxed break-words whitespace-pre-wrap">
                          "{rewrites[clause.id]}"
                        </p>
                     </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRewrite(clause); }}
                      disabled={rewritingId === clause.id}
                      className="w-full py-2.5 bg-white border border-gray-300 hover:border-legal-400 text-gray-700 hover:text-legal-700 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center transition-all disabled:opacity-50"
                    >
                      {rewritingId === clause.id ? (
                        <>
                          <i className="fas fa-circle-notch fa-spin mr-2"></i> Rewriting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic mr-2 text-legal-500"></i> Suggest Safer Rewrite
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClausePanel;