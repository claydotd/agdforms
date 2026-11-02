const { listSites } = require('../../shared/sites')
const {
  authConfigured,
  checkPassword,
  createSessionToken,
  getSessionFromEvent,
  sessionCookieHeader,
  clearSessionCookieHeader,
} = require('./_lib/session')
const { json, readJsonBody } = require('./_lib/http')

exports.handler = async function handler(event) {
  if (event.httpMethod === 'GET') {
    if (!authConfigured()) {
      return json(503, { error: 'Admin auth is not configured' })
    }
    if (!getSessionFromEvent(event)) {
      return json(401, { error: 'Unauthorized' })
    }
    return json(200, { ok: true, sites: listSites() })
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!authConfigured()) {
    return json(503, { error: 'Admin auth is not configured' })
  }

  const body = readJsonBody(event)
  if (body === null) {
    return json(400, { error: 'Invalid JSON body' })
  }

  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'logout') {
    return json(
      200,
      { ok: true },
      { 'Set-Cookie': clearSessionCookieHeader() },
    )
  }

  if (action === 'login') {
    const password = typeof body.password === 'string' ? body.password : ''
    if (!checkPassword(password)) {
      return json(401, { error: 'Invalid password' })
    }

    let token
    try {
      token = createSessionToken()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session error'
      return json(503, { error: message })
    }

    return json(
      200,
      { ok: true, sites: listSites() },
      { 'Set-Cookie': sessionCookieHeader(token) },
    )
  }

  return json(400, { error: 'Unknown action' })
}
