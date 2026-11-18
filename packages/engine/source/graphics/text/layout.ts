import { Color } from '../primitives/color.js'
import { type Font } from '../resources/font.js'

/** Horizontal alignment of a laid out text. */
export enum TextAlignment {
  /** Lines start at the origin of the text box. */
  left = 'left',
  /** Lines are centred inside the text box. */
  center = 'center',
  /** Lines end at the box width, or at the longest line when there is no wrap. */
  right = 'right',
}

/** A piece of text drawn with its own font, size and color. */
export interface TextRun {
  /** Text of the run; `\n` starts a new paragraph. */
  readonly text: string
  /** Font of the run; defaults to the font of the layout. */
  readonly font?: Font | undefined
  /** Size of the run, in world units; defaults to the size of the layout. */
  readonly pixelSize?: number | undefined
  /** Color of the run; defaults to white, which the tint of the node multiplies. */
  readonly color?: Color | undefined
}

/** A text to lay out: one run, or many runs sharing a line. */
export type TextContent = string | readonly TextRun[]

/** Configuration for laying out text. */
export interface TextLayoutOptions {
  /** Horizontal alignment of the lines; defaults to left. */
  readonly align?: TextAlignment
  /** Size the glyphs are drawn at, in world units; defaults to the font design size. */
  readonly pixelSize?: number
  /** Width the lines wrap at, in world units; undefined keeps one line per paragraph. */
  readonly wrapWidth?: number | undefined
  /** Multiplier applied to the line height of the font; defaults to `1`. */
  readonly lineSpacing?: number
}

/** One glyph placed in a laid out text, in world units. */
export interface TextGlyphQuad {
  /** Character the glyph draws. */
  readonly character: string
  /** Left edge of the glyph, from the origin of the text box. */
  readonly x: number
  /** Top edge of the glyph, from the origin of the text box, growing downwards. */
  readonly y: number
  /** Width of the glyph bitmap. */
  readonly width: number
  /** Height of the glyph bitmap. */
  readonly height: number
  /** Normalized left edge of the glyph in the atlas. */
  readonly u0: number
  /** Normalized top edge of the glyph in the atlas. */
  readonly v0: number
  /** Normalized right edge of the glyph in the atlas. */
  readonly u1: number
  /** Normalized bottom edge of the glyph in the atlas. */
  readonly v1: number
  /** Color of the glyph, before the tint of the node. */
  readonly color: Color
  /** Font whose atlas the glyph samples. */
  readonly font: Font
}

/** Text placed in world units, ready to become geometry. */
export interface TextLayout {
  /** Glyphs to draw, in reading order. */
  readonly quads: readonly TextGlyphQuad[]
  /** Lines the text was broken into. */
  readonly lines: readonly string[]
  /** Width of the widest line, in world units. */
  readonly width: number
  /** Height of every line together, in world units. */
  readonly height: number
  /** Height of one line, in world units. */
  readonly lineHeight: number
  /** Distance from the top of the box to the baseline of the first line. */
  readonly baseline: number
}

/** A glyph with the style it draws with. */
interface StyledGlyph {
  readonly character: string
  readonly font: Font
  readonly scale: number
  readonly color: Color
}

/** A word and the space that follows it, with the style of every glyph. */
interface Word {
  readonly glyphs: readonly StyledGlyph[]
  readonly trailing: StyledGlyph | undefined
}

const newline = '\n'
const space = ' '

/**
 * Places the glyphs of a text without drawing them.
 *
 * The origin of the box is its top-left corner and the vertical axis grows
 * downwards, like the rest of the two-dimensional pipeline. Runs may change
 * font, size and color in the middle of a line, and lines break at spaces when a
 * wrap width is given.
 *
 * @param font - Font used by the runs that do not declare one.
 * @param content - Text to lay out, as a string or as runs.
 * @param options - Alignment, size, wrap width and line spacing.
 * @returns The glyphs, the lines and the size of the box.
 * @throws {@link RangeError} If a size, a spacing or a wrap width is invalid.
 */
export function layoutText(
  font: Font,
  content: TextContent,
  {
    align = TextAlignment.left,
    pixelSize = font.size,
    wrapWidth,
    lineSpacing = 1,
  }: TextLayoutOptions = {},
): TextLayout {
  if (!Number.isFinite(pixelSize) || pixelSize <= 0) {
    throw new RangeError('The text size must be finite and positive.')
  }

  if (!Number.isFinite(lineSpacing) || lineSpacing <= 0) {
    throw new RangeError('The text line spacing must be finite and positive.')
  }

  if (wrapWidth !== undefined && (!Number.isFinite(wrapWidth) || wrapWidth < 0)) {
    throw new RangeError('The text wrap width must be finite and non-negative.')
  }

  const lines = wrapRuns(font, content, pixelSize, wrapWidth)
  const quads: TextGlyphQuad[] = []
  const empty = font.lineHeight * (pixelSize / font.size) * lineSpacing
  const heights = lines.map((line) => lineHeightOf(line, lineSpacing, empty))
  const lineHeight = heights.length === 0 ? 0 : Math.max(...heights)
  const widest = lines.reduce((widest, line) => Math.max(widest, measureLine(line)), 0)
  const box = wrapWidth === undefined || wrapWidth === 0 ? widest : wrapWidth
  let top = 0
  let baseline = 0

  for (const [index, line] of lines.entries()) {
    const ascent = ascentOf(line, font.ascent * (pixelSize / font.size))
    const width = measureLine(line)
    const offset = alignOffset(align, width, box)
    baseline = top + ascent
    placeLine(quads, line, baseline, offset)
    top += heights[index] ?? lineHeight
  }

  return {
    quads,
    lines: lines.map((line) => line.map((glyph) => glyph.character).join('')),
    width: box,
    height: lines.length === 0 ? 0 : top,
    lineHeight,
    baseline,
  }
}

