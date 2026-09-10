import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

// The blog is a folder of markdown files, one per post, read at build time.
// No CMS, no database: a post is a file in content/blog, a draft is the same
// file with `draft: true`, and publishing is a commit. Frontmatter is the
// handful of fields search engines and the listing need.
//
// ---
// title: How to Pray for Someone by Name
// description: One-sentence summary used as the meta description (≤160 chars).
// date: 2026-09-15
// updated: 2026-09-20        (optional)
// tags: [prayer, how-to]     (optional)
// image: /blog/pray-by-name.jpg   (optional; falls back to the site card)
// draft: true                (optional; hidden everywhere until removed)
// ---

export type Post = {
  slug: string
  title: string
  description: string
  date: string        // ISO date (YYYY-MM-DD)
  updated: string | null
  tags: string[]
  image: string | null
  draft: boolean
  readingMinutes: number
  body: string        // raw markdown
}

const DIR = path.join(process.cwd(), 'content', 'blog')

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    data[key] = val
  }
  return { data, body: m[2] }
}

function parseList(v: string | undefined): string[] {
  if (!v) return []
  return v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
}

function load(file: string): Post | null {
  if (!file.endsWith('.md')) return null
  const slug = file.replace(/\.md$/, '')
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8')
  const { data, body } = parseFrontmatter(raw)
  if (!data.title || !data.date) return null
  const words = body.split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: data.title,
    description: data.description || '',
    date: data.date,
    updated: data.updated || null,
    tags: parseList(data.tags),
    image: data.image || null,
    draft: /^(true|yes)$/i.test(data.draft || ''),
    readingMinutes: Math.max(1, Math.round(words / 220)),
    body,
  }
}

// Published posts, newest first. Drafts and future-dated posts are left out
// so a post can be committed ahead of its date and go live on its own.
export function getAllPosts(): Post[] {
  if (!fs.existsSync(DIR)) return []
  const today = new Date().toISOString().slice(0, 10)
  return fs.readdirSync(DIR)
    .map(load)
    .filter((p): p is Post => !!p && !p.draft && p.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function getPost(slug: string): Post | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const file = path.join(DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const p = load(`${slug}.md`)
  if (!p || p.draft) return null
  return p
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { gfm: true, breaks: false }) as string
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
