import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
// import prisma from "@lynx/prisma"; // To be implemented
// import { verifyToken } from "./middleware/auth"; // To be implemented

const app = express();
const server = http.createServer(app);

// Import Routes
import uploadRouter from "./routes/upload";
import projectRoutes from "./routes/projects";
import usersRouter from "./routes/users";
import tasksRouter from "./routes/tasks";
import incidentsRouter from "./routes/incidents";
import photosRouter from "./routes/photos";
import teamsRouter from "./routes/teams";
import departmentsRouter from "./routes/departments";
import auditRouter from "./routes/audit";
import reportsRouter from "./routes/reports";
import attendanceRouter from "./routes/attendance";
import authRouter from "./routes/auth";
import conversationsRouter from "./routes/conversations";
import messagesRouter from "./routes/messages";
import notificationsRouter from "./routes/notifications";
import planningRouter from "./routes/planning";
import commentsRouter from "./routes/comments";
import feedbacksRouter from "./routes/feedbacks";
import statsRouter from "./routes/stats";
import deliveriesRouter from "./routes/deliveries";
import visitsRouter from "./routes/visits";
import profileRouter from "./routes/profile";
import validationsRouter from "./routes/validations";
import mobileRouter from "./routes/mobile";

// Configuration WebSocket
const io = new Server(server, {
  cors: {
    origin: "*", // A configurer pour la prod
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Validation de santé de l'API
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes REST
app.use("/api/projects", projectRoutes);
app.use("/api/upload", uploadRouter);
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/photos", photosRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/deliveries", deliveriesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/planning", planningRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/feedbacks", feedbacksRouter);
app.use("/api/stats", statsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/validations", validationsRouter);
app.use("/api/visits", visitsRouter);
app.use("/api/mobile", mobileRouter);

// Socket.io Events
io.on("connection", (socket) => {
  console.log(`[Socket] Utilisateur connecté: ${socket.id}`);

  // Rejoindre une conversation (Room)
  socket.on("joinConversation", (conversationId: string) => {
    socket.join(conversationId);
    console.log(`[Socket] ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  // Quitter une conversation
  socket.on("leaveConversation", (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`[Socket] ${socket.id} a quitté la conversation ${conversationId}`);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log(`[Socket] Utilisateur déconnecté: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Serveur API Lynx démarré sur le port ${PORT}`);
  console.log(`⏱️  Socket.io prêt`);
});

export { io };
