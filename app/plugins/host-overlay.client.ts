/**
 * Some hosts inject a fixed corner widget into public pages (Netlify: the "Powered by Netlify"
 * badge, `iframe#nl-badge-frame`, 64 px tall, bottom-right). It would sit on top of our primary
 * buttons, so we measure it and expose its height as `--host-overlay-h`; the footers and the cart
 * dialog add that much bottom padding. We don't hide the host's widget. Without one, the value is 0.
 */
const OVERLAY_SELECTORS = ['#nl-badge-frame']

export default defineNuxtPlugin(() => {
  const root = document.documentElement
  let last = -1

  const update = () => {
    let h = 0
    for (const sel of OVERLAY_SELECTORS) {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      // Only overlays anchored to the bottom edge matter.
      if (r.height > 0 && Math.abs(r.bottom - window.innerHeight) < 4) h = Math.max(h, Math.ceil(r.height))
    }
    if (h !== last) {
      last = h
      root.style.setProperty('--host-overlay-h', `${h}px`)
    }
  }

  new MutationObserver(update).observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class'] })
  window.addEventListener('resize', update, { passive: true })
  update()
  // The widget can resize itself after it loads.
  setTimeout(update, 1500)
  setTimeout(update, 4000)
})
