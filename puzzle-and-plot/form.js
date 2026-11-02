;(() => {
  const {
    resolveParent,
    injectParentStylesheet,
    injectParentHeightScript,
    notifyHeight,
    watchHeight,
    postForm,
    setParentLinks,
  } = window.AgdForms

  const DEFAULT_PARENT = 'https://analoguegonedigital.co.uk/puzzleandplot'
  const SERVICES = ['online', 'wedding', 'city-trail']
  const SITE_SLUG = 'puzzle-and-plot'
  const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  const PICK_FORMAT = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
  })

  const form = document.getElementById('enquiry-form')
  const success = document.getElementById('success')
  const serviceSelect = document.getElementById('enquiry-service')
  const onlineGameField = document.getElementById('online-game-field')
  const onlineGameSelect = document.getElementById('enquiry-game')
  const weddingDepositField = document.getElementById('wedding-deposit-field')
  const weddingDepositInput = document.getElementById('enquiry-deposit')
  const errorEl = document.getElementById('form-error')
  const submitButton = document.getElementById('submit-button')
  const sendAnother = document.getElementById('send-another')
  const disclaimerLink = document.getElementById('disclaimer-link')
  const refundLink = document.getElementById('refund-link')
  const slotInput = document.getElementById('enquiry-slot')
  const availabilityMonthEl = document.getElementById('availability-month')
  const availabilityListEl = document.getElementById('availability-list')
  const availabilityStatusEl = document.getElementById('availability-status')
  const availabilityPrev = document.getElementById('availability-prev')
  const availabilityNext = document.getElementById('availability-next')

  const params = new URLSearchParams(window.location.search)
  const parentBase = resolveParent(DEFAULT_PARENT)
  const presetService = params.get('service') || ''

  /** @type {Set<string>} available YYYY-MM-DD dates from the blob */
  let availableDates = new Set()
  /** @type {string[]} YYYY-MM keys that contain at least one available date */
  let monthKeys = []
  let monthIndex = 0
  let selectedDate = ''

  injectParentStylesheet(parentBase)
  injectParentHeightScript(parentBase)
  setParentLinks(parentBase, [
    [disclaimerLink, '/disclaimer'],
    [refundLink, '/refund-policy'],
  ])

  function todayStamp() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function stampFromParts(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function monthKeyFromDate(dateStr) {
    return dateStr.slice(0, 7)
  }

  function parseMonthKey(key) {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }

  function formatPickLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return PICK_FORMAT.format(new Date(y, m - 1, d))
  }

  /** Monday-first index: Mon=0 … Sun=6 */
  function mondayFirstDow(date) {
    return (date.getDay() + 6) % 7
  }

  /** Local preview dates until the admin portal writes the Netlify blob. */
  function sampleDates() {
    const dates = []
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    cursor.setDate(cursor.getDate() + 1)

    for (let i = 0; i < 18; i += 1) {
      const dow = cursor.getDay()
      // Sample: Fri / Sat / Sun bookable
      if (dow === 5 || dow === 6 || dow === 0) {
        dates.push(
          stampFromParts(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()),
        )
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }

  function isLocalHost() {
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1'
  }

  function normaliseDates(rawDates) {
    const minDate = todayStamp()
    const unique = new Set()

    for (const entry of rawDates || []) {
      const date = typeof entry === 'string' ? entry : entry?.date
      if (typeof date !== 'string') continue
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      if (date < minDate) continue
      unique.add(date)
    }

    return [...unique].sort()
  }

  function indexDates(dates) {
    availableDates = new Set(dates)
    const months = new Set(dates.map(monthKeyFromDate))
    monthKeys = [...months].sort()
    monthIndex = 0
    selectedDate = ''
  }

  function setStatus(message, isEmpty = false) {
    availabilityStatusEl.textContent = message
    availabilityStatusEl.classList.toggle('is-hidden', !message)
    availabilityStatusEl.classList.toggle('availability__status--empty', isEmpty)
  }

  function selectDate(dateStr) {
    selectedDate = dateStr
    const label = formatPickLabel(dateStr)
    // Keep a trailing comma so they can type a time straight after.
    slotInput.value = `${label}, `
    slotInput.focus()
    const cursor = slotInput.value.length
    slotInput.setSelectionRange(cursor, cursor)
    renderMonth()
  }

  function renderMonth() {
    const key = monthKeys[monthIndex]
    availabilityListEl.innerHTML = ''

    if (!key) {
      availabilityMonthEl.textContent = ''
      availabilityPrev.disabled = true
      availabilityNext.disabled = true
      setStatus(
        'No bookable dates are listed right now. Tell me what you’re after below and I’ll check availability.',
        true,
      )
      notifyHeight()
      return
    }

    setStatus('')
    const first = parseMonthKey(key)
    const year = first.getFullYear()
    const month = first.getMonth()
    availabilityMonthEl.textContent = MONTH_FORMAT.format(first)
    availabilityPrev.disabled = monthIndex <= 0
    availabilityNext.disabled = monthIndex >= monthKeys.length - 1

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lead = mondayFirstDow(first)

    for (let i = 0; i < lead; i += 1) {
      const pad = document.createElement('span')
      pad.className = 'availability__cell availability__cell--pad'
      pad.setAttribute('aria-hidden', 'true')
      availabilityListEl.appendChild(pad)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = stampFromParts(year, month + 1, day)
      const isAvailable = availableDates.has(dateStr)
      const cell = document.createElement(isAvailable ? 'button' : 'span')
      cell.className = 'availability__cell'
      cell.textContent = String(day)

      if (isAvailable) {
        cell.type = 'button'
        cell.classList.add('availability__cell--available')
        if (dateStr === selectedDate) cell.classList.add('is-selected')
        cell.setAttribute('aria-label', formatPickLabel(dateStr))
        cell.setAttribute('aria-pressed', dateStr === selectedDate ? 'true' : 'false')
        cell.addEventListener('click', () => selectDate(dateStr))
      } else {
        cell.classList.add('availability__cell--unavailable')
        cell.setAttribute('aria-hidden', 'true')
      }

      availabilityListEl.appendChild(cell)
    }

    notifyHeight()
  }

  async function loadAvailability() {
    let dates = []

    try {
      const response = await fetch(
        `/.netlify/functions/availability?site=${encodeURIComponent(SITE_SLUG)}`,
      )
      if (response.ok) {
        const data = await response.json()
        dates = normaliseDates(data.dates)
      }
    } catch {
      // Fall through to sample / empty.
    }

    if (!dates.length && isLocalHost()) {
      dates = normaliseDates(sampleDates())
    }

    indexDates(dates)
    renderMonth()
  }

  function setServiceUI(service) {
    const isOnline = service === 'online'
    const isWedding = service === 'wedding'

    onlineGameField.classList.toggle('is-hidden', !isOnline)
    onlineGameSelect.required = isOnline
    if (!isOnline) onlineGameSelect.value = ''

    weddingDepositField.classList.toggle('is-hidden', !isWedding)
    weddingDepositInput.required = isWedding
    if (!isWedding) weddingDepositInput.checked = false

    notifyHeight()
  }

  function showForm() {
    success.classList.add('is-hidden')
    form.classList.remove('is-hidden')
    notifyHeight()
  }

  function showSuccess() {
    form.classList.add('is-hidden')
    success.classList.remove('is-hidden')
    notifyHeight()
  }

  function showError(message) {
    errorEl.textContent = message
    errorEl.classList.remove('is-hidden')
    notifyHeight()
  }

  function clearError() {
    errorEl.textContent = ''
    errorEl.classList.add('is-hidden')
  }

  function applyPresetService() {
    if (!SERVICES.includes(presetService)) return
    serviceSelect.value = presetService
    const emptyOption = serviceSelect.querySelector('option[value=""]')
    if (emptyOption) emptyOption.selected = false
  }

  availabilityPrev.addEventListener('click', () => {
    if (monthIndex <= 0) return
    monthIndex -= 1
    renderMonth()
  })

  availabilityNext.addEventListener('click', () => {
    if (monthIndex >= monthKeys.length - 1) return
    monthIndex += 1
    renderMonth()
  })

  applyPresetService()
  setServiceUI(serviceSelect.value)
  loadAvailability()

  serviceSelect.addEventListener('change', () => {
    setServiceUI(serviceSelect.value)
  })

  sendAnother.addEventListener('click', () => {
    form.reset()
    applyPresetService()
    setServiceUI(serviceSelect.value)
    clearError()
    showForm()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearError()

    if (!form.reportValidity()) {
      notifyHeight()
      return
    }

    submitButton.disabled = true
    submitButton.textContent = 'Sending…'

    try {
      await postForm(form)
      form.reset()
      applyPresetService()
      setServiceUI(serviceSelect.value)
      showSuccess()
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Something went wrong sending your enquiry. Please try again.',
      )
    } finally {
      submitButton.disabled = false
      submitButton.textContent = 'Send enquiry'
      notifyHeight()
    }
  })

  watchHeight()
})()
