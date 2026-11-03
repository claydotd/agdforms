/**
 * Authenticated availability read/write for the /admin portal.
 * Blob store: `agdforms-availability` (same as public GET).
 * Session is scoped to a single site.
 */

const { isValidSite } = require('../../shared/sites')
const {
  connectBlobs,
  getAvailabilityStore,
  emptyPayload,
} = require('./_lib/blobs')
const { normaliseDates } = require('./_lib/dates')
const { sessionSecretConfigured, getSessionFromEvent } = require('./_lib/session')
const { json, readJsonBody } = require('./_lib/http')

function requireSiteSession(event, site) {
  if (!sessionSecretConfigured()) {
    return { error: json(503, { error: 'Admin auth is not configured' }) }
  }
  const session = getSessionFromEvent(event)
  if (!session) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  if (!site || site !== session.site) {
    return { error: json(403, { error: 'Not allowed for this site' }) }
  }
  return { session }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'GET') {
    const site = (event.queryStringParameters?.site || '').trim()

    if (!isValidSite(site)) {
      return json(400, { error: 'Unknown site' })
    }

    const auth = requireSiteSession(event, site)
    if (auth.error) return auth.error

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

    const auth = requireSiteSession(event, site)
    if (auth.error) return auth.error

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
