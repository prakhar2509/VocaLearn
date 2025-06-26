import { GoogleGenAI } from "@google/genai";
import { config } from "./config";
import { getVoiceId } from "./languages";


interface LLMResponse {
    correction : string,
    explanation : string,
    correctionVoiceId : string,
    explanationVoiceId : string 
}

export const generateResponse = async (
    text : string,
    learningLanguage : string,
    nativeLanguage : string,
    mode : string
) : Promise<LLMResponse> => {
    if(!['echo', 'dialogue', 'quiz'].includes(mode)){
        throw new Error(`Invalid Mode : ${mode}`)
    }
    const prompt = `
    You are language tutor for ${learningLanguage} with explanation in ${nativeLanguage}.
    The user said : ${text} in ${learningLanguage}.
    - Mode : ${mode}
    - For 'echo' mode : If input is incorrect, provide a corrected version and explain why in ${nativeLanguage}. If correct, confirm, give affirmation and suggest a variation.
    - For 'dialogue' mode : Respond converstaionally in ${learningLanguage} as if continuing a dialogue, and explain any error, if any, in ${nativeLanguage} along with corrected version in ${learningLanguage}.
    - For 'quiz' mode : 
    Ensure your response is a valid JSON object with 'correction' and 'explanation' fields.`;

    try {
        const genAI = new GoogleGenAI({apiKey: config.geminiAIApiKey});
        const result = await genAI.models.generateContent({
            model : "gemini-2.5-flash",
            contents : `${prompt}`,
            config : {
                    responseMimeType: 'application/json',
                }
            });
        
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if(!responseText) {
            throw new Error("Model did not return valid text content.")
        }
        const { correction, explanation } = JSON.parse(responseText);
        return {
            correction: correction || 'No correction provided',
            explanation: explanation || 'No explanation provided',
            correctionVoiceId: getVoiceId(learningLanguage),
            explanationVoiceId: getVoiceId(nativeLanguage),
        }
    } catch (error) {
        throw new Error(`LLM processing failed: ${(error as Error).message}`)
    }
}