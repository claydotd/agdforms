;(() => {
  const {
    resolveParent,
    injectParentStylesheet,
    injectParentHeightScript,
    notifyHeight,
    watchHeight,
    postForm,
  } = window.AgdForms

  const DEFAULT_PARENT = 'https://analoguegonedigital.co.uk/fombl'
  const SUBJECTS = [
    'volunteering',
    'membership',
    'newsletter',
    'general',
    'school-partnerships',
    'other',
  ]
  const FORM_BY_SUBJECT = {
    volunteering: 'fombl-volunteering',
    membership: 'fombl-membership',
    newsletter: 'fombl-secretary',
    general: 'fombl-secretary',
    other: 'fombl-secretary',
    'school-partnerships': 'fombl-schools',
  }

  const form = document.getElementById('enquiry-form')
  const formNameInput = document.getElementById('form-name')
  const success = document.getElementById('success')
  const subjectSelect = document.getElementById('enquiry-subject')
  const interestField = document.getElementById('interest-field')
  const interestSelect = document.getElementById('enquiry-interest')
  const subjectLineField = document.getElementById('subject-line-field')
  const subjectLineInput = document.getElementById('enquiry-subject-line')
  const errorEl = document.getElementById('form-error')
  const submitButton = document.getElementById('submit-button')
  const sendAnother = document.getElementById('send-another')

  const params = new URLSearchParams(window.location.search)
  const parentBase = resolveParent(DEFAULT_PARENT)
  const presetSubject = params.get('subject') || ''

  injectParentStylesheet(parentBase)
  injectParentHeightScript(parentBase)

  function setSubjectUI(subject) {
    const isVolunteering = subject === 'volunteering'
    const hasSubject = Boolean(subject)

    interestField.classList.toggle('is-hidden', !isVolunteering)
    interestSelect.required = isVolunteering
    if (!isVolunteering) {
      interestSelect.value = ''
      const emptyInterest = interestSelect.querySelector('option[value=""]')
      if (emptyInterest) emptyInterest.selected = true
    }

    subjectLineField.classList.toggle('is-hidden', !hasSubject || isVolunteering)
    subjectLineInput.required = hasSubject && !isVolunteering
    if (!hasSubject || isVolunteering) subjectLineInput.value = ''

    notifyHeight()
  }

  function applyPresetSubject() {
    if (!SUBJECTS.includes(presetSubject)) return
    subjectSelect.value = presetSubject
    const emptyOption = subjectSelect.querySelector('option[value=""]')
    if (emptyOption) emptyOption.selected = false
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

  applyPresetSubject()
  setSubjectUI(subjectSelect.value)

  subjectSelect.addEventListener('change', () => {
    setSubjectUI(subjectSelect.value)
  })

  sendAnother.addEventListener('click', () => {
    form.reset()
    applyPresetSubject()
    setSubjectUI(subjectSelect.value)
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

    const formName = FORM_BY_SUBJECT[subjectSelect.value]
    if (!formName) {
      showError('Please choose a subject.')
      notifyHeight()
      return
    }

    formNameInput.value = formName
    form.setAttribute('name', formName)

    submitButton.disabled = true
    submitButton.textContent = 'Sending…'

    try {
      await postForm(form)
      form.reset()
      applyPresetSubject()
      setSubjectUI(subjectSelect.value)
      showSuccess()
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Something went wrong sending your message. Please try again.',
      )
    } finally {
      submitButton.disabled = false
      submitButton.textContent = 'Send message'
      notifyHeight()
    }
  })

  watchHeight()
})()
