// The one list of Prayer Bands social accounts. The site footer, the app's
// Account tab, and the "tag us" nudges all read from here, so a handle
// changes in one place.
export type Social = { key: string; label: string; handle: string; url: string }

export const SOCIAL: Social[] = [
  { key: 'instagram', label: 'Instagram', handle: '@prayer_bands', url: 'https://instagram.com/prayer_bands' },
  { key: 'facebook', label: 'Facebook', handle: '@prayerbands', url: 'https://facebook.com/prayerbands' },
  { key: 'pinterest', label: 'Pinterest', handle: '@prayerbands', url: 'https://pinterest.com/prayerbands' },
  { key: 'tiktok', label: 'TikTok', handle: '@prayerbands', url: 'https://tiktok.com/@prayerbands' },
  { key: 'youtube', label: 'YouTube', handle: '@prayerbands', url: 'https://youtube.com/@prayerbands' },
  { key: 'x', label: 'X', handle: '@prayerbands', url: 'https://twitter.com/prayerbands' },
]

// The handle to say out loud when asking people to tag a post.
export const TAG_HANDLE = '@prayer_bands'
