// Escape user-supplied text before interpolating it into HTML email bodies.
// Prevents stored/reflected HTML injection (fake links, tracking pixels, markup)
// from landing in recipients' inboxes. Use on every user-controlled value
// (names, prayers, locations, free text) in any email template.
export function escapeHtml(input: unknown): string {
  if (input == null) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
