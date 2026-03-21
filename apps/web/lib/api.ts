import axios from 'axios'

// base URL points to your Fastify server
// NEXT_PUBLIC_ prefix makes it available in the browser
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- types ---
// these match exactly what Fastify returns
// keeping them here means one place to update if the API changes

export type Project = {
  id: string
  name: string
  environment: 'production' | 'staging' | 'development'
  ingestKey: string
  organisationId: string
  createdAt: string
}

export type Event = {
  id: string
  projectId: string
  payload: Record<string, unknown>
  headers: Record<string, string>
  sourceIp: string | null
  ingestedAt: string
}

export type EventsResponse = {
  events: Event[]
  total: number
  page: number
  limit: number
}

export type DeliveryAttempt = {
  id: string
  eventId: string
  destinationId: string
  status: 'pending' | 'success' | 'failed' | 'dead'
  httpStatus: number | null
  responseBody: string | null
  latencyMs: number | null
  attemptNumber: number
  attemptedAt: string
}

// --- API functions ---
// each function maps to one backend endpoint
// components call these, never axios directly

export const projectsApi = {
  list: (orgId: string) =>
    api.get<Project[]>(`/api/projects?orgId=${orgId}`),

  create: (data: { name: string; environment: string; organisationId: string }) =>
    api.post<Project>('/api/projects', data),

  get: (id: string) =>
    api.get<Project>(`/api/projects/${id}`),
}

export const eventsApi = {
  list: (projectId: string, page = 1) =>
    api.get<EventsResponse>(`/api/events?projectId=${projectId}&page=${page}`),

  get: (id: string) =>
    api.get<Event & { deliveryAttempts: DeliveryAttempt[] }>(`/api/events/${id}`),
}