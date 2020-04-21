import {
  BaseInlineDataNodeTokenizer,
  CodePoint,
  DataNodeTokenFlanking,
  DataNodeTokenPointDetail,
  InlineDataNode,
  InlineDataNodeMatchResult,
  InlineDataNodeMatchState,
  InlineDataNodeTokenizer,
  InlineDataNodeType,
  eatOptionalWhiteSpaces,
} from '@yozora/tokenizer-core'
import {
  LinkDataNodeType,
  ReferenceLinkDataNodeData,
  ReferenceLinkDataNodeType,
} from './types'
import { eatLinkLabel, eatLinkText } from './util'


type T = ReferenceLinkDataNodeType
type FlankingItem = Pick<DataNodeTokenFlanking, 'start' | 'end'>


export interface ReferenceLinkDataNodeMatchState extends InlineDataNodeMatchState {
  /**
   * 方括号位置信息
   */
  brackets: Readonly<DataNodeTokenPointDetail>[]
  /**
   * 左边界
   */
  leftFlanking: DataNodeTokenFlanking | null
  /**
   * 中间边界
   */
  middleFlanking: DataNodeTokenFlanking | null
}


export interface ReferenceLinkDataNodeMatchedResult extends InlineDataNodeMatchResult<T> {
  /**
   * link-text 的边界
   */
  textFlanking: FlankingItem | null
  /**
   * link-label 的边界
   */
  labelFlanking: FlankingItem | null
}


/**
 * Lexical Analyzer for ReferenceLinkDataNode
 *
 * There are three kinds of reference links:
 *  - full: A full reference link consists of a link text immediately followed by a link label
 *    that matches a link reference definition elsewhere in the document.
 *
 *    A link label begins with a left bracket '[' and ends with the first right bracket ']' that
 *    is not backslash-escaped. Between these brackets there must be at least one non-whitespace
 *    character. Unescaped square bracket characters are not allowed inside the opening and
 *    closing square brackets of link labels. A link label can have at most 999 characters
 *    inside the square brackets.
 *
 *    One label matches another just in case their normalized forms are equal. To normalize
 *    a label, strip off the opening and closing brackets, perform the Unicode case fold, strip
 *    leading and trailing whitespace and collapse consecutive internal whitespace to a single
 *    space. If there are multiple matching reference link definitions, the one that comes first
 *    in the document is used. (It is desirable in such cases to emit a warning.)
 *
 *  - collapsed: A collapsed reference link consists of a link label that matches a link
 *    reference definition elsewhere in the document, followed by the string '[]'. The contents
 *    of the first link label are parsed as inlines, which are used as the link’s text.
 *    The link’s URI and title are provided by the matching reference link definition.
 *    Thus, '[foo][]' is equivalent to '[foo][foo]'.
 *
 *  - shortcut (not support): A shortcut reference link consists of a link label that matches
 *    a link reference definition elsewhere in the document and is not followed by '[]' or a
 *    link label. The contents of the first link label are parsed as inlines, which are used
 *    as the link’s text. The link’s URI and title are provided by the matching link
 *    reference definition. Thus, '[foo]' is equivalent to '[foo][]'.
 *
 * @see https://github.github.com/gfm/#reference-link
 */
