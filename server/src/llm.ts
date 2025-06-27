import { GoogleGenAI } from "@google/genai";
import { config } from "./config";
import { getVoiceId } from "./languages";

interface LLMResponse {
  correction: string;
  explanation: string;
  correctionVoiceId: string;
  explanationVoiceId: string;
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

- For 'echo' mode: If the input is incorrect, provide a corrected version and explain why in ${nativeLanguage}. If correct, confirm, give affirmation, and suggest a variation.

- For 'dialogue' mode: Generate a natural conversational response in ${learningLanguage} that continues the dialogue. Store this conversational response in the "correction" field. If there were any errors in the user's input, explain them in ${nativeLanguage} in the "explanation" field along with an example of how to say it correctly.

- For 'quiz' mode: Evaluate the user's answer to a quiz question in ${learningLanguage}. 
    - If correct: Say "Correct!" and give mild praise or a similar variation in ${learningLanguage}.
    - If partially correct: Provide the correct answer, highlight what's missing, and explain in ${nativeLanguage}.
    - If incorrect: Give the corrected answer in ${learningLanguage} and explain the mistake in ${nativeLanguage}.

Always return a **valid JSON** response like this:
{
  "correction": "...",
  "explanation": "..."
}
`;

  try {
    const genAI = new GoogleGenAI({ apiKey: config.geminiAIApiKey });
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `${prompt}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Model did not return valid text content.");
    }
    const { correction, explanation } = JSON.parse(responseText);
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
