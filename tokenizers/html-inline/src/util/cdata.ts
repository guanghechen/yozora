import type { NodePoint } from '@yozora/character'
import { AsciiCodePoint } from '@yozora/character'
import type { YastTokenDelimiter } from '@yozora/core-tokenizer'

export interface HtmlInlineCDataData {
  htmlType: 'cdata'
}

export interface HtmlInlineCDataTokenData {
  htmlType: 'cdata'
}

export interface HtmlInlineCDataDelimiter
  extends YastTokenDelimiter,
    HtmlInlineCDataTokenData {
  type: 'full'
}

/**
 * A CDATA section consists of the string `<![CDATA[`, a string of characters
 * not including the string `]]>`, and the string `]]>`.
 *
 * @param nodePoints
 * @param startIndex
 * @param endIndex
 * @see https://github.github.com/gfm/#cdata-section
 */
export function eatHtmlInlineCDataDelimiter(
  nodePoints: ReadonlyArray<NodePoint>,
  startIndex: number,
  endIndex: number,
): HtmlInlineCDataDelimiter | null {
  let i = startIndex
  if (
    i + 11 >= endIndex ||
    nodePoints[i + 1].codePoint !== AsciiCodePoint.EXCLAMATION_MARK ||
    nodePoints[i + 2].codePoint !== AsciiCodePoint.OPEN_BRACKET ||
    nodePoints[i + 3].codePoint !== AsciiCodePoint.UPPERCASE_C ||
    nodePoints[i + 4].codePoint !== AsciiCodePoint.UPPERCASE_D ||
    nodePoints[i + 5].codePoint !== AsciiCodePoint.UPPERCASE_A ||
    nodePoints[i + 6].codePoint !== AsciiCodePoint.UPPERCASE_T ||
    nodePoints[i + 7].codePoint !== AsciiCodePoint.UPPERCASE_A ||
    nodePoints[i + 8].codePoint !== AsciiCodePoint.OPEN_BRACKET
  )
    return null

  const si = i + 9
  for (i = si; i < endIndex; ++i) {
    const p = nodePoints[i]
    if (p.codePoint !== AsciiCodePoint.CLOSE_BRACKET) continue
    if (i + 2 >= endIndex) return null
    if (
      nodePoints[i + 1].codePoint === AsciiCodePoint.CLOSE_BRACKET &&
      nodePoints[i + 2].codePoint === AsciiCodePoint.CLOSE_ANGLE
    ) {
      const delimiter: HtmlInlineCDataDelimiter = {
        type: 'full',
        startIndex,
        endIndex: i + 3,
        htmlType: 'cdata',
      }
      return delimiter
    }
  }
  return null
}
