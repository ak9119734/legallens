import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, RiskLevel } from "../types";

const apiKey = process.env.API_KEY;
// Initialize with empty key if not present to avoid crash on load, but will fail on call
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy' });

const ANALYSIS_MODEL = "gemini-2.5-flash";
const CHAT_MODEL = "gemini-2.5-flash";

// Schema for structured output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A concise summary of the legal document in simple English." },
    domain: { 
      type: Type.STRING, 
      enum: ['Property', 'Employment', 'Financial', 'Commercial', 'Consumer', 'IT', 'Other'],
      description: "The legal domain of the document." 
    },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          title: { type: Type.STRING },
          text: { type: Type.STRING, description: "The verbatim text of the extracted clause." },
          riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          explanation: { type: Type.STRING, description: "Why this is risky, explained simply." },
          indianLawReference: { type: Type.STRING, description: "Relevant Indian Act/Section (e.g., Section 27, Indian Contract Act)." },
        },
        required: ["id", "title", "text", "riskLevel", "explanation", "indianLawReference"]
      }
    },
    overallRiskScore: { type: Type.INTEGER, description: "A score from 0 (Safe) to 100 (High Risk)." },
    redFlags: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of immediate red flags or missing standard clauses." 
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable advice: Notary requirements, Stamp duty, Registration needs, or dispute resolution steps in India."
    }
  },
  required: ["summary", "domain", "clauses", "overallRiskScore", "redFlags", "nextSteps"]
};

export const analyzeDocument = async (text: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing.");

  const prompt = `
    You are LegalLens India, an expert Indian legal assistant. 
    Analyze the following legal document text. 
    Identify key clauses, assess their risk based on Indian Law (IPC, Contract Act, Companies Act, etc.), 
    and provide a structured analysis.
    
    Also provide 3-5 specific "Next Steps" regarding:
    1. Is Notarization or Registration mandatory? (e.g., Rent agreements > 11 months).
    2. Stamp duty implications.
    3. Recommended dispute resolution method (Arbitration vs Court).
    
    Document Text:
    """${text.substring(0, 30000)}""" 
    
    Ensure strict adherence to the output JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a senior Indian Legal expert. Be precise, conservative with risk, and helpful."
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as AnalysisResult;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const rewriteClause = async (clauseText: string, context: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");

  const prompt = `
    Rewrite the following legal clause to be safer for the receiving party (client), 
    fairer, and strictly compliant with Indian Law. 
    Keep the language professional but clearer.
    
    Original Clause: "${clauseText}"
    
    Context/Domain: ${context}
    
    Return ONLY the rewritten clause text.
  `;

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: prompt,
  });

  return response.text || "Could not generate rewrite.";
};

// Chat instance management could be improved with context, simplified here
let chatSession: Chat | null = null;

export const initChat = (docContext: string) => {
  if (!apiKey) return;
  chatSession = ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: `You are LegalLens India. You are chatting with a user about a specific legal document they uploaded. 
      Here is the document context: """${docContext.substring(0, 20000)}""".
      Answer questions based on Indian Law. If a query is outside legal scope, politely decline.
      Keep answers concise and helpful.`
    }
  });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat session not initialized");
  
  const result = await chatSession.sendMessage({ message });
  return result.text || "I didn't understand that.";
};