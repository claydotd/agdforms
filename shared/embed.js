;(() => {
  function resolveParent(defaultParent) {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('parent') || ''
    return (fromQuery || defaultParent || '').replace(/\/$/, '')
  }

  function injectParentStylesheet(parentBase) {
    if (!parentBase) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${parentBase}/embed/form.css`
    document.head.appendChild(link)
  }

  function injectParentHeightScript(parentBase) {
    if (!parentBase) return
    const script = document.createElement('script')
    script.src = `${parentBase}/embed/form-height.js`
    script.async = true
    document.head.appendChild(script)
  }

  function contentHeight() {
    const visible = [...document.querySelectorAll('.enquiry-form')].find(
      (el) => !el.classList.contains('is-hidden'),
    )
    const target = visible || document.body
    if (!target) return 0

    const rect = target.getBoundingClientRect()
    const styles = getComputedStyle(target)
    const margin =
      (parseFloat(styles.marginTop) || 0) + (parseFloat(styles.marginBottom) || 0)

    // Prefer the form/root box over documentElement.scrollHeight — the latter
    // collapses to the iframe viewport when the frame is shorter than content.
    return Math.ceil(
      Math.max(target.scrollHeight, target.offsetHeight, rect.height) + margin,
    )
  }

  function notifyHeight() {
    window.parent.postMessage(
      { type: 'agdforms:resize', height: Math.max(contentHeight(), 1) },
      '*',
    )
  }

  function watchHeight() {
    window.addEventListener('load', notifyHeight)
    window.addEventListener('resize', notifyHeight)

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(notifyHeight)
      if (document.body) ro.observe(document.body)
      for (const el of document.querySelectorAll('.enquiry-form')) ro.observe(el)
    }

    notifyHeight()
  }

  async function postForm(form) {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    })

    if (!response.ok) {
      throw new Error('Something went wrong sending your enquiry. Please try again.')
    }

    return response
  }

  function setParentLinks(parentBase, links) {
    if (!parentBase || !links) return
    for (const [el, path] of links) {
      if (el) el.href = `${parentBase}${path}`
    }
  }

  window.AgdForms = {
    resolveParent,
    injectParentStylesheet,
    injectParentHeightScript,
    notifyHeight,
    watchHeight,
    postForm,
    setParentLinks,
  }
})()
