const crypto = require('crypto')
const { getPasswordEnv, isValidSite } = require('../../../shared/sites')

const COOKIE_NAME = 'agdforms_admin'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || ''
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a), 'utf8')
  const right = Buffer.from(String(b), 'utf8')
  if (left.length !== right.length) {
    // Still compare to avoid leaking length via timing on short-circuit alone.
    crypto.timingSafeEqual(left, left)
    return false
  }
  return crypto.timingSafeEqual(left, right)
}

function getSitePassword(slug) {
  const envName = getPasswordEnv(slug)
  if (!envName) return ''
  return process.env[envName] || ''
}

function checkSitePassword(slug, candidate) {
  const expected = getSitePassword(slug)
  if (!expected) return false
  return timingSafeEqualString(candidate, expected)
}

function sitePasswordConfigured(slug) {
  return Boolean(getSitePassword(slug))
}

function sign(payloadB64) {
  const secret = getSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured')
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
}

function createSessionToken(site) {
  if (!isValidSite(site)) throw new Error('Invalid site')
  const payload = {
    v: 2,
    site,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

/** @returns {{ site: string } | null} */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  const secret = getSecret()
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts

  let expected
  try {
    expected = sign(payloadB64)
  } catch {
    return null
  }
  if (!timingSafeEqualString(signature, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (!payload || payload.v !== 2) return null
    if (typeof payload.exp !== 'number') return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!isValidSite(payload.site)) return null
    return { site: payload.site }
  } catch {
    return null
  }
}

function parseCookies(header) {
  const out = {}
  if (!header || typeof header !== 'string') return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

/** @returns {{ site: string } | null} */
function getSessionFromEvent(event) {
  const raw =
    event.headers?.cookie ||
    event.headers?.Cookie ||
    (Array.isArray(event.multiValueHeaders?.cookie)
      ? event.multiValueHeaders.cookie.join(';')
      : '')
  const cookies = parseCookies(raw)
  return verifySessionToken(cookies[COOKIE_NAME])
}

function useSecureCookie() {
  // netlify dev serves over http://localhost — Secure would drop the cookie.
  return process.env.NETLIFY_DEV !== 'true'
}

function sessionCookieHeader(token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (useSecureCookie()) parts.push('Secure')
  return parts.join('; ')
}

function clearSessionCookieHeader() {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (useSecureCookie()) parts.push('Secure')
  return parts.join('; ')
}

function sessionSecretConfigured() {
  return Boolean(getSecret())
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  checkSitePassword,
  sitePasswordConfigured,
  createSessionToken,
  verifySessionToken,
  getSessionFromEvent,
  sessionCookieHeader,
  clearSessionCookieHeader,
  sessionSecretConfigured,
}
