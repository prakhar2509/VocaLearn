// Simple session management utilities

import { WebSocket } from "ws";

export interface ClientSession {
  audioChunks: Buffer[];
  learningLanguage: string;
  nativeLanguage: string;
  mode: string;
  quiz?: any;
  isProcessing?: boolean;
  lastTranscription?: string;
  lastTranscriptionTime?: number;
  retryCount?: number;
}

export const sessions = new Map<WebSocket, ClientSession>();

// Create a new session for a WebSocket connection
export const createSession = (
  ws: WebSocket,
  learningLanguage: string,
  nativeLanguage: string,
  mode: string
): ClientSession => {
  const session: ClientSession = {
    audioChunks: [],
    learningLanguage,
    nativeLanguage,
    mode,
  };
  
  sessions.set(ws, session);
  return session;
};

// Get session for a WebSocket
export const getSession = (ws: WebSocket): ClientSession | undefined => {
  return sessions.get(ws);
};

// Remove session for a WebSocket
export const removeSession = (ws: WebSocket): void => {
  sessions.delete(ws);
};

// Clear audio chunks for a session
export const clearAudioChunks = (session: ClientSession): void => {
  session.audioChunks = [];
};
