/**
 * @lynx/types — Shared Zod schemas & TypeScript types
 * Single source of truth for all data models across web, mobile & API.
 */
import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const RoleEnum = z.enum([
  "ADMIN",
  "CONDUCTEUR",
  "CHEF_EQUIPE",
  "CLIENT",
  "OUVRIER",
]);
export type Role = z.infer<typeof RoleEnum>;

export const ProjectStatusEnum = z.enum([
  "PLANIFIE",
  "EN_COURS",
  "EN_PAUSE",
  "TERMINE",
  "ANNULE",
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const PriorityEnum = z.enum([
  "BASSE",
  "NORMALE",
  "HAUTE",
  "URGENTE",
]);
export type Priority = z.infer<typeof PriorityEnum>;

export const TaskStatusEnum = z.enum([
  "A_FAIRE",
  "EN_COURS",
  "EN_ATTENTE",
  "TERMINE",
  "ANNULE",
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const IncidentSeverityEnum = z.enum([
  "FAIBLE",
  "MOYENNE",
  "HAUTE",
  "CRITIQUE",
]);
export type IncidentSeverity = z.infer<typeof IncidentSeverityEnum>;

export const IncidentStatusEnum = z.enum([
  "OUVERT",
  "EN_COURS",
  "RESOLU",
  "FERME",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;

export const DailyLogStatusEnum = z.enum([
  "BROUILLON",
  "SOUMIS",
  "VALIDE",
  "REJETE",
]);
export type DailyLogStatus = z.infer<typeof DailyLogStatusEnum>;

export const AttendanceStatusEnum = z.enum([
  "EN_ATTENTE",
  "VALIDE",
  "ABSENT",
  "RETARD",
  "CONGE",
]);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

export const DeliveryStatusEnum = z.enum([
  "A_VENIR",
  "EN_ROUTE",
  "LIVRE",
  "RETARDE",
  "ANNULE",
  "URGENT",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

export const AdvanceRequestStatusEnum = z.enum([
  "EN_ATTENTE",
  "VALIDE",
  "REJETE",
  "PAYE",
]);
export type AdvanceRequestStatus = z.infer<typeof AdvanceRequestStatusEnum>;

export const PhotoSourceEnum = z.enum(["RAPPORT", "MESSAGE"]);

export const ReportStatusEnum = z.enum(["BROUILLON", "PUBLIE"]);
export type ReportStatus = z.infer<typeof ReportStatusEnum>;

export const ReportTypeEnum = z.enum([
  "HEBDOMADAIRE",
  "MENSUEL",
  "INCIDENT",
  "AVANCEMENT",
]);
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const FeedbackStatusEnum = z.enum(["EN_ATTENTE", "EN_COURS", "RESOLU", "FERME"]);
export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>;

// =============================================================================
// USER
// =============================================================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable().optional(),
  role: RoleEnum,
  avatar: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// =============================================================================
// PROJECT
// =============================================================================

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: ProjectStatusEnum.default("PLANIFIE"),
  priority: PriorityEnum.default("NORMALE"),
  startDate: z.string().nullable().optional(),
  estimatedEndDate: z.string().nullable().optional(),
  actualEndDate: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  progress: z.number().default(0),
  coverImage: z.string().nullable().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// =============================================================================
// MESSAGE & CONVERSATION
// =============================================================================

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  attachments: z.string().nullable().optional(), // JSON array
  createdAt: z.string(),
  conversationId: z.string(),
  authorId: z.string(),
  author: UserSchema.pick({ id: true, firstName: true, lastName: true }).extend({
    role: RoleEnum.optional(),
  }).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string(),
  attachments: z
    .array(z.object({ url: z.string(), type: z.string().optional() }))
    .optional(),
});
export type SendMessage = z.infer<typeof SendMessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

// =============================================================================
// PHOTO
// =============================================================================

export const PhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  caption: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  takenAt: z.string().optional(),
  createdAt: z.string().optional(),
  projectId: z.string().nullable().optional(),
  source: PhotoSourceEnum.optional(),
  project: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const UploadResponseSchema = z.object({
  url: z.string(),
  filename: z.string().optional(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// =============================================================================
// TASK
// =============================================================================

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: TaskStatusEnum.default("A_FAIRE"),
  priority: PriorityEnum.default("NORMALE"),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  progress: z.number().default(0),
  projectId: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

// =============================================================================
// INCIDENT
// =============================================================================

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  severity: IncidentSeverityEnum.default("MOYENNE"),
  status: IncidentStatusEnum.default("OUVERT"),
  location: z.string().nullable().optional(),
  date: z.string(),
  projectId: z.string(),
});
export type Incident = z.infer<typeof IncidentSchema>;

// =============================================================================
// DAILY LOG
// =============================================================================

export const DailyLogSchema = z.object({
  id: z.string(),
  date: z.string(),
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  workCompleted: z.string().nullable().optional(),
  issues: z.string().nullable().optional(),
  materials: z.string().nullable().optional(),
  status: DailyLogStatusEnum.default("BROUILLON"),
  rejectionNote: z.string().nullable().optional(),
  projectId: z.string(),
  authorId: z.string(),
});
export type DailyLog = z.infer<typeof DailyLogSchema>;

// =============================================================================
// ATTENDANCE
// =============================================================================

export const AttendanceSchema = z.object({
  id: z.string(),
  date: z.string(),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  status: AttendanceStatusEnum.default("EN_ATTENTE"),
  userId: z.string(),
  projectId: z.string().nullable().optional(),
});
export type Attendance = z.infer<typeof AttendanceSchema>;

// =============================================================================
// DELIVERY
// =============================================================================

export const DeliverySchema = z.object({
  id: z.string(),
  item: z.string(),
  quantity: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  status: DeliveryStatusEnum.default("A_VENIR"),
  plannedDate: z.string(),
  actualDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  projectId: z.string(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

// =============================================================================
// ADVANCE REQUEST
// =============================================================================

export const AdvanceRequestSchema = z.object({
  id: z.string(),
  amount: z.number(),
  reason: z.string(),
  status: AdvanceRequestStatusEnum.default("EN_ATTENTE"),
  notes: z.string().nullable().optional(),
  userId: z.string(),
  projectId: z.string(),
});
export type AdvanceRequest = z.infer<typeof AdvanceRequestSchema>;

// =============================================================================
// NOTIFICATION
// =============================================================================

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  isRead: z.boolean().default(false),
  link: z.string().nullable().optional(),
  createdAt: z.string(),
  userId: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// =============================================================================
// REPORT
// =============================================================================

export const ReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: ReportTypeEnum.default("HEBDOMADAIRE"),
  content: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  status: ReportStatusEnum.default("BROUILLON"),
  projectId: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;

// =============================================================================
// FEEDBACK
// =============================================================================

export const FeedbackSchema = z.object({
  id: z.string(),
  subject: z.string(),
  message: z.string(),
  status: FeedbackStatusEnum.default("EN_ATTENTE"),
  priority: PriorityEnum.default("NORMALE"),
  projectId: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
