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

export type Destination = {
  id: string
  projectId: string
  url: string
  label: string | null
  isActive: boolean
  createdAt: string
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
  destination?: Destination
}

export type FilterRule = {
  id: string
  destinationId: string
  field: string
  operator: string
  value: string
}

// --- API functions ---
// each function maps to one backend endpoint
// components call these, never axios directly

export const projectsApi = {
  list: (orgId: string, token?: string) =>
    api.get<Project[]>(`/api/projects?orgId=${orgId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  create: (data: { name: string; environment: string; organisationId: string }, token?: string) =>
    api.post<Project>('/api/projects', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  get: (id: string, token?: string) =>
    api.get<Project>(`/api/projects/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}

export const eventsApi = {
  list: (projectId: string, page = 1, token?: string) =>
    api.get<EventsResponse>(`/api/events?projectId=${projectId}&page=${page}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  get: (id: string, token?: string) =>
    api.get<Event & { deliveryAttempts: DeliveryAttempt[] }>(`/api/events/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}

export const destinationsApi = {
  list: (projectId: string, token?: string) =>
    api.get<Destination[]>(`/api/destinations?projectId=${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  create: (data: { projectId: string; url: string; label?: string }, token?: string) =>
    api.post<Destination>('/api/destinations', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  toggle: (id: string, isActive: boolean, token?: string) =>
    api.patch<Destination>(`/api/destinations/${id}`, { isActive }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  delete: (id: string, token?: string) =>
    api.delete(`/api/destinations/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}

export const deliveriesApi = {
  forEvent: (eventId: string, token?: string) =>
    api.get<DeliveryAttempt[]>(`/api/deliveries/event/${eventId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  forDestination: (destinationId: string, token?: string) =>
    api.get<DeliveryAttempt[]>(`/api/deliveries/destination/${destinationId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  replay: (eventId: string, token?: string) =>
    api.post(`/api/deliveries/event/${eventId}/replay`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}

export const filterRulesApi = {
  list: (destinationId: string, token?: string) =>
    api.get<FilterRule[]>(`/api/filter-rules/destination/${destinationId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  create: (data: { destinationId: string; field: string; operator: string; value: string }, token?: string) =>
    api.post<FilterRule>('/api/filter-rules', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  delete: (id: string, token?: string) =>
    api.delete(`/api/filter-rules/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}