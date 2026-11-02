/**
 * Known embed sites that can have availability managed in /admin.
 * Adding a client: append an entry here and ship their embed form.
 */
const sites = [
  { slug: 'puzzle-and-plot', name: 'Puzzle & Plot' },
]

function isValidSite(slug) {
  if (typeof slug !== 'string') return false
  return sites.some((site) => site.slug === slug)
}

function listSites() {
  return sites.map(({ slug, name }) => ({ slug, name }))
}

module.exports = {
  sites,
  isValidSite,
  listSites,
}
