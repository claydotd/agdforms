const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateStamp(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/** Unique, sorted YYYY-MM-DD strings. Invalid entries dropped. */
function normaliseDates(rawDates) {
  const unique = new Set()
  for (const entry of rawDates || []) {
    const date = typeof entry === 'string' ? entry : entry?.date
    if (!isValidDateStamp(date)) continue
    unique.add(date)
  }
  return [...unique].sort()
}

module.exports = {
  isValidDateStamp,
  normaliseDates,
}
