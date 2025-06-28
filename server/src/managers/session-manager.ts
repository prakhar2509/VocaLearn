// Simple session management utilities

import { WebSocket } from "ws";

export interface ClientSession {
  audioChunks: Buffer[];
  learningLanguage: string;
  nativeLanguage: string;
  mode: string;
  scenarioId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
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
    conversationHistory: [],
  };
  
  sessions.set(ws, session);
  return session;
};

// Add message to conversation history
export const addToConversationHistory = (
  session: ClientSession,
  role: 'user' | 'assistant',
  content: string
): void => {
  if (!session.conversationHistory) {
    session.conversationHistory = [];
  }
  
  session.conversationHistory.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Keep only last 15 exchanges (30 messages total) to maintain better context
  if (session.conversationHistory.length > 30) {
    session.conversationHistory = session.conversationHistory.slice(-30);
  }
};

// Get conversation context summary for better continuity
export const getConversationContext = (session: ClientSession): string => {
  if (!session.conversationHistory || session.conversationHistory.length === 0) {
    return '';
  }

  const history = session.conversationHistory.sort((a, b) => a.timestamp - b.timestamp);
  
  // If we have less than 10 messages, show them all
  if (history.length <= 10) {
    return history.map(msg => `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`).join('\n');
  }
  
  // For longer conversations, show recent messages with context
  const recentMessages = history.slice(-8); // Last 4 exchanges
  const olderMessages = history.slice(0, -8);
  
  let context = '';
  
  if (olderMessages.length > 0) {
    // Add summary of earlier conversation
    context += `[Earlier conversation: We've been chatting naturally about various topics and getting to know each other]\n\n`;
  }
  
  // Add recent detailed messages
  context += 'Recent conversation:\n';
  context += recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`).join('\n');
  
  return context;
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
