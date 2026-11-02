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

  function notifyHeight() {
    const height = Math.ceil(document.documentElement.scrollHeight)
    window.parent.postMessage({ type: 'agdforms:resize', height }, '*')
  }

  function watchHeight() {
    window.addEventListener('load', notifyHeight)
    window.addEventListener('resize', notifyHeight)

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(notifyHeight).observe(document.body)
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
