import { error } from "console";
import dotenv from "dotenv";

dotenv.config()

const requiredEnvVars = ["DEEPGRAM_API_KEY", "GEMINI_API_KEY", "MURF_API_KEY"];
for(const envVar of requiredEnvVars) {
    if(!process.env[envVar]){
        throw new Error(`Missing enviornment Variable ${envVar}`);
    }
}

export const config = {
  deepgramApiKey: process.env.DEEPGRAM_API_KEY!, 
  geminiAIApiKey: process.env.OPENAI_API_KEY!,
  murfApiKey: process.env.MURF_API_KEY!,
};