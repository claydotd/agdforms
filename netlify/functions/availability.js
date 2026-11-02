/**
 * Public availability for embedded forms.
 *
 * Blob store: `agdforms-availability`
 * Key: site slug (e.g. `puzzle-and-plot`)
 *
 * Shape saved by the admin portal:
 * {
 *   "updatedAt": "2026-11-02T12:00:00.000Z",
 *   "dates": ["2026-11-15", "2026-11-22", "2026-12-06"]
 * }
 *
 * Dates are YYYY-MM-DD calendar days (no times).
 */

const {
  connectBlobs,
  getAvailabilityStore,
  emptyPayload,
} = require('./_lib/blobs')
const { normaliseDates } = require('./_lib/dates')

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  const site = (event.queryStringParameters?.site || '').trim()
  if (!site || !/^[a-z0-9-]+$/i.test(site)) {
    return json(400, { error: 'Missing or invalid site' })
  }

  try {
    connectBlobs(event)
    const store = getAvailabilityStore()
    const data = await store.get(site, { type: 'json' })
    if (!data || !Array.isArray(data.dates)) {
      return json(200, emptyPayload())
    }
    return json(200, {
      updatedAt: data.updatedAt || null,
      dates: normaliseDates(data.dates),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load availability'
    return json(500, { error: message })
  }
}
