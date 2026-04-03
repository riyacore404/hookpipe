import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- types ---

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
  headers: Record<string, string> | null
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
  destination?: Destination
}

export type Destination = {
  id: string
  projectId: string
  url: string
  label: string | null
  isActive: boolean
  createdAt: string
}

export type FilterRule = {
  id: string
  destinationId: string
  field: string
  operator: string
  value: string
}

export type ProjectAnalytics = {
  totalEvents: number
  eventsLast24h: number
  eventsLast7d: number
  eventsLast30d: number
  topEventTypes: { type: string; count: number }[]
}

// --- API function factories ---
// These accept an optional token for client-side authenticated calls.
// Server components pass the token explicitly.
// Client components use the useApi() hook below.

export function makeProjectsApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: (orgId: string) =>
      api.get<Project[]>(`/api/projects?orgId=${orgId}`, { headers }),
    create: (data: { name: string; environment: string; organisationId: string }) =>
      api.post<Project>('/api/projects', data, { headers }),
    get: (id: string) =>
      api.get<Project>(`/api/projects/${id}`, { headers }),
  }
}

export function makeEventsApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: (projectId: string, page = 1) =>
      api.get<EventsResponse>(`/api/events?projectId=${projectId}&page=${page}`, { headers }),
    get: (id: string) =>
      api.get<Event & { deliveryAttempts: DeliveryAttempt[] }>(`/api/events/${id}`, { headers }),
  }
}

export function makeDeliveriesApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    forEvent: (eventId: string) =>
      api.get<DeliveryAttempt[]>(`/api/deliveries/event/${eventId}`, { headers }),
    forDestination: (destinationId: string) =>
      api.get<DeliveryAttempt[]>(`/api/deliveries/destination/${destinationId}`, { headers }),
    replay: (eventId: string) =>
      api.post(`/api/deliveries/event/${eventId}/replay`, {}, { headers }),
  }
}

export function makeDestinationsApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: (projectId: string) =>
      api.get<Destination[]>(`/api/destinations?projectId=${projectId}`, { headers }),
    create: (data: { projectId: string; url: string; label?: string }) =>
      api.post<Destination>('/api/destinations', data, { headers }),
    toggle: (id: string, isActive: boolean) =>
      api.patch<Destination>(`/api/destinations/${id}`, { isActive }, { headers }),
    delete: (id: string) =>
      api.delete(`/api/destinations/${id}`, { headers }),
  }
}

export function makeFilterRulesApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: (destinationId: string) =>
      api.get<FilterRule[]>(`/api/filter-rules/destination/${destinationId}`, { headers }),
    create: (data: { destinationId: string; field: string; operator: string; value: string }) =>
      api.post<FilterRule>('/api/filter-rules', data, { headers }),
    delete: (id: string) =>
      api.delete(`/api/filter-rules/${id}`, { headers }),
  }
}

export function makeOrganisationsApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: () =>
      api.get('/api/organisations', { headers }),
    getMembers: (orgId: string) =>
      api.get(`/api/organisations/${orgId}/members`, { headers }),
    addMember: (orgId: string, data: { userId: string; role: string }) =>
      api.post(`/api/organisations/${orgId}/members`, data, { headers }),
    removeMember: (orgId: string, memberId: string) =>
      api.delete(`/api/organisations/${orgId}/members/${memberId}`, { headers }),
  }
}

export function makeApiKeysApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    list: () =>
      api.get('/api/api-keys', { headers }),
    create: (data: { label?: string }) =>
      api.post('/api/api-keys', data, { headers }),
    revoke: (id: string) =>
      api.delete(`/api/api-keys/${id}`, { headers }),
  }
}

export function makeAnalyticsApi(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return {
    getStats: (projectId: string) =>
      api.get(`/api/analytics/${projectId}/stats`, { headers }),
    getEventTrends: (projectId: string) =>
      api.get(`/api/analytics/${projectId}/event-trends`, { headers }),
  }
}

// --- Legacy exports for server components that already pass tokens manually ---
// Keep these so existing server-side code in page.tsx files doesn't break

export const projectsApi = makeProjectsApi()
export const eventsApi = makeEventsApi()
export const deliveriesApi = makeDeliveriesApi()
export const destinationsApi = makeDestinationsApi()
export const filterRulesApi = makeFilterRulesApi()
export const analyticsApi = makeAnalyticsApi()