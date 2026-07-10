import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { setupWSConnection } from "./ws-connection.js";
import { PrismaClient } from "@prisma/client";
import { Role } from "./role.js";
import { verifyWsToken } from "./ws-token.js";
import {
  isOversizedPayload,
  shouldRejectViewerUpdate,
} from "./ws-utils.js";

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT ?? 3001);
const MAX_PAYLOAD_BYTES = Number(process.env.MAX_PAYLOAD_BYTES ?? 1_048_576);
const MAX_MESSAGES_PER_SECOND = Number(process.env.MAX_MESSAGES_PER_SECOND ?? 50);

type ConnectionMeta = {
  userId: string;
  role: Role;
  messageTimestamps: number[];
  rejectedViewerUpdates: number;
};

const connectionMeta = new WeakMap<WebSocket, ConnectionMeta>();

export function patchViewerMessageFilter(ws: WebSocket, role: Role) {
  if (role !== Role.VIEWER) return;

  const originalOn = ws.on.bind(ws);
  ws.on = function patchedOn(
    event: string | symbol,
    listener: (...args: unknown[]) => void
  ) {
    if (event === "message") {
      const wrapped = (data: Buffer, isBinary: boolean) => {
        if (isBinary && shouldRejectViewerUpdate(role, data)) {
          const meta = connectionMeta.get(ws);
          if (meta) meta.rejectedViewerUpdates += 1;
          return;
        }
        listener(data, isBinary);
      };
      return originalOn(event, wrapped);
    }
    return originalOn(event, listener);
  } as typeof ws.on;
}

async function getDocumentRole(
  documentId: string,
  userId: string
): Promise<Role | null> {
  const access = await prisma.documentAccess.findUnique({
    where: {
      documentId_userId: { documentId, userId },
    },
    select: { role: true },
  });

  return access?.role ?? null;
}

function isRateLimited(meta: ConnectionMeta): boolean {
  const now = Date.now();
  meta.messageTimestamps = meta.messageTimestamps.filter((t) => now - t < 1000);
  if (meta.messageTimestamps.length >= MAX_MESSAGES_PER_SECOND) {
    return true;
  }
  meta.messageTimestamps.push(now);
  return false;
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("DocSync WebSocket server");
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

server.on("upgrade", async (request, socket, head) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const documentId = url.pathname.replace(/^\//, "");
    const token = url.searchParams.get("token");
    const claimedUserId = url.searchParams.get("userId");

    if (!documentId || !token || !claimedUserId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const userId = await verifyWsToken(token);
    if (!userId || userId !== claimedUserId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const role = await getDocumentRole(documentId, userId);
    if (!role) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const meta: ConnectionMeta = {
        userId,
        role,
        messageTimestamps: [],
        rejectedViewerUpdates: 0,
      };
      connectionMeta.set(ws, meta);

      patchViewerMessageFilter(ws, role);

      ws.on("message", (data, isBinary) => {
        const current = connectionMeta.get(ws);
        if (!current) return;

        if (isBinary && isOversizedPayload(data, MAX_PAYLOAD_BYTES)) {
          ws.close(1009, "Payload too large");
          return;
        }

        if (isRateLimited(current)) {
          ws.close(1008, "Rate limit exceeded");
          return;
        }
      });

      setupWSConnection(ws, request, { docName: documentId, gc: true });
      wss.emit("connection", ws, request);
    });
  } catch {
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`DocSync WS server listening on port ${PORT}`);
});

export { connectionMeta, MAX_PAYLOAD_BYTES };
