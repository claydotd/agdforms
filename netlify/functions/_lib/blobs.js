const { getStore, connectLambda } = require('@netlify/blobs')

const STORE_NAME = 'agdforms-availability'

function connectBlobs(event) {
  if (typeof event.blobs !== 'string' || !event.blobs) return
  const headers = {}
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (typeof value === 'string') headers[key] = value
    else if (Array.isArray(value) && value[0]) headers[key] = value[0]
  }
  connectLambda({ blobs: event.blobs, headers })
}

function getAvailabilityStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' })
}

function emptyPayload() {
  return { updatedAt: null, dates: [] }
}

module.exports = {
  STORE_NAME,
  connectBlobs,
  getAvailabilityStore,
  emptyPayload,
}
