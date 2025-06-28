import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./utils/config";
import { handleConnection, handleMessage, handleDisconnection } from "./handlers/websocket-handler";
import { startPracticeSession } from "./handlers/routes";


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on("connection", async (ws, req) => {
  await handleConnection(ws, req);
  
  // Timeout management
  let timeoutId = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket connection timed out');
      ws.send(JSON.stringify({ error: 'Connection timed out' }));
      ws.close();
    }
  }, 60000);

  // Message handling
  ws.on("message", async (data: Buffer) => {
    try {
      // Reset timeout on activity
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('WebSocket connection timed out');
          ws.send(JSON.stringify({ error: 'Connection timed out' }));
          ws.close();
        }
      }, 60000);

      await handleMessage(ws, data);
    } catch (error) {
      ws.send(JSON.stringify({
        error: `Processing failed: ${(error as Error).message}`,
      }));
    }
  });

  // Disconnection handling
  ws.on("close", () => {
    clearTimeout(timeoutId);
    handleDisconnection(ws);
  });
});

// HTTP routes
app.post("/api/practice/start", startPracticeSession);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port : ${PORT}`));