/**
 * Measures a text with the same rules used to lay it out.
 *
 * @param font - Font used by the runs that do not declare one.
 * @param content - Text to measure, as a string or as runs.
 * @param options - Alignment, size, wrap width and line spacing.
 * @returns The width and height the text occupies, in world units.
 */
export function measureText(
  font: Font,
  content: TextContent,
  options: TextLayoutOptions = {},
): { readonly width: number; readonly height: number } {
  const layout = layoutText(font, content, options)

  return { width: layout.width, height: layout.height }
}

function styleRuns(font: Font, content: TextContent, pixelSize: number): readonly StyledGlyph[][] {
  const runs: readonly TextRun[] = typeof content === 'string' ? [{ text: content }] : content

  return runs.map((run) => {
    const runFont = run.font ?? font
    const scale = (run.pixelSize ?? pixelSize) / runFont.size
    const color = run.color ?? Color.white

    return Array.from(run.text, (character) => ({ character, font: runFont, scale, color }))
  })
}

function wrapRuns(
  font: Font,
  content: TextContent,
  pixelSize: number,
  wrapWidth: number | undefined,
): readonly (readonly StyledGlyph[])[] {
  const lines: StyledGlyph[][] = []
  const paragraphs = splitParagraphs(styleRuns(font, content, pixelSize))

  for (const paragraph of paragraphs) {
    const words = toWords(paragraph)
    if (wrapWidth === undefined || wrapWidth === 0) {
      lines.push(words.flatMap((word) => [...word.glyphs, ...spaceGlyph(word)]))
      continue
    }

    let line: StyledGlyph[] = []
    for (const word of words) {
      const candidate = [...line, ...word.glyphs]
      if (line.length > 0 && measureLine(candidate) > wrapWidth) {
        lines.push(trimTrailing(line))
        line = [...word.glyphs]
      } else {
        line = candidate
      }

      line.push(...spaceGlyph(word))
    }

    lines.push(trimTrailing(line))
  }

  return lines
}

function splitParagraphs(runs: readonly StyledGlyph[][]): readonly (readonly StyledGlyph[])[] {
  const paragraphs: StyledGlyph[][] = []
  let current: StyledGlyph[] = []
  for (const run of runs) {
    for (const glyph of run) {
      if (glyph.character !== newline) {
        current.push(glyph)
        continue
      }

      paragraphs.push(current)
      current = []
    }
  }

  paragraphs.push(current)

  return paragraphs
}

function toWords(paragraph: readonly StyledGlyph[]): readonly Word[] {
  const words: Word[] = []
  let glyphs: StyledGlyph[] = []
  for (const glyph of paragraph) {
    if (glyph.character === space) {
      words.push({ glyphs, trailing: glyph })
      glyphs = []
      continue
    }

    glyphs.push(glyph)
  }

  words.push({ glyphs, trailing: undefined })

  return words
}

function spaceGlyph(word: Word): readonly StyledGlyph[] {
  return word.trailing === undefined ? [] : [word.trailing]
}

function trimTrailing(line: readonly StyledGlyph[]): StyledGlyph[] {
  const trimmed = [...line]
  while (trimmed.length > 0 && trimmed[trimmed.length - 1]?.character === space) trimmed.pop()

  return trimmed
}

function measureLine(line: readonly StyledGlyph[]): number {
  return line.reduce((width, glyph, index) => {
    const advance = (glyph.font.glyph(glyph.character)?.advance ?? 0) * glyph.scale
    const tracking = index === line.length - 1 ? 0 : glyph.font.tracking * glyph.scale

    return width + advance + tracking
  }, 0)
}

function lineHeightOf(line: readonly StyledGlyph[], lineSpacing: number, empty: number): number {
  const tallest = line.reduce(
    (height, glyph) => Math.max(height, glyph.font.lineHeight * glyph.scale),
    0,
  )

  return tallest === 0 ? empty : tallest * lineSpacing
}

function ascentOf(line: readonly StyledGlyph[], fallback: number): number {
  const ascent = line.reduce(
    (ascent, glyph) => Math.max(ascent, glyph.font.ascent * glyph.scale),
    0,
  )

  return ascent === 0 ? fallback : ascent
}

function alignOffset(align: TextAlignment, width: number, box: number): number {
  if (align === TextAlignment.left) return 0
  const free = Math.max(0, box - width)

  return align === TextAlignment.center ? free / 2 : free
}

function placeLine(
  quads: TextGlyphQuad[],
  line: readonly StyledGlyph[],
  baseline: number,
  offset: number,
): void {
  let pen = offset
  for (const [index, styled] of line.entries()) {
    const glyph = styled.font.glyph(styled.character)
    if (glyph === undefined) continue

    if (glyph.width > 0 && glyph.height > 0) {
      quads.push({
        character: styled.character,
        x: pen - glyph.left * styled.scale,
        y: baseline - glyph.top * styled.scale,
        width: glyph.width * styled.scale,
        height: glyph.height * styled.scale,
        u0: glyph.u0,
        v0: glyph.v0,
        u1: glyph.u1,
        v1: glyph.v1,
        color: styled.color,
        font: styled.font,
      })
    }

    const tracking = index === line.length - 1 ? 0 : styled.font.tracking * styled.scale
    pen += glyph.advance * styled.scale + tracking
  }
}
