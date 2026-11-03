/**
 * Known embed sites that can have availability managed in /admin.
 * Adding a client: append an entry (with passwordEnv) and ship their embed form.
 */
const sites = [
  {
    slug: 'puzzle-and-plot',
    name: 'Puzzle & Plot',
    passwordEnv: 'PUZZLE_ADMIN_PASSWORD',
  },
]

function getSite(slug) {
  if (typeof slug !== 'string') return null
  return sites.find((site) => site.slug === slug) || null
}

function isValidSite(slug) {
  return Boolean(getSite(slug))
}

function listSites() {
  return sites.map(({ slug, name }) => ({ slug, name }))
}

function getPasswordEnv(slug) {
  const site = getSite(slug)
  return site ? site.passwordEnv : null
}

module.exports = {
  sites,
  getSite,
  isValidSite,
  listSites,
  getPasswordEnv,
}
