// Audio processing logic for different modes

import { WebSocket } from "ws";
import { processAudioStream } from "../asr";
import { generateResponse } from "../services/llm";
import { calculateAccuracy } from "./llm/accuracy";
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
  
  // Generate LLM response
  const response = await generateResponse(
    transcription.text,
    session.learningLanguage,
    session.nativeLanguage,
    session.mode
  );
  console.log("✅ Response:", response);
  
  // Calculate accuracy for the user's speech
  let accuracyResult;
  if (session.mode === "echo") {
    // In echo mode, compare against the correction to see how well they matched the expected output
    accuracyResult = await calculateAccuracy(
      transcription.text,
      response.correction, // Compare against the corrected version
      session.learningLanguage,
      "echo"
    );
  } else {
    // In dialogue mode, evaluate speech quality without comparing to a specific expected text
    accuracyResult = await calculateAccuracy(
      transcription.text,
      transcription.text, // Self-evaluation for dialogue mode
      session.learningLanguage,
      "dialogue"
    );
  }
  console.log("📊 Accuracy:", accuracyResult);
  
  // Send transcription and accuracy to client
  ws.send(JSON.stringify({
    transcription: transcription.text,
    language: session.learningLanguage,
    // Accuracy data
    accuracy: accuracyResult.accuracy,
    pronunciationScore: accuracyResult.pronunciationScore,
    grammarScore: accuracyResult.grammarScore,
    fluencyScore: accuracyResult.fluencyScore,
    accuracyFeedback: accuracyResult.feedback
  }));
  
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
