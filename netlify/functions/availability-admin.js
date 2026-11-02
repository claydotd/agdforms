/**
 * Authenticated availability read/write for the /admin portal.
 * Blob store: `agdforms-availability` (same as public GET).
 */

const { isValidSite, listSites } = require('../../shared/sites')
const {
  connectBlobs,
  getAvailabilityStore,
  emptyPayload,
} = require('./_lib/blobs')
const { normaliseDates } = require('./_lib/dates')
const { authConfigured, getSessionFromEvent } = require('./_lib/session')
const { json, readJsonBody } = require('./_lib/http')

function requireAuth(event) {
  if (!authConfigured()) {
    return json(503, { error: 'Admin auth is not configured' })
  }
  if (!getSessionFromEvent(event)) {
    return json(401, { error: 'Unauthorized' })
  }
  return null
}

exports.handler = async function handler(event) {
  const denied = requireAuth(event)
  if (denied) return denied

  if (event.httpMethod === 'GET') {
    const site = (event.queryStringParameters?.site || '').trim()

    if (!site) {
      return json(200, { sites: listSites() })
    }

    if (!isValidSite(site)) {
      return json(400, { error: 'Unknown site' })
    }

    try {
      connectBlobs(event)
      const store = getAvailabilityStore()
      const data = await store.get(site, { type: 'json' })
      if (!data || !Array.isArray(data.dates)) {
        return json(200, { site, ...emptyPayload() })
      }
      return json(200, {
        site,
        updatedAt: data.updatedAt || null,
        dates: normaliseDates(data.dates),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load availability'
      return json(500, { error: message })
    }
  }

  if (event.httpMethod === 'PUT') {
    const body = readJsonBody(event)
    if (body === null) {
      return json(400, { error: 'Invalid JSON body' })
    }

    const site = typeof body.site === 'string' ? body.site.trim() : ''
    if (!isValidSite(site)) {
      return json(400, { error: 'Unknown site' })
    }

    if (!Array.isArray(body.dates)) {
      return json(400, { error: 'dates must be an array' })
    }

    const dates = normaliseDates(body.dates)
    const payload = {
      updatedAt: new Date().toISOString(),
      dates,
    }

    try {
      connectBlobs(event)
      const store = getAvailabilityStore()
      await store.setJSON(site, payload)
      return json(200, { site, ...payload })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save availability'
      return json(500, { error: message })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
