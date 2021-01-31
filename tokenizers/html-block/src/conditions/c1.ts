import type { EnhancedYastNodePoint } from '@yozora/tokenizercore'
import { AsciiCodePoint, isWhiteSpaceCharacter } from '@yozora/character'
import {
  calcStringFromNodePoints,
  eatHTMLTagName,
} from '@yozora/tokenizercore'


const includedTags = ['pre', 'script', 'style']


/**
 * Eat block html start condition 1:
 *
 *    line begins with the string `<script`, `<pre`, or
 *    `<style` (case-insensitive), followed by whitespace, the string `>`,
 *    or the end of the line.
 *
 * @param nodePoints
 * @param startIndex
 * @param endIndex
 * @see https://github.github.com/gfm/#start-condition
 */
export function eatStartCondition1(
  nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  startIndex: number,
  endIndex: number,
  tagName: string,
): number | null {
  if (!includedTags.includes(tagName)) return null
  if (startIndex >= endIndex) return endIndex

  const c = nodePoints[startIndex].codePoint
  if (isWhiteSpaceCharacter(c) || c === AsciiCodePoint.CLOSE_ANGLE) {
    return startIndex + 1
  }
  return null
}


/**
 * Eat block html end condition 1:
 *
 *    line contains an end tag `</script>`, `</pre>`,
 *    or `</style>` (case-insensitive; it need not match the start tag).
 *
 * @param nodePoints
 * @param startIndex
 * @param endIndex
 * @see https://github.github.com/gfm/#start-condition
 */
export function eatEndCondition1(
  nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  startIndex: number,
  endIndex: number,
): number | null {
  for (let i = startIndex; i < endIndex; ++i) {
    if (
      nodePoints[i].codePoint === AsciiCodePoint.OPEN_ANGLE &&
      i + 3 < endIndex &&
      nodePoints[i + 1].codePoint === AsciiCodePoint.SLASH
    ) {
      const tagNameStartIndex = i + 2
      const tagNameEndIndex = eatHTMLTagName(nodePoints, tagNameStartIndex, endIndex)
      if (
        tagNameEndIndex == null ||
        tagNameEndIndex >= endIndex ||
        nodePoints[tagNameEndIndex].codePoint !== AsciiCodePoint.CLOSE_ANGLE
      ) {
        i += 1
        continue
      }

      const rawTagName = calcStringFromNodePoints(
        nodePoints, tagNameStartIndex, tagNameEndIndex)
      const tagName = rawTagName.toLowerCase()
      if (includedTags.includes(tagName)) return tagNameEndIndex
    }
  }
  return null
}