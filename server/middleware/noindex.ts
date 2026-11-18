/** Private client demo — keep pages and API responses out of search engines (static files bypass middleware). */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
})
