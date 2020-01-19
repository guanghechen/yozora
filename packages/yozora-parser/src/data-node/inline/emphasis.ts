import {
  CharCode,
  InlineDataNodeType,
  DataNodeTokenPoint,
  DataNodeTokenPosition,
  DataNodeTokenFlankingGraph,
  buildGraphFromTwoFlanking,
  isUnicodeWhiteSpace,
  isUnicodePunctuationCharacter,
} from '@yozora/core'
import { InlineDataNodeTokenizer } from '../types'
import { BaseInlineDataNodeTokenizer } from './_base'


const T = InlineDataNodeType.EMPHASIS
type T = typeof T


/**
 * Lexical Analyzer for EmphasisDataNode
 */
export class EmphasisTokenizer
  extends BaseInlineDataNodeTokenizer<T>
  implements InlineDataNodeTokenizer<T> {
  public readonly type = T

  public match(codePoints: number[]): DataNodeTokenFlankingGraph<T> {
    const self = this
    const leftFlanking = self.matchLeftFlanking(codePoints)
    const rightFlanking = self.matchRightFlanking(codePoints)
    const isMatched = self.isMatched.bind(this, codePoints)
    const result = buildGraphFromTwoFlanking(self.type, leftFlanking, rightFlanking, isMatched)
    return result
  }

  protected matchLeftFlanking(codePoints: number[]): DataNodeTokenPosition[] {
    const self = this
    const flanking: DataNodeTokenPosition[] = []
    for (let offset = 0, column = 1, line = 1; offset < codePoints.length; ++offset, ++column) {
      const c = codePoints[offset]
      switch (c) {
        case CharCode.BACK_SLASH:
          ++offset
          ++column
          break
        case CharCode.LINE_FEED:
          column = 0
          ++line
          break
        /**
         * rule #1: A single <i>*</i> character can open emphasis iff (if and only if) it is part of a
         *          left-flanking delimiter run.
         * rule #2: A single <i>_</i> character can open emphasis iff it is part of a left-flanking
         *          delimiter run and either:
         *            (a) not part of a right-flanking delimiter run, or
         *            (b) part of a right-flanking delimiter run preceded by punctuation.
         * @see https://github.github.com/gfm/#can-open-emphasis
         * @see https://github.github.com/gfm/#example-360
         * @see https://github.github.com/gfm/#example-366
         */
        case CharCode.ASTERISK:
        case CharCode.UNDERSCORE: {
          const start: DataNodeTokenPoint = { offset, column, line }
          for(++offset, ++column; codePoints[offset] === c;) {
            ++offset, ++column
          }

          // rule #1
          if (!self.isLeftFlankingDelimiterRun(codePoints, start.offset, offset)) break

          // rule #2
          if (c === CharCode.UNDERSCORE) {
            if (
              self.isRightFlankingDelimiterRun(codePoints, start.offset, offset)
              && !isUnicodePunctuationCharacter(codePoints[start.offset - 1], true)
            ) break
          }

          const end: DataNodeTokenPoint = { offset, column, line }
          const position: DataNodeTokenPosition = { start, end }
          flanking.push(position)
          --offset, --column
          break
        }
      }
    }
    return flanking
  }

  protected matchRightFlanking(codePoints: number[]): DataNodeTokenPosition[] {
    const self = this
    const flanking: DataNodeTokenPosition[] = []
    for (let offset = 0, column = 1, line = 1; offset < codePoints.length; ++offset, ++column) {
      const c = codePoints[offset]
      switch (c) {
        case CharCode.BACK_SLASH:
          ++offset
          ++column
          break
        case CharCode.LINE_FEED:
          column = 0
          ++line
          break
        /**
         * rule #3: A single <i>*</i> character can close emphasis iff it is part of a
         *          right-flanking delimiter run.
         * rule #4: A single <i>_</i> character can open emphasis iff it is part of a right-flanking
         *          delimiter run and either:
         *            (a) not part of a left-flanking delimiter run, or
         *            (b) part of a left-flanking delimiter run followed by punctuation.
         * @see https://github.github.com/gfm/#can-open-emphasis
         * @see https://github.github.com/gfm/#example-374
         * @see https://github.github.com/gfm/#example-380
         */
        case CharCode.ASTERISK:
        case CharCode.UNDERSCORE: {
          const start: DataNodeTokenPoint = { offset, column, line }
          for(++offset, ++column; codePoints[offset] === c;) {
            ++offset, ++column
          }

          // rule #3
          if (!self.isRightFlankingDelimiterRun(codePoints, start.offset, offset)) break

          // rule #4
          if (c === CharCode.UNDERSCORE) {
            if (
              self.isLeftFlankingDelimiterRun(codePoints, start.offset, offset)
              && !isUnicodePunctuationCharacter(codePoints[start.offset + 1], true)
            ) break
          }

          const end: DataNodeTokenPoint = { offset, column, line }
          const position: DataNodeTokenPosition = { start, end }
          flanking.push(position)
          --offset, --column
          break
        }
      }
    }
    return flanking
  }

  /**
   * Rule #9: Emphasis begins with a delimiter that can open emphasis and ends with a delimiter
   *          that can close emphasis, and that uses the same character (_ or *) as the opening
   *          delimiter. The opening and closing delimiters must belong to separate delimiter runs.
   *          If one of the delimiters can both open and close emphasis, then the sum of the
   *          lengths of the delimiter runs containing the opening and closing delimiters must not
   *          be a multiple of 3 unless both lengths are multiples of 3.
   * @see https://github.github.com/gfm/#example-413
   */
  protected isMatched(
    codePoints: number[],
    left: DataNodeTokenPosition,
    right: DataNodeTokenPosition,
  ): boolean {
    if (codePoints[left.start.offset] !== codePoints[right.start.offset]) return false
    const self = this
    const leftLength = left.end.offset - left.start.offset
    const rightLength = right.end.offset - right.start.offset
    if ((leftLength + rightLength) % 3 === 0) {
      if (leftLength % 3 === 0) return true
      if (
        self.isRightFlankingDelimiterRun(codePoints, left.start.offset, left.end.offset)
        || self.isLeftFlankingDelimiterRun(codePoints, right.start.offset, right.end.offset)
      ) return false
    }
    return true
  }

  /**
   * Check if it is a left delimiter
   * @param codePoints
   * @param start
   * @param end
   * @see https://github.github.com/gfm/#left-flanking-delimiter-run
   */
  protected isLeftFlankingDelimiterRun(codePoints: number[], start: number, end: number): boolean {
    // not followed by Unicode whitespace
    if (end >= codePoints.length) return false
    const nextCode = codePoints[end]
    if (isUnicodeWhiteSpace(nextCode)) return false

    // not followed by a punctuation character
    if (!isUnicodePunctuationCharacter(nextCode, true)) return true

    // followed by a punctuation character and preceded by Unicode whitespace
    // or a punctuation character
    if (start <= 0) return true
    const prevCode = codePoints[start - 1]
    if (isUnicodeWhiteSpace(prevCode) || isUnicodePunctuationCharacter(prevCode, true)) return true
    return false
  }

  /**
   * Check if it is a right delimiter
   * @param codePoints
   * @param start
   * @param end
   * @see https://github.github.com/gfm/#right-flanking-delimiter-run
   */
  protected isRightFlankingDelimiterRun(codePoints: number[], start: number, end: number): boolean {
    // not preceded by Unicode whitespace
    if (start <= 0) return false
    const prevCode = codePoints[start - 1]
    if (isUnicodeWhiteSpace(prevCode)) return false

    // not preceded by a punctuation character
    if (!isUnicodePunctuationCharacter(prevCode, true)) return true

    // preceded by a punctuation character and followed by Unicode whitespace
    // or a punctuation character
    if (end >= codePoints.length) return true
    const nextCode = codePoints[end]
    if (isUnicodeWhiteSpace(nextCode) || isUnicodePunctuationCharacter(nextCode, true)) return true
    return false
  }
}
