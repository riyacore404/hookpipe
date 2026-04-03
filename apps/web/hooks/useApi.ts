'use client'

import { useAuth } from '@clerk/nextjs'
import { api, makeEventsApi, makeDeliveriesApi, makeDestinationsApi, makeFilterRulesApi, makeProjectsApi, makeOrganisationsApi, makeApiKeysApi } from '@/lib/api'

export function useApi() {
  const { getToken, isSignedIn } = useAuth()

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    return fn(token)
  }

  // Raw authenticated get — for ad-hoc calls
  function get<T>(url: string) {
    return withToken(t =>
      api.get<T>(url, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.data)
    )
  }

  const eventsApi = {
    list: (projectId: string, page = 1) =>
      withToken(t => makeEventsApi(t).list(projectId, page)),
    get: (id: string) =>
      withToken(t => makeEventsApi(t).get(id)),
  }

  const deliveriesApi = {
    forEvent: (eventId: string) =>
      withToken(t => makeDeliveriesApi(t).forEvent(eventId)),
    forDestination: (destinationId: string) =>
      withToken(t => makeDeliveriesApi(t).forDestination(destinationId)),
    replay: (eventId: string) =>
      withToken(t => makeDeliveriesApi(t).replay(eventId)),
  }

  const destinationsApi = {
    list: (projectId: string) =>
      withToken(t => makeDestinationsApi(t).list(projectId)),
    create: (data: { projectId: string; url: string; label?: string }) =>
      withToken(t => makeDestinationsApi(t).create(data)),
    toggle: (id: string, isActive: boolean) =>
      withToken(t => makeDestinationsApi(t).toggle(id, isActive)),
    delete: (id: string) =>
      withToken(t => makeDestinationsApi(t).delete(id)),
  }

  const filterRulesApi = {
    list: (destinationId: string) =>
      withToken(t => makeFilterRulesApi(t).list(destinationId)),
    create: (data: { destinationId: string; field: string; operator: string; value: string }) =>
      withToken(t => makeFilterRulesApi(t).create(data)),
    delete: (id: string) =>
      withToken(t => makeFilterRulesApi(t).delete(id)),
  }

  const projectsApi = {
    list: (orgId: string) =>
      withToken(t => makeProjectsApi(t).list(orgId)),
    create: (data: { name: string; environment: string; organisationId: string }) =>
      withToken(t => makeProjectsApi(t).create(data)),
    get: (id: string) =>
      withToken(t => makeProjectsApi(t).get(id)),
  }

  const organisationsApi = {
    list: () => withToken(t => makeOrganisationsApi(t).list()),
    getMembers: (orgId: string) => withToken(t => makeOrganisationsApi(t).getMembers(orgId)),
    addMember: (orgId: string, data: { userId: string; role: string }) =>
      withToken(t => makeOrganisationsApi(t).addMember(orgId, data)),
    removeMember: (orgId: string, memberId: string) =>
      withToken(t => makeOrganisationsApi(t).removeMember(orgId, memberId)),
  }

  const apiKeysApi = {
    list: () => withToken(t => makeApiKeysApi(t).list()),
    create: (data: { label?: string }) => withToken(t => makeApiKeysApi(t).create(data)),
    revoke: (id: string) => withToken(t => makeApiKeysApi(t).revoke(id)),
  }

  return {
    ready: !!isSignedIn,
    get,
    eventsApi,
    deliveriesApi,
    destinationsApi,
    filterRulesApi,
    projectsApi,
    organisationsApi,
    apiKeysApi,
  }
}