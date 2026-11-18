/**
 * Hosts can inject fixed bottom-right widgets into the page. Netlify (/.netlify/scripts/hud):
 *  - `iframe#nl-badge-frame` — public "Powered by Netlify" badge (free tier: cannot be hidden)
 *  - `iframe#nl-hud-frame`   — owner toolbar shown to the signed-in site owner (larger, resizes)
 * Both sit at z-index ~max over our primary buttons. We measure whichever is present and expose its
 * height as `--host-overlay-h`; the footers and cart dialog add that much bottom padding.
 * We never hide the host's widget. With no widget the value is 0.
 */
const OVERLAY_SELECTORS = ['#nl-badge-frame', '#nl-hud-frame']

export default defineNuxtPlugin(() => {
  const root = document.documentElement
  const watched = new WeakSet<Element>()
  let last = -1

  const update = () => {
    let h = 0
    for (const sel of OVERLAY_SELECTORS) {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) continue
      if (!watched.has(el)) {
        watched.add(el)
        resize.observe(el) // the widgets change their own size (expand/collapse)
        attrs.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
      }
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      // Only bottom-anchored overlays that leave most of the screen free matter.
      if (r.height > 0 && r.height < window.innerHeight * 0.5 && window.innerHeight - r.bottom < 24) {
        h = Math.max(h, Math.ceil(window.innerHeight - r.top))
      }
    }
    if (h !== last) {
      last = h
      root.style.setProperty('--host-overlay-h', `${h}px`)
    }
  }

  const resize = new ResizeObserver(update)
  const attrs = new MutationObserver(update)
  new MutationObserver(update).observe(document.body, { childList: true })
  window.addEventListener('resize', update, { passive: true })
  update()
})
