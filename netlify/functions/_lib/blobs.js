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
  // Lambda-compat (`connectLambda`) only provides `edgeURL`, not
  // `uncachedEdgeURL`, so strong consistency throws BlobsConsistencyError.
  // Eventual consistency is fine here: admin PUT returns the written payload,
  // and the public availability response is already cached ~60s.
  return getStore({ name: STORE_NAME })
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
