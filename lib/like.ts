// Escape a value for use in a PostgREST `like` / `ilike` pattern so it matches
// literally. `_` matches any single character and `%` any run, and both are
// legal in email addresses — so `.ilike('customer_email', 'j_hn@x.com')` would
// match john@x.com's orders. Callers that want case-insensitive equality on an
// email must go through this.
export function likeLiteral(s: string): string {
  return String(s).replace(/[\\%_]/g, '\\$&')
}
