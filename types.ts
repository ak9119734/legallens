export enum RiskLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High"
}

export interface Clause {
  id: number;
  title: string;
  text: string;
  riskLevel: RiskLevel;
  explanation: string;
  indianLawReference: string; // e.g., "Section 27, Indian Contract Act, 1872"
  suggestion?: string;
}

export interface AnalysisResult {
  summary: string;
  domain: 'Property' | 'Employment' | 'Financial' | 'Commercial' | 'Consumer' | 'IT' | 'Other';
  clauses: Clause[];
  overallRiskScore: number; // 0-100
  redFlags: string[];
  nextSteps: string[]; // New field for procedural advice (Notary, Registration, etc.)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface DocumentData {
  name: string;
  content: string;
  type: 'pdf' | 'image' | 'text';
  uploadDate: Date;
}