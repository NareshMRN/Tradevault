import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthenticatedUser } from "../middleware/auth";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some((a) => origin === a || a === "*")) {
          return callback(null, true);
        }
        callback(new Error("CORS blocked"));
      },
      credentials: true,
    },
  });

  // Authenticate socket connections
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.cookie
        ?.split("; ")
        .find((row) => row.startsWith(`${env.SESSION_COOKIE_NAME}=`))
        ?.split("=")[1];

    if (!token) {
      // Allow unauthenticated connection or reject:
      return next();
    }

    try {
      const user = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
      socket.data.user = user;
      socket.join(`user:${user.id}`);
      next();
    } catch (err) {
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    // Client joins a specific debate run room to receive streamed agent messages
    socket.on("join:run", (runId: string) => {
      socket.join(`run:${runId}`);
    });

    socket.on("leave:run", (runId: string) => {
      socket.leave(`run:${runId}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Streams an agent message to clients viewing the debate.
 */
export function streamAgentMessage(runId: string, message: any): void {
  if (io) {
    io.to(`run:${runId}`).emit("debate:message", message);
  }
}

/**
 * Broadcasts an update to a user's order status.
 */
export function broadcastOrderStatus(userId: string, order: any): void {
  if (io) {
    io.to(`user:${userId}`).emit("order:status", order);
  }
}

/**
 * Broadcasts a kill-switch toggle update.
 */
export function broadcastKillSwitchUpdate(userId: string, state: any): void {
  if (io) {
    io.to(`user:${userId}`).emit("kill_switch:update", state);
  }
}
