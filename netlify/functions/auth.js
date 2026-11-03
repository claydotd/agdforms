const { listSites, getSite, isValidSite } = require('../../shared/sites')
const {
  sessionSecretConfigured,
  checkSitePassword,
  sitePasswordConfigured,
  createSessionToken,
  getSessionFromEvent,
  sessionCookieHeader,
  clearSessionCookieHeader,
} = require('./_lib/session')
const { json, readJsonBody } = require('./_lib/http')

exports.handler = async function handler(event) {
  if (event.httpMethod === 'GET') {
    // Public site list for the login dropdown.
    const sites = listSites()
    const session = sessionSecretConfigured() ? getSessionFromEvent(event) : null

    if (!session) {
      return json(200, { ok: false, sites })
    }

    const site = getSite(session.site)
    return json(200, {
      ok: true,
      site: session.site,
      siteName: site ? site.name : session.site,
      sites,
    })
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
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
    if (!sessionSecretConfigured()) {
      return json(503, { error: 'Admin auth is not configured' })
    }

    const site = typeof body.site === 'string' ? body.site.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!isValidSite(site)) {
      return json(400, { error: 'Unknown site' })
    }

    if (!sitePasswordConfigured(site)) {
      return json(503, { error: 'This site’s admin password is not configured' })
    }

    if (!checkSitePassword(site, password)) {
      return json(401, { error: 'Invalid password' })
    }

    let token
    try {
      token = createSessionToken(site)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session error'
      return json(503, { error: message })
    }

    const siteInfo = getSite(site)
    return json(
      200,
      {
        ok: true,
        site,
        siteName: siteInfo ? siteInfo.name : site,
        sites: listSites(),
      },
      { 'Set-Cookie': sessionCookieHeader(token) },
    )
  }

  return json(400, { error: 'Unknown action' })
}
