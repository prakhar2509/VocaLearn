// Base LLM client configuration and API wrapper

import { Groq } from 'groq-sdk';
import Bottleneck from 'bottleneck';
import { config } from "../../utils/config";

// Initialize Groq client
const groq = new Groq({
  apiKey: config.groqApiKey,
});

// Rate limiter for Groq API - Conservative limits to avoid hitting quotas
const rateLimiter = new Bottleneck({
  maxConcurrent: 1, // Only 1 request at a time
  minTime: 1000,    // Minimum 1 second between requests
  reservoir: 30,    // Allow 30 requests initially
  reservoirRefreshAmount: 30, // Refresh with 30 requests
  reservoirRefreshInterval: 60 * 1000, // Every minute
});

// Groq API call function using official SDK with rate limiting
export const callLLM = async (prompt: string): Promise<string> => {
  return rateLimiter.schedule(async () => {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
        stream: false // We want complete response, not streaming
      });

      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("❌ Groq API error:", error);
      throw new Error(`Groq API failed: ${(error as Error).message}`);
    }
  });
};

// Common LLM response interface
export interface LLMResponse {
  correction: string;
  explanation: string;
  correctionVoiceId: string;
  explanationVoiceId: string;
  // Add detailed feedback for echo mode
  detailedFeedback?: {
    pronunciationScore: number;
    grammarScore: number;
    vocabularyScore: number;
    fluencyScore: number;
    overallScore: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

// Accuracy response interface
export interface AccuracyResponse {
  accuracy: number;
  pronunciationScore: number;
  grammarScore: number;
  fluencyScore: number;
  feedback: string;
}
