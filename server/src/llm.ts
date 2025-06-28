import { Groq } from 'groq-sdk';
import Bottleneck from 'bottleneck';
import { config } from "./utils/config";
import { getVoiceId } from "./utils/languages";

interface LLMResponse {
  correction: string;
  explanation: string;
  correctionVoiceId: string;
  explanationVoiceId: string;
}

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
async function callGroq(prompt: string): Promise<string> {
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
}

export const generateResponse = async (
  text: string,
  learningLanguage: string,
  nativeLanguage: string,
  mode: string
): Promise<LLMResponse> => {
  if (!["echo", "dialogue", "quiz"].includes(mode)) {
    throw new Error(`Invalid Mode : ${mode}`);
  }
  const prompt = `
You are a language tutor for ${learningLanguage}, and you explain things in ${nativeLanguage}.

The user said: "${text}" (in ${learningLanguage}).

- Mode: ${mode}

CRITICAL: You are in "${mode}" mode. Follow the specific instructions for this mode only.

IMPORTANT LANGUAGE RULES:
- Learning language is: ${learningLanguage}
- Native language (for explanations) is: ${nativeLanguage}
- Put feedback/corrections in the learning language (${learningLanguage})
- Put explanations in the native language (${nativeLanguage})

- For 'echo' mode: If the input is incorrect, provide a corrected version in ${learningLanguage} and explain why in ${nativeLanguage}. If correct, confirm and give affirmation in ${learningLanguage}, then suggest a variation. Put the correction/affirmation in the "correction" field (in ${learningLanguage}) and explanation in the "explanation" field (in ${nativeLanguage}).

- For 'dialogue' mode: Generate a natural conversational response in ${learningLanguage} that continues the dialogue. 
    IMPORTANT: Do NOT correct punctuation or minor formatting - focus on having a natural conversation.
    - If the user introduces themselves (like "मेरा नाम प्रखर सिंह है"), respond conversationally (like "नमस्ते प्रखर! आप कैसे हैं?")
    - If the user asks a question, answer it naturally
    - If the user makes a statement, respond with interest or ask a follow-up question
    - Store this conversational response in the "correction" field (in ${learningLanguage})
    - Only use the "explanation" field if there were serious grammar errors that affected meaning - and explanations must be in ${nativeLanguage}
    - Do NOT correct punctuation marks like periods (।) - these are not important in spoken dialogue

- For 'quiz' mode: Evaluate the user's SPOKEN answer to a quiz question in ${learningLanguage}. 
    IMPORTANT: This is spoken language assessment - DO NOT penalize for missing punctuation marks, written formatting, or visual elements that cannot be heard in speech.
    Focus ONLY on:
    - Vocabulary usage and meaning
    - Grammar and sentence structure 
    - Pronunciation intent (based on transcription)
    - Semantic correctness of the response
    
    For quiz mode, put your feedback in the "correction" field (in ${learningLanguage}) and explanation in the "explanation" field (in ${nativeLanguage}):
    - If correct: Put "Correct!" or "सही!" or "¡Correcto!" (in ${learningLanguage}) with brief praise in the "correction" field. Leave "explanation" empty or give brief encouragement in ${nativeLanguage}.
    - If partially correct: Put the complete correct answer in ${learningLanguage} in the "correction" field, and explain what was missing in ${nativeLanguage} in the "explanation" field.
    - If incorrect: Put the correct answer in ${learningLanguage} in the "correction" field and explain the mistake in ${nativeLanguage} in the "explanation" field, focusing on meaning and grammar, NOT punctuation.

REMEMBER: ALL explanations must be written in ${nativeLanguage}, NOT in ${learningLanguage}!

Always return a **valid JSON** response like this:
{
  "correction": "...",
  "explanation": "..."
}

FINAL REMINDER: 
- "correction" field = ${learningLanguage}
- "explanation" field = ${nativeLanguage}
`;

  try {
    // Use Groq instead of Gemini
    const responseText = await callGroq(prompt);
    
    console.log("🤖 LLM Raw response:", responseText);
    
    let correction, explanation;
    try {
      const parsed = JSON.parse(responseText);
      
      // Check if this is a quiz question generation response (has question/correctAnswer format)
      if (parsed.question && parsed.correctAnswer) {
        // For quiz question generation, return the raw JSON in the correction field
        // so the quiz module can parse it properly
        correction = responseText; // Return the whole JSON string
        explanation = "Quiz question generated";
      } else {
        // Normal response format with correction/explanation fields
        correction = parsed.correction;
        explanation = parsed.explanation;
        
        // Handle legacy response formats that might have different field names
        if (!correction && parsed.response) {
          correction = parsed.response;
        }
        if (!correction && parsed.feedback) {
          correction = parsed.feedback;
        }
      }
    } catch (jsonError) {
      console.error("❌ LLM JSON parsing error:", jsonError);
      console.error("❌ LLM Raw response:", responseText);
      
      // Fallback: try to extract content even if not valid JSON
      correction = responseText.includes('correction') ? responseText : "Response received but format was incorrect";
      explanation = "The AI response was not in the expected format. Please try again.";
    }
    
    return {
      correction: correction || "No correction provided",
      explanation: explanation || "No explanation provided",
      correctionVoiceId: getVoiceId(learningLanguage),
      explanationVoiceId: getVoiceId(nativeLanguage),
    };
  } catch (error) {
    throw new Error(`LLM processing failed: ${(error as Error).message}`);
  }
};
