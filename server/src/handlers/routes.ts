// HTTP route handlers

import { Request, Response } from "express";
import { getSupportedLanguageCodes, supportedLanguages } from "../utils/languages";

// GET /languages - Get supported languages
export const getSupportedLanguages = (req: Request, res: Response) => {
  res.json({
    languages: supportedLanguages,
    codes: getSupportedLanguageCodes()
  });
};

// POST /api/practice/start
export const startPracticeSession = (req: Request, res: Response): any => {
  const { mode, learningLanguage, nativeLanguage } = req.body;
  
  // Validate mode
  if (!["echo", "dialogue", "quiz"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }
  
  // Validate languages
  const supportedCodes = getSupportedLanguageCodes();
  if (!learningLanguage || !nativeLanguage) {
    return res.status(400).json({ error: "Missing languages" });
  }
  
  if (!supportedCodes.includes(learningLanguage) || !supportedCodes.includes(nativeLanguage)) {
    return res.status(400).json({ 
      error: "Unsupported language", 
      supportedLanguages: supportedCodes 
    });
  }
  
  // Return session info
  return res.json({
    sessionId: Date.now().toString(),
    mode,
    learningLanguage,
    nativeLanguage,
  });
};
