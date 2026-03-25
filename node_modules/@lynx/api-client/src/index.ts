/**
 * @lynx/api-client — Universal API client for Lynx
 * Shared between web (Next.js) and mobile (Expo/RN).
 * Uses Axios + TanStack React Query for data fetching.
 */
import axios, { type AxiosInstance } from "axios";
import type { User, Project, Message, Photo, Conversation } from "@lynx/types";

// =============================================================================
// TOKEN STORAGE ADAPTER — platform-specific
// =============================================================================

export interface TokenStorage {
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  removeToken: () => Promise<void>;
  getUserData: () => Promise<string | null>;
  setUserData: (data: string) => Promise<void>;
  removeUserData: () => Promise<void>;
}

let _tokenStorage: TokenStorage | null = null;

export function setTokenStorage(storage: TokenStorage) {
  _tokenStorage = storage;
}

// =============================================================================
// API CLIENT
// =============================================================================

let _baseURL = "";

export function createApiClient(baseURL: string): AxiosInstance {
  _baseURL = baseURL;

  const client = axios.create({
    baseURL,
    timeout: 30_000,
  });

  client.interceptors.request.use(async (config) => {
    if (_tokenStorage) {
      const token = await _tokenStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  return client;
}

export { _baseURL as baseURL };

// =============================================================================
// API FUNCTIONS — used by hooks and direct calls
// =============================================================================

export const apiEndpoints = {
  // Auth
  login: (client: AxiosInstance, email: string, password: string) =>
    client.post<{ token: string; user: User }>("/mobile/login", { email, password }),

  // Projects
  getProjects: (client: AxiosInstance) =>
    client.get<Project[]>("/projects"),

  getProject: (client: AxiosInstance, id: string) =>
    client.get<Project>(`/projects/${id}`),

  // Messages
  getMessages: (client: AxiosInstance, conversationId: string) =>
    client.get<Message[]>(`/messages?conversationId=${conversationId}`),

  sendMessage: (client: AxiosInstance, data: { conversationId: string; content: string; attachments?: any[] }) =>
    client.post<Message>("/messages", data),

  // Users
  getUsers: (client: AxiosInstance) =>
    client.get<User[]>("/users"),

  // Conversations
  getConversations: (client: AxiosInstance) =>
    client.get<Conversation[]>("/conversations"),

  createConversation: (client: AxiosInstance, data: { name?: string; projectId?: string; participantIds?: string[] | string }) =>
    client.post<Conversation>("/conversations", data),

  // Feedbacks
  getFeedbacks: (client: AxiosInstance) =>
    client.get<any[]>("/feedbacks"),

  createFeedback: (client: AxiosInstance, data: { subject: string; message: string; projectId: string; priority?: string }) =>
    client.post<any>("/feedbacks", data),

  updateFeedbackStatus: (client: AxiosInstance, id: string, status: string) =>
    client.put<any>(`/feedbacks/${id}`, { status }),



  // Deliveries
  getDeliveries: (client: AxiosInstance) =>
    client.get<any[]>("/deliveries"),

  createDelivery: (client: AxiosInstance, data: any) =>
    client.post<any>("/deliveries", data),

  updateDelivery: (client: AxiosInstance, id: string, data: any) =>
    client.put<any>(`/deliveries/${id}`, data),

  updateDeliveryStatus: (client: AxiosInstance, id: string, status: string) =>
    client.patch<any>(`/deliveries/${id}`, { status }),

  deleteDelivery: (client: AxiosInstance, id: string) =>
    client.delete<any>(`/deliveries/${id}`),

  // Stats
  getStats: (client: AxiosInstance) =>
    client.get("/stats"),

  // Tasks
  getTasks: (client: AxiosInstance) =>
    client.get<any[]>("/tasks"),

  // Incidents
  getIncidents: (client: AxiosInstance) =>
    client.get<any[]>("/incidents"),

  createIncident: (client: AxiosInstance, data: any) =>
    client.post<any>("/incidents", data),

  updateIncidentStatus: (client: AxiosInstance, id: string, status: string) =>
    client.put<any>(`/incidents/${id}`, { status }),

  // Attendance
  getAttendance: (client: AxiosInstance) =>
    client.get<any[]>("/attendance"),

  checkIn: (client: AxiosInstance, data: any) =>
    client.post<any>("/attendance/check-in", data),

  checkOut: (client: AxiosInstance, data: any) =>
    client.post<any>("/attendance/check-out", data),

  validateAttendance: (client: AxiosInstance, attendanceIds: string[]) =>
    client.post<any>("/attendance/validate", { attendanceIds }),

  // Projects
  createProject: (client: AxiosInstance, data: any) =>
    client.post<any>("/projects", data),

  updateProject: (client: AxiosInstance, id: string, data: any) =>
    client.put<any>(`/projects/${id}`, data),

  deleteProject: (client: AxiosInstance, id: string) =>
    client.delete<any>(`/projects/${id}`),

  // Tasks
  createTask: (client: AxiosInstance, data: any) =>
    client.post<any>("/tasks", data),

  updateTask: (client: AxiosInstance, id: string, data: any) =>
    client.put<any>(`/tasks/${id}`, data),

  deleteTask: (client: AxiosInstance, id: string) =>
    client.delete<any>(`/tasks/${id}`),

  // Teams
  getTeams: (client: AxiosInstance) =>
    client.get<any[]>("/teams"),

  // Reports
  getReports: (client: AxiosInstance) =>
    client.get<any[]>("/reports"),

  createReport: (client: AxiosInstance, data: any) =>
    client.post<any>("/reports", data),

  updateReport: (client: AxiosInstance, id: string, data: any) =>
    client.put<any>(`/reports/${id}`, data),

  getReportPdfData: (client: AxiosInstance, id: string) =>
    client.get<any>(`/reports/${id}/pdf`),

  // Daily Logs
  getDailyLogs: (client: AxiosInstance) =>
    client.get<any[]>("/daily-logs"),

  createDailyLog: (client: AxiosInstance, data: any) =>
    client.post<any>("/daily-logs", data),

  updateDailyLog: (client: AxiosInstance, id: string, data: any) =>
    client.put<any>(`/daily-logs/${id}`, data),

  deleteDailyLog: (client: AxiosInstance, id: string) =>
    client.delete<any>(`/daily-logs/${id}`),
};

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

let queryApiClient: AxiosInstance | null = null;
export function setQueryApiClient(client: AxiosInstance) {
  queryApiClient = client;
}
function getClient() {
  if (!queryApiClient) throw new Error("API Client not initialized. Call setQueryApiClient() first.");
  return queryApiClient;
}

// ---- Users ----
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getUsers(getClient());
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ---- Conversations ----
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getConversations(getClient());
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name?: string; projectId?: string; participantIds?: string[] | string }) => {
      const { data } = await apiEndpoints.createConversation(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ---- Messages ----
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await apiEndpoints.getMessages(getClient(), conversationId);
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conversationId: string; content: string; attachments?: any[] }) => {
      const { data } = await apiEndpoints.sendMessage(getClient(), vars);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ---- Feedbacks ----
export function useFeedbacks() {
  return useQuery({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getFeedbacks(getClient());
      return data;
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { subject: string; message: string; projectId: string; priority?: string }) => {
      const { data } = await apiEndpoints.createFeedback(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiEndpoints.updateFeedbackStatus(getClient(), id, status);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}



// ---- Deliveries ----
export function useDeliveries() {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getDeliveries(getClient());
      return data;
    },
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.createDelivery(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { data: response } = await apiEndpoints.updateDelivery(getClient(), id, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiEndpoints.updateDeliveryStatus(getClient(), id, status);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiEndpoints.deleteDelivery(getClient(), id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

// ---- Projects ----
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getProjects(getClient());
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ---- Tasks ----
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getTasks(getClient());
      return data;
    },
    staleTime: 60_000,
  });
}

// ---- Incidents ----
export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getIncidents(getClient());
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.createIncident(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiEndpoints.updateIncidentStatus(getClient(), id, status);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// ---- Attendance ----
export function useAttendance() {
  return useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getAttendance(getClient());
      return data;
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.checkIn(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.checkOut(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useValidateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attendanceIds: string[]) => {
      const { data } = await apiEndpoints.validateAttendance(getClient(), attendanceIds);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// ---- Project Mutations ----
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.createProject(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiEndpoints.updateProject(getClient(), id, data);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ---- Task Mutations ----
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.createTask(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiEndpoints.updateTask(getClient(), id, data);
      return responseData;
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });
}

// ---- Users & Teams ----
export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getTeams(getClient());
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ---- Reports ----
export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getReports(getClient());
      return data;
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await apiEndpoints.createReport(getClient(), vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiEndpoints.updateReport(getClient(), id, data);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ---- Stats ----
export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await apiEndpoints.getStats(getClient());
      return data;
    },
    staleTime: 60_000,
  });
}

export default apiEndpoints;
