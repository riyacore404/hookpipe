import axios from 'axios'

// All frontend API calls go through this single client
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Events
export const eventsApi = {
  list: (projectId: string, page = 1) =>
    api.get(`/api/events?projectId=${projectId}&page=${page}`),

  get: (id: string) =>
    api.get(`/api/events/${id}`),
}

// Projects
export const projectsApi = {
  list: (orgId: string) =>
    api.get(`/api/projects?orgId=${orgId}`),

  create: (data: { name: string; environment: string; organisationId: string }) =>
    api.post('/api/projects', data),
}