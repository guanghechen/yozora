import type { EnhancedYastNodePoint } from '@yozora/tokenizercore'
import {
  AsciiCodePoint,
  isAsciiDigitCharacter,
  isAsciiLetter,
} from '@yozora/character'


/**
 * An email address, for these purposes, is anything that matches the
 * non-normative regex from the HTML5 spec:
 *
 *  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}
 *   [a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
 *
 * @see https://github.github.com/gfm/#email-address
 */
export function eatEmailAddress(
  nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  startIndex: number,
  endIndex: number,
): number | null {
  let i = startIndex

  // Match /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/
  for (; i < endIndex; i += 1) {
    const c = nodePoints[i].codePoint
    if (isAsciiLetter(c) || isAsciiDigitCharacter(c)) continue
    if (
      c !== AsciiCodePoint.DOT &&
      c !== AsciiCodePoint.EXCLAMATION_MARK &&
      c !== AsciiCodePoint.NUMBER_SIGN &&
      c !== AsciiCodePoint.DOLLAR_SIGN &&
      c !== AsciiCodePoint.PERCENT_SIGN &&
      c !== AsciiCodePoint.AMPERSAND &&
      c !== AsciiCodePoint.SINGLE_QUOTE &&
      c !== AsciiCodePoint.ASTERISK &&
      c !== AsciiCodePoint.PLUS_SIGN &&
      c !== AsciiCodePoint.SLASH &&
      c !== AsciiCodePoint.EQUALS_SIGN &&
      c !== AsciiCodePoint.QUESTION_MARK &&
      c !== AsciiCodePoint.CARET &&
      c !== AsciiCodePoint.UNDERSCORE &&
      c !== AsciiCodePoint.BACKTICK &&
      c !== AsciiCodePoint.OPEN_BRACE &&
      c !== AsciiCodePoint.VERTICAL_SLASH &&
      c !== AsciiCodePoint.CLOSE_BRACE &&
      c !== AsciiCodePoint.TILDE &&
      c !== AsciiCodePoint.MINUS_SIGN
    ) break
  }

  if (
    i === startIndex ||
    i + 1 >= endIndex ||
    nodePoints[i].codePoint !== AsciiCodePoint.AT_SIGN
  ) return null

  const c = nodePoints[i + 1].codePoint
  if (!isAsciiLetter(c) && !isAsciiDigitCharacter(c)) return null
  i = eatAddressPart0(nodePoints, i + 2, endIndex)

  // Match /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/
  for (; i + 1 < endIndex;) {
    let c = nodePoints[i].codePoint
    if (c !== AsciiCodePoint.DOT) break

    c = nodePoints[i + 1].codePoint
    if (!isAsciiLetter(c) && !isAsciiDigitCharacter(c)) break
    i = eatAddressPart0(nodePoints, i + 2, endIndex)
  }

  return i
}


/**
 * Match regex /(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/
 *
 */
function eatAddressPart0(
  nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  startIndex: number,
  endIndex: number,
): number {
  let i = startIndex, result = -1

  for (let _endIndex = Math.min(endIndex, i + 62); i < _endIndex; ++i) {
    const c = nodePoints[i].codePoint
    if (isAsciiLetter(c) || isAsciiDigitCharacter(c)) {
      result = i
      continue
    }
    if (c !== AsciiCodePoint.MINUS_SIGN) break
  }
  return (result >= startIndex) ? result + 1 : startIndex
}