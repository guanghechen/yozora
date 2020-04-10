import {
  BaseInlineDataNodeTokenizer,
  CodePoint,
  DataNodeTokenPointDetail,
  InlineDataNodeMatchResult,
  InlineDataNodeMatchState,
  InlineDataNodeTokenizer,
  DataNodeType,
} from '@yozora/tokenizer-core'
import { LineBreakDataNodeData, LineBreakDataNodeType } from './types'


type T = LineBreakDataNodeType


export interface LineBreakDataNodeMatchState extends InlineDataNodeMatchState {

}


export interface LineBreakDataNodeMatchedResult extends InlineDataNodeMatchResult<T> {

}


/**
 * Lexical Analyzer for LineBreakDataNode
 */
export class LineBreakTokenizer
  extends BaseInlineDataNodeTokenizer<
    T,
    LineBreakDataNodeData,
    LineBreakDataNodeMatchState,
    LineBreakDataNodeMatchedResult>
  implements InlineDataNodeTokenizer<
    T,
    LineBreakDataNodeData,
    LineBreakDataNodeMatchedResult> {

  public readonly name = 'LineBreakTokenizer'
  public readonly recognizedTypes: T[] = [LineBreakDataNodeType]

  /**
   * override
   */
  protected eatTo(
    codePoints: DataNodeTokenPointDetail[],
    precedingTokenPosition: InlineDataNodeMatchResult<DataNodeType> | null,
    state: LineBreakDataNodeMatchState,
    startIndex: number,
    endIndex: number,
    result: LineBreakDataNodeMatchedResult[],
  ): void {
    if (startIndex >= endIndex) return
    for (let i = startIndex + 1; i < endIndex; ++i) {
      const p = codePoints[i]
      switch (p.codePoint) {
        case CodePoint.LINE_FEED: {
          let start: number | null = null
          switch (codePoints[i - 1].codePoint) {
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
            case CodePoint.SPACE: {
              if (i - startIndex < 2) break
              let x = i - 2
              for (; x >= startIndex && codePoints[x].codePoint === CodePoint.SPACE;) x -= 1
              if (x === i - 2) break
              start = x + 1
              break
            }
            /**
             * For a more visible alternative, a backslash
             * before the line ending may be used instead of two spaces
             * @see https://github.github.com/gfm/#example-655
             */
            case CodePoint.BACK_SLASH: {
              let x = i - 2
              for (; x >= startIndex && codePoints[x].codePoint === CodePoint.BACK_SLASH;) x -= 1
              if ((x - i) & 1) break
              start = i - 1
              break
            }
          }

          if (start == null) continue

          /**
           * Leading spaces at the beginning of the next line are ignored
           * @see https://github.github.com/gfm/#example-657
           * @see https://github.github.com/gfm/#example-658
           */
          let end = i + 1
          for (; end < endIndex; ++end) {
            const p = codePoints[end]
            if (p.codePoint !== CodePoint.SPACE && p.codePoint !== CodePoint.LINE_FEED) break
          }

          const resultItem: LineBreakDataNodeMatchedResult = {
            type: LineBreakDataNodeType,
            left: { start, end: start, thickness: 0 },
            right: { start: end, end, thickness: 0 },
            children: [],
          }
          result.push(resultItem)
          break
        }
      }
    }
  }

  /**
   * override
   */
  protected parseData(): LineBreakDataNodeData {
    return {}
  }
}
