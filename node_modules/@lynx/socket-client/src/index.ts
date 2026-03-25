/**
 * @lynx/socket-client — Real-time messaging via Socket.io
 * Universal client for web (Next.js) and mobile (Expo/RN).
 */
import { io, type Socket } from "socket.io-client";
import type { Message } from "@lynx/types";

let socket: Socket | null = null;

// =============================================================================
// CONNECTION
// =============================================================================

export interface SocketConfig {
  url: string;
  token: string;
}

export function connectSocket(config: SocketConfig): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(config.url, {
    auth: { token: config.token },
    transports: ["websocket"],  // No polling — faster
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// =============================================================================
// ROOM MANAGEMENT
// =============================================================================

export function joinConversation(conversationId: string) {
  socket?.emit("joinConversation", conversationId);
}

export function leaveConversation(conversationId: string) {
  socket?.emit("leaveConversation", conversationId);
}

// =============================================================================
// MESSAGING
// =============================================================================

export function sendMessage(data: {
  conversationId: string;
  content: string;
  attachments?: { url: string; type?: string }[];
}) {
  socket?.emit("sendMessage", data);
}

export function onNewMessage(callback: (message: Message) => void) {
  socket?.on("newMessage", callback);
  return () => {
    socket?.off("newMessage", callback);
  };
}

export function onTyping(callback: (data: { userId: string; conversationId: string }) => void) {
  socket?.on("typing", callback);
  return () => {
    socket?.off("typing", callback);
  };
}

export function emitTyping(conversationId: string) {
  socket?.emit("typing", { conversationId });
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { Socket, Message };
