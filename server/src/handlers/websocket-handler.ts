// WebSocket connection and message handling

import { WebSocket } from "ws";
import { initializeQuiz, generateAndSendQuizQuestion, handleQuizControlMessage } from "../quiz";
import { createSession, getSession, removeSession, sessions } from "../managers/session-manager";
import { processQuizAnswer, processDialogueEcho } from "../services/audio-processor";
import { generateScenarioGreeting, generateConversationStarter } from "../services/llm/conversation";

// Handle new WebSocket connection
export const handleConnection = async (ws: WebSocket, req: any): Promise<void> => {
  console.log("Client Connected!");
  
  // Parse connection parameters
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const learningLanguage = params.get("learningLanguage") || "es-ES";
  const nativeLanguage = params.get("nativeLanguage") || "en-US";
  const mode = params.get("mode") || "echo";
  const scenarioId = params.get("scenarioId");

  // Create session
  const session = createSession(ws, learningLanguage, nativeLanguage, mode);
  
  // Store scenario in session if provided
  if (scenarioId && mode === "dialogue") {
    session.scenarioId = scenarioId;
  }

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
    
    // Handle dialogue initialization
    if (message.type === "start_conversation" && session.mode === "dialogue") {
      try {
        let response;
        if (session.scenarioId) {
          response = await generateScenarioGreeting(
            session.scenarioId,
            session.learningLanguage,
            session.nativeLanguage
          );
        } else {
          response = await generateConversationStarter(
            session.learningLanguage,
            session.nativeLanguage
          );
        }
        
        // Send the text response
        ws.send(JSON.stringify({
          correction: response.correction,
          explanation: response.explanation
        }));
        
        // Generate and send audio for the greeting
        const { generateAndSendTTS } = await import("../murf");
        await generateAndSendTTS(
          ws,
          response.correction,
          session.learningLanguage,
          "correction"
        );
        
      } catch (error) {
        console.error("Failed to generate conversation starter:", error);
        ws.send(JSON.stringify({ 
          correction: "Hello! How are you today?",
          explanation: "Welcome to the conversation practice!"
        }));
      }
      return;
    }
    
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