export class ReferenceLinkTokenizer
  extends BaseInlineDataNodeTokenizer<
    T,
    ReferenceLinkDataNodeData,
    ReferenceLinkDataNodeMatchState,
    ReferenceLinkDataNodeMatchedResult>
  implements InlineDataNodeTokenizer<
    T,
    ReferenceLinkDataNodeData,
    ReferenceLinkDataNodeMatchedResult> {

  public readonly name = 'ReferenceLinkTokenizer'
  public readonly recognizedTypes: T[] = [ReferenceLinkDataNodeType]
  protected readonly _unAcceptableChildTypes: InlineDataNodeType[] = [
    LinkDataNodeType,
    ReferenceLinkDataNodeType,
  ]

  /**
   * override
   */
  protected eatTo(
    codePoints: DataNodeTokenPointDetail[],
    precedingTokenPosition: InlineDataNodeMatchResult<InlineDataNodeType> | null,
    state: ReferenceLinkDataNodeMatchState,
    startIndex: number,
    endIndex: number,
    result: ReferenceLinkDataNodeMatchedResult[],
  ): void {
    if (startIndex >= endIndex) return
    const self = this

    if (precedingTokenPosition != null && precedingTokenPosition.type === LinkDataNodeType) {
      self.initializeMatchState(state)
    }

    for (let i = startIndex; i < endIndex; ++i) {
      const p = codePoints[i]
      switch (p.codePoint) {
        case CodePoint.BACK_SLASH:
          ++i
          break
        case CodePoint.OPEN_BRACKET: {
          state.brackets.push(p)
          break
        }
        /**
         * match middle flanking (pattern: /\]\[/)
         */
        case CodePoint.CLOSE_BRACKET: {
          state.brackets.push(p)
          if (i + 1 >= endIndex || codePoints[i + 1].codePoint !== CodePoint.OPEN_BRACKET) break

          /**
           * 往回寻找唯一的与其匹配的左中括号
           */
          let bracketIndex = state.brackets.length - 2
          for (let openBracketCount = 0; bracketIndex >= 0; --bracketIndex) {
            if (state.brackets[bracketIndex].codePoint === CodePoint.OPEN_BRACKET) {
              ++openBracketCount
            } else if (state.brackets[bracketIndex].codePoint === CodePoint.CLOSE_BRACKET) {
              --openBracketCount
            }
            if (openBracketCount === 1) break
          }

          // 若未找到与其匹配得左中括号，则继续遍历 i
          if (bracketIndex < 0) break

          // link-text
          const openBracketPoint = state.brackets[bracketIndex]
          const closeBracketPoint = p
          const textEndIndex = eatLinkText(
            codePoints, state, openBracketPoint, closeBracketPoint)
          if (textEndIndex < 0) break

          // link-label
          const labelStartIndex = eatOptionalWhiteSpaces(
            codePoints, textEndIndex, endIndex)
          const labelEndIndex = eatLinkLabel(
            codePoints, state, labelStartIndex, endIndex)
          if (labelEndIndex < 0) break
          const hasLabel: boolean = labelEndIndex - labelStartIndex > 1

          const closeIndex = eatOptionalWhiteSpaces(
            codePoints, labelEndIndex, endIndex)
          if (closeIndex >= endIndex || codePoints[closeIndex].codePoint !== CodePoint.CLOSE_BRACKET) break

          const textFlanking: FlankingItem = {
            start: openBracketPoint.offset + 1,
            end: closeBracketPoint.offset,
          }
          const labelFlanking: FlankingItem | null = hasLabel
            ? {
              start: labelStartIndex,
              end: labelEndIndex,
            }
            : null

          i = closeIndex
          const q = codePoints[i]
          const rf = {
            start: q.offset,
            end: q.offset + 1,
            thickness: 1,
          }
          const position: ReferenceLinkDataNodeMatchedResult = {
            type: ReferenceLinkDataNodeType,
            left: state.leftFlanking!,
            right: rf,
            children: [],
            _unExcavatedContentPieces: [
              {
                start: textFlanking.start,
                end: textFlanking.end,
              }
            ],
            _unAcceptableChildTypes: self._unAcceptableChildTypes,
            textFlanking,
            labelFlanking,
          }
          result.push(position)

          /**
           * However, links may not contain other links, at any level of nesting.
           * @see https://github.github.com/gfm/#example-540
           * @see https://github.github.com/gfm/#example-541
           */
          self.initializeMatchState(state)
          break
        }
      }
    }
  }

  /**
   * override
   */
  protected parseData(
    codePoints: DataNodeTokenPointDetail[],
    matchResult: ReferenceLinkDataNodeMatchedResult,
    children?: InlineDataNode[]
  ): ReferenceLinkDataNodeData {
    return {} as any
  }

  /**
   * override
   */
  protected initializeMatchState(state: ReferenceLinkDataNodeMatchState): void {
    // eslint-disable-next-line no-param-reassign
    state.brackets = []

    // eslint-disable-next-line no-param-reassign
    state.leftFlanking = null

    // eslint-disable-next-line no-param-reassign
    state.middleFlanking = null
  }
}