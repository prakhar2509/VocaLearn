// WebSocket connection and message handling

import { WebSocket } from "ws";
import { initializeQuiz, generateAndSendQuizQuestion, handleQuizControlMessage } from "../quiz";
import { createSession, getSession, removeSession, sessions } from "../managers/session-manager";
import { processQuizAnswer, processDialogueEcho } from "../services/audio-processor";

// Handle new WebSocket connection
export const handleConnection = async (ws: WebSocket, req: any): Promise<void> => {
  console.log("Client Connected!");
  
  // Parse connection parameters
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const learningLanguage = params.get("learningLanguage") || "es-ES";
  const nativeLanguage = params.get("nativeLanguage") || "en-US";
  const mode = params.get("mode") || "echo";

  // Create session
  const session = createSession(ws, learningLanguage, nativeLanguage, mode);

  // Initialize quiz if needed
  if (mode === "quiz") {
    initializeQuiz(session, params);
    console.log(`🧪 Quiz initialized for ${learningLanguage} -> ${nativeLanguage}`);
    
    // Start first question
    setTimeout(async () => {
      await generateAndSendQuizQuestion(ws, sessions);
    }, 1000);
  }
};

// Handle WebSocket messages
export const handleMessage = async (ws: WebSocket, data: Buffer): Promise<void> => {
  const session = getSession(ws);
  if (!session) {
    ws.send(JSON.stringify({ error: "Session not found" }));
    return;
  }

  // Handle JSON messages (control messages)
  if (data.toString().startsWith("{")) {
    const message = JSON.parse(data.toString());
    
    // Handle quiz control messages
    if (session.mode === "quiz") {
      const handled = await handleQuizControlMessage(ws, sessions, message);
      if (handled) return;
    }
    
    // Handle end message (process audio)
    if (message.end === true) {
      if (session.mode === "quiz" && session.quiz?.isWaitingForAnswer) {
        await processQuizAnswer(ws, session);
      } else {
        await processDialogueEcho(ws, session);
      }
      return;
    }
  } else {
    // Handle binary audio data
    if (data.length > 0) {
      session.audioChunks.push(data);
    } else {
      ws.send(JSON.stringify({ error: "Empty audio data" }));
    }
  }
};

// Handle WebSocket disconnection
export const handleDisconnection = (ws: WebSocket): void => {
  removeSession(ws);
  console.log("Client Disconnected");
};
