import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { processAudioStream } from "./asr";
import { generateResponse } from "./llm";
import { generateAndSendTTS } from "./murf";
import { Language } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ClientSession {
  audioChunks: Buffer[];
  learningLanguage: string;
  nativeLanguage: string;
  mode: string;
}

const sessions = new Map<WebSocket, ClientSession>();

wss.on("connection", (ws, req) => {
  console.log("Client Connected!");
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const learningLanguage = params.get("learningLanguage") || "es-ES";
  const nativeLanguage = params.get("nativeLanguage") || "en-US";
  const mode = params.get("mode") || "echo";

  sessions.set(ws, {
    audioChunks: [],
    learningLanguage,
    nativeLanguage,
    mode,
  });

  const timeoutId = setTimeout(() => {
    if (sessions.has(ws)) {
      console.log('WebSocket connection timed out');
      ws.send(JSON.stringify({ error: 'Connection timed out' }));
      ws.close();
    }
  }, 30000); 

  ws.on("message", async (data: Buffer) => {
    
    try {
      const session = sessions.get(ws);
      if (!session) {
        ws.send(JSON.stringify({ error: "Session not found" }));
        return;
      }


      if (data.toString().startsWith("{")) {
        const message = JSON.parse(data.toString());
        if (message.end === true) {
          const transcription = await processAudioStream(
            session.audioChunks,
            session.learningLanguage
          );
            console.log("✅ Transcription:", transcription.text);
          clearTimeout(timeoutId)
          ws.send(
            JSON.stringify({
              transcription: transcription.text,
              language: session.learningLanguage,
            })
          );
          
          const response = await generateResponse(
            transcription.text,
            session.learningLanguage,
            session.nativeLanguage,
            session.mode
          );
            console.log("✅ Response:", response);
          ws.send(
            JSON.stringify({
              correction: response.correction,
              explanation: response.explanation,
              correctionLanguage: session.learningLanguage,
              explanationLanguage: session.nativeLanguage,
            })
          );

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

          ws.send(
            JSON.stringify({
              type: "done",
              done : true,
               audioCorrectionUrl: correctionAudio,
               audioExplanationUrl: explanationAudio,
            })
          )

          session.audioChunks = []; 
        }
      } else {
        if (data.length > 0) {
          session.audioChunks.push(data);
        } else {
          ws.send(JSON.stringify({ error: "Empty audio data" }));
        }
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          error: `Processing failed: ${(error as Error).message}`,
        })
      );
    }
  });

  ws.on("close", () => {
    clearTimeout(timeoutId)
    sessions.delete(ws);
    console.log("Client Disconnected");
  });
});

app.post("/api/practice/start", (req, res): any => {
  const { mode, learningLanguage, nativeLanguage } = req.body;
  if (!["echo", "dialogue", "quiz"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }
  if (!learningLanguage || !nativeLanguage) {
    return res.status(400).json({ error: "Missing languages" });
  }
  return res.json({
    sessionId: Date.now().toString(),
    mode,
    learningLanguage,
    nativeLanguage,
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port : ${PORT}`));
