// Audio processing logic for different modes

import { WebSocket } from "ws";
import { processAudioStream } from "../asr";
import { generateResponse } from "../llm";
import { generateAndSendTTS } from "../murf";
import { handleQuizAnswer } from "../quiz";
import { ClientSession, sessions, clearAudioChunks } from "../managers/session-manager";

// Process quiz answer
export const processQuizAnswer = async (ws: WebSocket, session: ClientSession): Promise<void> => {
  const transcription = await processAudioStream(
    session.audioChunks,
    session.learningLanguage
  );
  console.log("✅ Quiz answer transcription:", transcription.text);
  
  await handleQuizAnswer(ws, transcription.text, sessions);
  clearAudioChunks(session);
};

// Process dialogue/echo mode
export const processDialogueEcho = async (ws: WebSocket, session: ClientSession): Promise<void> => {
  // Get transcription
  const transcription = await processAudioStream(
    session.audioChunks,
    session.learningLanguage
  );
  console.log("✅ Transcription:", transcription.text);
  
  // Send transcription to client
  ws.send(JSON.stringify({
    transcription: transcription.text,
    language: session.learningLanguage,
  }));
  
  // Generate LLM response
  const response = await generateResponse(
    transcription.text,
    session.learningLanguage,
    session.nativeLanguage,
    session.mode
  );
  console.log("✅ Response:", response);
  
  // Send text response
  ws.send(JSON.stringify({
    correction: response.correction,
    explanation: response.explanation,
    correctionLanguage: session.learningLanguage,
    explanationLanguage: session.nativeLanguage,
  }));

  // Generate audio responses
  const correctionAudio = await generateAndSendTTS(
    ws,
    response.correction,
    session.learningLanguage,
    "correction"
  );
  
  const explanationAudio = await generateAndSendTTS(
    ws,
    response.explanation,
    session.nativeLanguage,
    "explanation"
  );

  // Send completion message with audio URLs
  ws.send(JSON.stringify({
    type: "done",
    done: true,
    audioCorrectionUrl: correctionAudio,
    audioExplanationUrl: explanationAudio,
  }));

  clearAudioChunks(session);
};
