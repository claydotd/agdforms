;(() => {
  const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const loginPanel = document.getElementById('login-panel')
  const editorPanel = document.getElementById('editor-panel')
  const loginForm = document.getElementById('login-form')
  const loginSite = document.getElementById('login-site')
  const loginError = document.getElementById('login-error')
  const loginSubmit = document.getElementById('login-submit')
  const logoutBtn = document.getElementById('logout-btn')
  const siteNameEl = document.getElementById('site-name')
  const reloadBtn = document.getElementById('reload-btn')
  const saveBtn = document.getElementById('save-btn')
  const monthPrev = document.getElementById('month-prev')
  const monthNext = document.getElementById('month-next')
  const monthLabel = document.getElementById('month-label')
  const calendarGrid = document.getElementById('calendar-grid')
  const editorMeta = document.getElementById('editor-meta')
  const editorStatus = document.getElementById('editor-status')

  /** @type {Set<string>} */
  let selectedDates = new Set()
  /** @type {string | null} */
  let updatedAt = null
  let dirty = false
  let activeSite = ''
  let activeSiteName = ''

  const view = new Date()
  view.setDate(1)
  view.setHours(12, 0, 0, 0)

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

  /** Monday-first: Mon=0 … Sun=6 */
  function mondayFirstDow(date) {
    return (date.getDay() + 6) % 7
  }

  function showLoginError(message) {
    loginError.textContent = message || ''
    loginError.classList.toggle('is-hidden', !message)
  }

  function showEditorStatus(message, kind) {
    editorStatus.textContent = message || ''
    editorStatus.classList.toggle('is-hidden', !message)
    editorStatus.classList.toggle('status--error', kind === 'error')
    editorStatus.classList.toggle('status--ok', kind === 'ok')
  }

  function setAuthed(authed) {
    loginPanel.classList.toggle('is-hidden', authed)
    editorPanel.classList.toggle('is-hidden', !authed)
    logoutBtn.classList.toggle('is-hidden', !authed)
  }

  function fillLoginSites(list) {
    const previous = loginSite.value
    loginSite.innerHTML = ''
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.disabled = true
    placeholder.textContent = 'Choose a site…'
    loginSite.appendChild(placeholder)

    for (const site of list || []) {
      const option = document.createElement('option')
      option.value = site.slug
      option.textContent = site.name
      loginSite.appendChild(option)
    }

    if (previous && [...loginSite.options].some((o) => o.value === previous)) {
      loginSite.value = previous
    } else {
      placeholder.selected = true
    }
  }

  function updateMeta() {
    const count = selectedDates.size
    const saved = updatedAt
      ? `Last saved ${new Date(updatedAt).toLocaleString('en-GB')}`
      : 'Not saved yet'
    const dirtyNote = dirty ? ' · unsaved changes' : ''
    editorMeta.textContent = `${count} bookable date${count === 1 ? '' : 's'} · ${saved}${dirtyNote}`
  }

  function renderCalendar() {
    const year = view.getFullYear()
    const month = view.getMonth()
    monthLabel.textContent = MONTH_FORMAT.format(view)
    calendarGrid.innerHTML = ''

    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lead = mondayFirstDow(first)
    const minDate = todayStamp()

    for (let i = 0; i < lead; i += 1) {
      const pad = document.createElement('span')
      pad.className = 'day day--pad'
      pad.setAttribute('aria-hidden', 'true')
      calendarGrid.appendChild(pad)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = stampFromParts(year, month + 1, day)
      const isPast = dateStr < minDate
      const isOn = selectedDates.has(dateStr)
      const cell = document.createElement(isPast ? 'span' : 'button')
      cell.className = 'day'
      cell.textContent = String(day)

      if (isPast) {
        cell.classList.add('day--past')
        if (isOn) cell.classList.add('day--on')
        cell.setAttribute('aria-hidden', 'true')
      } else {
        cell.type = 'button'
        cell.classList.add('day--toggle')
        if (isOn) cell.classList.add('day--on')
        cell.setAttribute('aria-pressed', isOn ? 'true' : 'false')
        cell.setAttribute('aria-label', `${dateStr}${isOn ? ', bookable' : ''}`)
        cell.addEventListener('click', () => {
          if (selectedDates.has(dateStr)) selectedDates.delete(dateStr)
          else selectedDates.add(dateStr)
          dirty = true
          showEditorStatus('')
          updateMeta()
          renderCalendar()
        })
      }

      calendarGrid.appendChild(cell)
    }
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const message = data?.error || `Request failed (${response.status})`
      const error = new Error(message)
      error.status = response.status
      throw error
    }

    return data
  }

  async function enterEditor(site, siteName) {
    activeSite = site
    activeSiteName = siteName || site
    siteNameEl.textContent = activeSiteName
    setAuthed(true)
    await loadAvailability()
  }

  async function loadAvailability() {
    if (!activeSite) return

    showEditorStatus('Loading…')
    saveBtn.disabled = true
    reloadBtn.disabled = true

    try {
      const data = await api(
        `/.netlify/functions/availability-admin?site=${encodeURIComponent(activeSite)}`,
      )
      selectedDates = new Set(data.dates || [])
      updatedAt = data.updatedAt || null
      dirty = false
      showEditorStatus('')
      updateMeta()
      renderCalendar()
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setAuthed(false)
        showLoginError('Session expired. Please log in again.')
        return
      }
      showEditorStatus(error.message || 'Failed to load', 'error')
    } finally {
      saveBtn.disabled = false
      reloadBtn.disabled = false
    }
  }

  async function saveAvailability() {
    if (!activeSite) return

    showEditorStatus('Saving…')
    saveBtn.disabled = true

    try {
      const data = await api('/.netlify/functions/availability-admin', {
        method: 'PUT',
        body: JSON.stringify({
          site: activeSite,
          dates: [...selectedDates].sort(),
        }),
      })
      selectedDates = new Set(data.dates || [])
      updatedAt = data.updatedAt || null
      dirty = false
      showEditorStatus('Saved.', 'ok')
      updateMeta()
      renderCalendar()
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setAuthed(false)
        showLoginError('Session expired. Please log in again.')
        return
      }
      showEditorStatus(error.message || 'Failed to save', 'error')
    } finally {
      saveBtn.disabled = false
    }
  }

  async function bootstrap() {
    try {
      const data = await api('/.netlify/functions/auth')
      fillLoginSites(data.sites)
      if (data.ok && data.site) {
        await enterEditor(data.site, data.siteName)
      } else {
        setAuthed(false)
      }
    } catch {
      setAuthed(false)
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    showLoginError('')
    loginSubmit.disabled = true

    const form = new FormData(loginForm)
    const site = String(form.get('site') || '')
    const password = form.get('password')

    try {
      const data = await api('/.netlify/functions/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', site, password }),
      })
      loginForm.reset()
      fillLoginSites(data.sites)
      await enterEditor(data.site, data.siteName)
    } catch (error) {
      showLoginError(error.message || 'Login failed')
    } finally {
      loginSubmit.disabled = false
    }
  })

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/.netlify/functions/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch {
      // Still clear the UI.
    }
    selectedDates = new Set()
    updatedAt = null
    dirty = false
    activeSite = ''
    activeSiteName = ''
    siteNameEl.textContent = ''
    setAuthed(false)
    showLoginError('')
  })

  reloadBtn.addEventListener('click', () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    loadAvailability()
  })

  saveBtn.addEventListener('click', () => {
    saveAvailability()
  })

  monthPrev.addEventListener('click', () => {
    view.setMonth(view.getMonth() - 1)
    renderCalendar()
  })

  monthNext.addEventListener('click', () => {
    view.setMonth(view.getMonth() + 1)
    renderCalendar()
  })

  bootstrap()
})()
