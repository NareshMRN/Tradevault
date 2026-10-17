import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? window.location.origin
    : "http://localhost:4000");

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[Confluence Socket] Connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Confluence Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Confluence Socket] Connection error:", err.message);
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
