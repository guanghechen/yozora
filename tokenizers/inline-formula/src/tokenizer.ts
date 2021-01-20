import type {
  EnhancedYastNodePoint,
  YastMeta as M,
} from '@yozora/tokenizercore'
import type {
  InlineTokenizer,
  InlineTokenizerMatchPhaseHook,
  InlineTokenizerParsePhaseHook,
  InlineTokenizerProps,
  NextParamsOfEatDelimiters,
} from '@yozora/tokenizercore-inline'
import type {
  InlineFormula as PS,
  InlineFormulaMatchPhaseState as MS,
  InlineFormulaPotentialToken as PT,
  InlineFormulaTokenDelimiter as TD,
  InlineFormulaType as T,
} from './types'
import { AsciiCodePoint } from '@yozora/character'
import { BaseInlineTokenizer } from '@yozora/tokenizercore-inline'
import { InlineFormulaType } from './types'


/**
 * Lexical Analyzer for PS
 */
export class InlineFormulaTokenizer extends BaseInlineTokenizer<T> implements
  InlineTokenizer<T>,
  InlineTokenizerMatchPhaseHook<T, M, MS, TD, PT>,
  InlineTokenizerParsePhaseHook<T, M, MS, PS>
{
  public readonly name = 'InlineFormulaTokenizer'
  public readonly uniqueTypes: T[] = [InlineFormulaType]

  public constructor(props: InlineTokenizerProps) {
    super({ ...props })
  }

  /**
   * @override
   * @see InlineTokenizerMatchPhaseHook
   */
  public * eatDelimiters(
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  ): Iterator<void, TD[], NextParamsOfEatDelimiters | null> {
    const delimiters: TD[] = []
    while (true) {
      const nextParams = yield
      if (nextParams == null) break

      const { startIndex, endIndex } = nextParams
      for (let i = startIndex; i < endIndex; ++i) {
        const p = nodePoints[i]
        switch (p.codePoint) {
          case AsciiCodePoint.BACK_SLASH:
            /**
             * Note that backslash escapes do not work in code spans.
             * All backslashes are treated literally
             * @see https://github.github.com/gfm/#example-348
             */
            if (
              i + 1 < endIndex
              && nodePoints[i + 1].codePoint !== AsciiCodePoint.BACKTICK) {
              i += 1
            }
            break
          /**
           * A backtick string is a string of one or more backtick characters '`'
           * that is neither preceded nor followed by a backtick.
           * A code span begins with a backtick string and ends with a
           * backtick string of equal length.
           * @see https://github.github.com/gfm/#backtick-string
           * @see https://github.github.com/gfm/#code-span
           *
           * the left flanking string pattern is: <BACKTICK STRING><DOLLAR>. eg: `$, ``$
           *
           * A backtick string is a string of one or more backtick characters '`'
           * that is neither preceded nor followed by a backtick.
           * @see https://github.github.com/gfm/#backtick-string
           */
          case AsciiCodePoint.BACKTICK: {
            const _startIndex = i

            // matched as many backtick as possible
            for (i += 1; i < endIndex; ++i) {
              if (nodePoints[i].codePoint !== AsciiCodePoint.BACKTICK) break
            }

            // No dollar character found after backtick string
            if (
              i >= endIndex ||
              nodePoints[i].codePoint !== AsciiCodePoint.DOLLAR
            ) {
              break
            }

            const delimiter: TD = {
              type: 'opener',
              startIndex: _startIndex,
              endIndex: i + 1,
            }
            delimiters.push(delimiter)
            break
          }
          /**
           * the right flanking string pattern is: <DOLLAR><BACKTICK STRING>. eg: $`, $``
           *
           * A backtick string is a string of one or more backtick characters '`'
           * that is neither preceded nor followed by a backtick.
           * @see https://github.github.com/gfm/#backtick-string
           */
          case AsciiCodePoint.DOLLAR: {
            const _startIndex = i

            // matched as many backtick as possible
            for (i += 1; i < endIndex; ++i) {
              if (nodePoints[i].codePoint !== AsciiCodePoint.BACKTICK) break
            }

            // No backtick character found after dollar
            if (i <= _startIndex + 1) {
              break
            }

            const delimiter: TD = {
              type: 'closer',
              startIndex: _startIndex,
              endIndex: i,
            }
            delimiters.push(delimiter)

            if (
              i + 1 < endIndex &&
              nodePoints[i + 1].codePoint !== AsciiCodePoint.DOLLAR
            ) {
              i += 1
              const potentialDelimiter: TD = {
                type: 'opener',
                startIndex: _startIndex + 1,
                endIndex: i,
              }
              delimiters.push(potentialDelimiter)
            }
            break
          }
        }
      }
    }
    return delimiters
  }

  /**
   * @override
   * @see InlineTokenizerMatchPhaseHook
   */
  public eatPotentialTokens(
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    meta: Readonly<M>,
    delimiters: TD[],
  ): PT[] {
    const tokens: PT[] = []
    for (let i = 0; i < delimiters.length; ++i) {
      const opener = delimiters[i]
      if (opener.type === 'closer') continue

      const thickness = opener.endIndex - opener.startIndex
      let closer: TD | null = null
      let k = i + 1
      for (; k < delimiters.length; ++k) {
        closer = delimiters[k]
        if (closer.type === 'opener') continue

        /**
         * Backslash escapes are never needed, because one can always choose a
         * string of n backtick characters as delimiters, where the code does
         * not contain any strings of exactly n backtick characters.
         * @see https://github.github.com/gfm/#example-349
         * @see https://github.github.com/gfm/#example-350
         */
        if (closer.endIndex - closer.startIndex !== thickness) continue
        break
      }

      /**
       * When a backtick string is not closed by a matching backtick string,
       * we just have literal backticks
       * @see https://github.github.com/gfm/#example-357
       * @see https://github.github.com/gfm/#example-358
       *
       * The following case also illustrates the need for opening and closing
       * backtick strings to be equal in length
       * @see https://github.github.com/gfm/#example-359
       */
      if (k >= delimiters.length || closer == null) continue

      const token: PT = {
        type: InlineFormulaType,
        startIndex: opener.startIndex,
        endIndex: closer.endIndex,
        openerDelimiter: opener,
        closerDelimiter: closer,
      }
      tokens.push(token)
    }
    return tokens
  }

  /**
   * @override
   * @see InlineTokenizerMatchPhaseHook
   */
  public match(
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    meta: Readonly<M>,
    potentialToken: PT,
  ): MS | null {
    let startIndex: number = potentialToken.openerDelimiter.endIndex
    let endIndex: number = potentialToken.closerDelimiter.startIndex

    let isAllSpace = true
    for (let i = startIndex; i < endIndex; ++i) {
      const p = nodePoints[i]
      if (this.isSpaceLike(p)) continue
      isAllSpace = false
      break
    }

    /**
     * If the resulting string both begins and ends with a space character,
     * but doesn't consist entirely of space characters, a single space
     * character is removed from the front and back. This allows you to
     * include code that begins or endsWith backtick characters, which must
     * be separated by whitespace from theopening or closing backtick strings.
     * @see https://github.github.com/gfm/#example-340
     *
     * Only spaces, and not unicode whitespace in general, are stripped
     * in this way
     * @see https://github.github.com/gfm/#example-343
     *
     * No stripping occurs if the code span contains only spaces
     * @see https://github.github.com/gfm/#example-344
     */
    if (!isAllSpace && startIndex + 2 < endIndex) {
      const firstCharacter = nodePoints[startIndex]
      const lastCharacter = nodePoints[endIndex - 1]
      if (this.isSpaceLike(firstCharacter) && this.isSpaceLike(lastCharacter)) {
        startIndex += 1
        endIndex -= 1
      }
    }

    const result: MS = {
      type: InlineFormulaType,
      startIndex: potentialToken.startIndex,
      endIndex: potentialToken.endIndex,
      openerDelimiter: potentialToken.openerDelimiter,
      closerDelimiter: potentialToken.closerDelimiter,
      contents: { startIndex, endIndex },
    }
    return result
  }

  /**
   * @override
   * @see InlineTokenizerParsePhaseHook
   */
  public parse(
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    meta: Readonly<M>,
    matchPhaseState: MS,
  ): PS {
    const { contents } = matchPhaseState
    const result: PS = {
      type: InlineFormulaType,
      value: nodePoints.slice(contents.startIndex, contents.endIndex)
        .map(c => (this.isSpaceLike(c) ? ' ' : String.fromCodePoint(c.codePoint)))
        .join(''),
    }
    return result
  }

  /**
   * Line endings are treated like spaces
   * @see https://github.github.com/gfm/#example-345
   * @see https://github.github.com/gfm/#example-346
   */
  protected isSpaceLike(c: EnhancedYastNodePoint): boolean {
    return (
      c.codePoint === AsciiCodePoint.SPACE
      || c.codePoint === AsciiCodePoint.LINE_FEED
    )
  }
}
