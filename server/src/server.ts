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

  ws.on("message", async (data: Buffer) => {
    try {
      if (data.length === 0) {
        ws.send(JSON.stringify({ error: "Empty audio data" }));
        return;
      }

      const session = sessions.get(ws);
      if (!session) {
        ws.send(JSON.stringify({ error: "Session not found" }));
        return;
      }

      session.audioChunks.push(data);

      const transcription = await processAudioStream(
        session.audioChunks,
        session.learningLanguage
      );
      ws.send(
        JSON.stringify({
          transcription: transcription.text,
          Language: session.learningLanguage,
        })
      );

      const response = await generateResponse(
        transcription.text,
        session.learningLanguage,
        session.nativeLanguage,
        session.mode
      );
      ws.send(
        JSON.stringify({
          correction: response.correction,
          explanation: response.explanation,
          correctionLanguage: session.learningLanguage,
          explanationLanguage: session.nativeLanguage,
        })
      );

      await generateAndSendTTS(
        ws,
        response.correction,
        session.learningLanguage,
        "correction"
      );
      await generateAndSendTTS(
        ws,
        response.explanation,
        session.nativeLanguage,
        "explanation"
      );
      session.audioChunks = [];
    } catch (error) {
      ws.send(
        JSON.stringify({
          error: `Processing failed: ${(error as Error).message}`,
        })
      );
    }
  });

  ws.on("close", () => {
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
