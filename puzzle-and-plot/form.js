;(() => {
  const {
    resolveParent,
    injectParentStylesheet,
    notifyHeight,
    watchHeight,
    postForm,
    setParentLinks,
  } = window.AgdForms

  const DEFAULT_PARENT = 'https://analoguegonedigital.co.uk/puzzleandplot'
  const SERVICES = ['online', 'wedding', 'city-trail']

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

  const params = new URLSearchParams(window.location.search)
  const parentBase = resolveParent(DEFAULT_PARENT)
  const presetService = params.get('service') || ''

  injectParentStylesheet(parentBase)
  setParentLinks(parentBase, [
    [disclaimerLink, '/disclaimer'],
    [refundLink, '/refund-policy'],
  ])

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

  applyPresetService()
  setServiceUI(serviceSelect.value)

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
