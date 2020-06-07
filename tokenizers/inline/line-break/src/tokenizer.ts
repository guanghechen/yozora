import { AsciiCodePoint } from '@yozora/character'
import {
  BaseInlineTokenizer,
  InlineTokenizer,
  InlineTokenizerMatchPhaseHook,
  InlineTokenizerParsePhaseHook,
  InlineTokenizerPreMatchPhaseHook,
  NextParamsOfEatDelimiters,
  RawContent,
} from '@yozora/tokenizercore-inline'
import {
  LineBreakDataNode,
  LineBreakDataNodeType,
  LineBreakMatchPhaseState,
  LineBreakPotentialToken,
  LineBreakPreMatchPhaseState,
  LineBreakTokenDelimiter,
} from './types'


type T = LineBreakDataNodeType


/**
 * Lexical Analyzer for LineBreakDataNode
 */
export class LineBreakTokenizer extends BaseInlineTokenizer<T>
  implements
    InlineTokenizer<T>,
    InlineTokenizerPreMatchPhaseHook<
      T,
      LineBreakPreMatchPhaseState,
      LineBreakTokenDelimiter,
      LineBreakPotentialToken>,
    InlineTokenizerMatchPhaseHook<
      T,
      LineBreakPreMatchPhaseState,
      LineBreakMatchPhaseState>,
    InlineTokenizerParsePhaseHook<
      T,
      LineBreakMatchPhaseState,
      LineBreakDataNode>
{
  public readonly name = 'LineBreakTokenizer'
  public readonly uniqueTypes: T[] = [LineBreakDataNodeType]

  /**
   * hook of @InlineTokenizerPreMatchPhaseHook
   */
  public * eatDelimiters(
    rawContent: RawContent,
  ): Iterator<void, LineBreakTokenDelimiter[], NextParamsOfEatDelimiters | null> {
    const { codePositions } = rawContent
    const delimiters: LineBreakTokenDelimiter[] = []
    while (true) {
      const nextParams = yield
      if (nextParams == null) break

      const { startIndex, endIndex } = nextParams
      for (let i = startIndex + 1; i < endIndex; ++i) {
        if (codePositions[i].codePoint !== AsciiCodePoint.LINE_FEED) continue

        const p = codePositions[i - 1]
        let _start: number | null = null
        switch (p.codePoint) {
          /**
           * For a more visible alternative, a backslash
           * before the line ending may be used instead of two spaces
           * @see https://github.github.com/gfm/#example-655
           */
          case AsciiCodePoint.BACK_SLASH: {
            let x = i - 2
            for (; x >= startIndex; x -= 1) {
              if (codePositions[x].codePoint !== AsciiCodePoint.BACK_SLASH) break
            }
            if (((i - x) & 1) === 0) {
              _start = i - 1
            }
            break
          }
          /**
           * - A line break (not in a code span or HTML tag) that is preceded
           *   by two or more spaces and does not occur at the end of a block
           *   is parsed as a hard line break (rendered in HTML as a <br /> tag)
           * - More than two spaces can be used
           * - Leading spaces at the beginning of the next line are ignored
           *
           * @see https://github.github.com/gfm/#example-654
           * @see https://github.github.com/gfm/#example-656
           * @see https://github.github.com/gfm/#example-657
           */
          case AsciiCodePoint.SPACE: {
            let x = i - 2
            for (; x >= startIndex; x -= 1) {
              if (codePositions[x].codePoint !== AsciiCodePoint.SPACE) break
            }

            if (i - x > 2) {
              _start = x + 1
            }
            break
          }
        }

        if (_start == null) continue

        /**
         * Leading spaces at the beginning of the next line are ignored
         * @see https://github.github.com/gfm/#example-657
         * @see https://github.github.com/gfm/#example-658
         */
        let _end = i + 1
        for (; _end < endIndex; ++_end) {
          const p = codePositions[_end]
          if (
            p.codePoint !== AsciiCodePoint.SPACE &&
            p.codePoint !== AsciiCodePoint.LINE_FEED
          ) break
        }

        const delimiter: LineBreakTokenDelimiter = {
          type: 'both',
          startIndex: _start,
          endIndex: _end,
          thickness: 0,
        }
        delimiters.push(delimiter)
      }
    }
    return delimiters
  }

  /**
   * hook of @InlineTokenizerPreMatchPhaseHook
   */
  public eatPotentialTokens(
    rawContent: RawContent,
    delimiters: LineBreakTokenDelimiter[],
  ): LineBreakPotentialToken[] {
    const potentialTokens: LineBreakPotentialToken[] = []
    for (const delimiter of delimiters) {
      const potentialToken: LineBreakPotentialToken = {
        type: LineBreakDataNodeType,
        startIndex: delimiter.startIndex,
        endIndex: delimiter.endIndex,
      }
      potentialTokens.push(potentialToken)
    }
    return potentialTokens
  }

  /**
   * hook of @InlineTokenizerPreMatchPhaseHook
   */
  public assemblePreMatchState(
    rawContent: RawContent,
    potentialToken: LineBreakPotentialToken,
  ): LineBreakPreMatchPhaseState {
    const result: LineBreakPreMatchPhaseState = {
      type: LineBreakDataNodeType,
      startIndex: potentialToken.startIndex,
      endIndex: potentialToken.endIndex,
    }
    return result
  }

  /**
   * hook of @InlineTokenizerMatchPhaseHook
   */
  public match(
    rawContent: RawContent,
    preMatchPhaseState: LineBreakPreMatchPhaseState,
  ): LineBreakMatchPhaseState | false {
    const result: LineBreakMatchPhaseState = {
      type: LineBreakDataNodeType,
      startIndex: preMatchPhaseState.startIndex,
      endIndex: preMatchPhaseState.endIndex,
    }
    return result
  }

  /**
   * hook of @InlineTokenizerParsePhaseHook
   */
  public parse(): LineBreakDataNode {
    const result: LineBreakDataNode = {
      type: LineBreakDataNodeType,
    }
    return result
  }
}