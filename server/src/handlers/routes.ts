// HTTP route handlers

import { Request, Response } from "express";

// POST /api/practice/start
export const startPracticeSession = (req: Request, res: Response): any => {
  const { mode, learningLanguage, nativeLanguage } = req.body;
  
  // Validate mode
  if (!["echo", "dialogue", "quiz"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }
  
  // Validate languages
  if (!learningLanguage || !nativeLanguage) {
    return res.status(400).json({ error: "Missing languages" });
  }
  
  // Return session info
  return res.json({
    sessionId: Date.now().toString(),
    mode,
    learningLanguage,
    nativeLanguage,
  });
};
