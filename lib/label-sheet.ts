import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'

// Avery 5160 on US Letter, in PDF points (72 per inch). These are the published
// Avery dimensions, not measurements off a printed sheet — a printer set to
// "fit to page" or "shrink oversized" will still land off-register, so print at
// 100% / actual size.
export const AVERY_5160 = {
  name: 'Avery 5160',
  page: { width: 612, height: 792 },   // 8.5" x 11"
  label: { width: 189, height: 72 },   // 2.625" x 1"
  margin: { left: 13.5, top: 36 },     // 0.1875" , 0.5"
  pitch: { x: 198, y: 72 },            // label + 0.125" gutter, no vertical gap
  columns: 3,
  rows: 10,
} as const

export const LABELS_PER_SHEET = AVERY_5160.columns * AVERY_5160.rows

export type LabelAddress = {
  name?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

// The lines actually printed on one label, in order, blanks dropped.
export function addressLines(a: LabelAddress): string[] {
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  // Domestic mail does not want a country line, and the label is short on room.
  const country = a.country && a.country.toUpperCase() !== 'US' && a.country.toUpperCase() !== 'USA'
    ? a.country
    : null
  return [a.name, a.line1, a.line2, cityLine, country]
    .map(v => (v || '').trim())
    .filter(Boolean)
}

// Shrink a line until it fits the label, then hard-truncate with an ellipsis as
// a last resort. A clipped address is worse than a small one, but a line that
// silently overprints the next label is worse than both.
function fitLine(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let s = text
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxWidth) s = s.slice(0, -1)
  return s + '…'
}

export type SheetLabel = { address: LabelAddress; note?: string }

/**
 * Lay labels onto Avery 5160 sheets and return the PDF bytes.
 *
 * `startAt` is a 1-based label position, so a part-used sheet can be reloaded
 * and printed from the first blank label rather than being thrown away.
 */
export async function buildLabelSheet(labels: SheetLabel[], startAt = 1): Promise<Uint8Array> {
  const G = AVERY_5160
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const skip = Math.min(Math.max(0, Math.floor(startAt) - 1), LABELS_PER_SHEET - 1)
  const slots = skip + labels.length
  const sheets = Math.max(1, Math.ceil(slots / LABELS_PER_SHEET))

  const pages = Array.from({ length: sheets }, () => pdf.addPage([G.page.width, G.page.height]))
  const padX = 9
  const padY = 8

  labels.forEach((label, i) => {
    const slot = skip + i
    const page = pages[Math.floor(slot / LABELS_PER_SHEET)]
    const within = slot % LABELS_PER_SHEET
    const row = Math.floor(within / G.columns)
    const col = within % G.columns

    const x = G.margin.left + col * G.pitch.x
    // PDF's origin is bottom-left; rows count down from the top of the sheet.
    const yTop = G.page.height - G.margin.top - row * G.pitch.y

    const lines = addressLines(label.address)
    if (lines.length === 0) return

    // Four lines is the common case and sits comfortably at 9pt. Five needs 8pt
    // to keep the last line off the label edge.
    const size = lines.length >= 5 ? 8 : 9
    const leading = size + 2.4
    const blockHeight = lines.length * leading
    let y = yTop - Math.max(padY, (G.label.height - blockHeight) / 2) - size

    const maxWidth = G.label.width - padX * 2

    lines.forEach((line, li) => {
      page.drawText(fitLine(line, li === 0 ? bold : font, size, maxWidth), {
        x: x + padX,
        y,
        size,
        font: li === 0 ? bold : font,
        color: rgb(0.08, 0.13, 0.23),
      })
      y -= leading
    })
  })

  return pdf.save()
}

/**
 * A plain-paper alignment sheet: every label position outlined and numbered.
 *
 * Print it, hold it up to a real sheet of 5160s against a window, and the boxes
 * should sit on the die-cut labels. Cheaper than discovering the drift on a
 * sheet of actual labels, and it doubles as the position guide for `startAt`.
 */
export async function buildCalibrationSheet(): Promise<Uint8Array> {
  const G = AVERY_5160
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage([G.page.width, G.page.height])

  for (let i = 0; i < LABELS_PER_SHEET; i++) {
    const row = Math.floor(i / G.columns)
    const col = i % G.columns
    const x = G.margin.left + col * G.pitch.x
    const yTop = G.page.height - G.margin.top - row * G.pitch.y

    page.drawRectangle({
      x,
      y: yTop - G.label.height,
      width: G.label.width,
      height: G.label.height,
      borderColor: rgb(0.6, 0.66, 0.74),
      borderWidth: 0.5,
    })
    page.drawText(String(i + 1), {
      x: x + 9,
      y: yTop - 20,
      size: 12,
      font,
      color: rgb(0.35, 0.42, 0.52),
    })
  }

  page.drawText('Avery 5160 alignment check — print at 100% / actual size', {
    x: G.margin.left,
    y: 18,
    size: 8,
    font,
    color: rgb(0.5, 0.55, 0.62),
  })

  return pdf.save()
}
