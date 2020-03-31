import {
  InlineDataNodeTokenizer,
  BaseInlineDataNodeTokenizer,
  DataNodeTokenPointDetail,
  DataNodeTokenPosition,
  DataNodeTokenFlanking,
  DataNodeType,
  DataNode,
  CodePoint,
  eatOptionalWhiteSpaces,
} from '@yozora/tokenizer-core'
import { ReferenceLinkDataNodeType, LinkDataNodeType, ReferenceLinkDataNodeData } from './types'
import { eatLinkLabel, eatLinkText  } from './util'


type T = ReferenceLinkDataNodeType
type FlankingItem = Pick<DataNodeTokenFlanking, 'start' | 'end'>


export interface ReferenceLinkEatingState {
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


export interface ReferenceLinkMatchedResultItem extends DataNodeTokenPosition<T> {
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
export class ReferenceLinkTokenizer extends BaseInlineDataNodeTokenizer<
  T,
  ReferenceLinkMatchedResultItem,
  ReferenceLinkDataNodeData,
  ReferenceLinkEatingState>
  implements InlineDataNodeTokenizer<T> {
  public readonly name = 'ReferenceLinkTokenizer'
  public readonly recognizedTypes: T[] = [ReferenceLinkDataNodeType]
  protected readonly _unAcceptableChildTypes: DataNodeType[] = [
    LinkDataNodeType,
    ReferenceLinkDataNodeType,
  ]

  /**
   * override
   */
  protected eatTo(
    content: string,
    codePoints: DataNodeTokenPointDetail[],
    precedingTokenPosition: DataNodeTokenPosition<DataNodeType> | null,
    state: ReferenceLinkEatingState,
    startOffset: number,
    endOffset: number,
    result: ReferenceLinkMatchedResultItem[],
  ): void {
    if (startOffset >= endOffset) return
    const self = this

    if (precedingTokenPosition != null && precedingTokenPosition.type === LinkDataNodeType) {
      self.initializeEatingState(state)
    }

    for (let i = startOffset; i < endOffset; ++i) {
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
          if (i + 1 >= endOffset || codePoints[i + 1].codePoint !== CodePoint.OPEN_BRACKET) break

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
          const textEndOffset = eatLinkText(
            content, codePoints, state, openBracketPoint, closeBracketPoint)
          if (textEndOffset < 0) break

          // link-label
          const labelStartOffset = eatOptionalWhiteSpaces(
            content, codePoints, textEndOffset, endOffset)
          const labelEndOffset = eatLinkLabel(
            content, codePoints, state, labelStartOffset, endOffset)
          if (labelEndOffset < 0) break
          const hasLabel: boolean = labelEndOffset - labelStartOffset > 1

          const closeOffset = eatOptionalWhiteSpaces(
            content, codePoints, labelEndOffset, endOffset)
          if (closeOffset >= endOffset || codePoints[closeOffset].codePoint !== CodePoint.CLOSE_BRACKET) break

          const textFlanking: FlankingItem = {
            start: openBracketPoint.offset + 1,
            end: closeBracketPoint.offset,
          }
          const labelFlanking: FlankingItem | null = hasLabel
            ? {
              start: labelStartOffset,
              end: labelEndOffset,
            }
            : null

          i = closeOffset
          const q = codePoints[i]
          const rf = {
            start: q.offset,
            end: q.offset + 1,
            thickness: 1,
          }
          const position: ReferenceLinkMatchedResultItem = {
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
          self.initializeEatingState(state)
          break
        }
      }
    }
  }

  /**
   * override
   */
  protected parseData(
    content: string,
    codePoints: DataNodeTokenPointDetail[],
    tokenPosition: ReferenceLinkMatchedResultItem,
    children?: DataNode[]
  ): ReferenceLinkDataNodeData {
    return {} as any
  }

  /**
   * override
   */
  protected initializeEatingState(state: ReferenceLinkEatingState): void {
    // eslint-disable-next-line no-param-reassign
    state.brackets = []

    // eslint-disable-next-line no-param-reassign
    state.leftFlanking = null

    // eslint-disable-next-line no-param-reassign
    state.middleFlanking = null
  }
}