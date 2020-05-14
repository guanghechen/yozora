import {
  AsciiCodePoint,
  isUnicodeWhiteSpaceCharacter,
} from '@yozora/character'
import { ParagraphDataNodeType } from '@yozora/tokenizer-paragraph'
import { DataNodeTokenPointDetail } from '@yozora/tokenizercore'
import {
  BaseBlockTokenizer,
  BlockTokenizer,
  BlockTokenizerEatingInfo,
  BlockTokenizerMatchPhaseHook,
  BlockTokenizerMatchPhaseState,
  BlockTokenizerParsePhaseHook,
  BlockTokenizerParsePhaseState,
  BlockTokenizerPreMatchPhaseHook,
  BlockTokenizerPreMatchPhaseState,
  BlockTokenizerPreParsePhaseState,
  PhrasingContentDataNode,
  PhrasingContentTokenizerMatchPhaseState,
  calcToPhrasingContentMatchPhaseState,
} from '@yozora/tokenizercore-block'
import { HeadingDataNode, HeadingDataNodeType } from './types'


type T = HeadingDataNodeType


/**
 * State of pre-match phase of HeadingTokenizer
 */
export interface HeadingTokenizerPreMatchPhaseState
  extends BlockTokenizerPreMatchPhaseState<T> {
  /**
   * Level of heading
   */
  depth: number
  /**
   * Contents of heading
   */
  contents: DataNodeTokenPointDetail[]
}


/**
 * State of match phase of HeadingTokenizer
 */
export interface HeadingTokenizerMatchPhaseState
  extends BlockTokenizerMatchPhaseState<T> {
  /**
   * Level of heading
   */
  depth: number
  /**
   * Contents of heading
   */
  children: [PhrasingContentTokenizerMatchPhaseState]
}


/**
 * Lexical Analyzer for HeadingDataNode
 *
 * An ATX heading consists of a string of characters, parsed as inline content,
 * between an opening sequence of 1–6 unescaped '#' characters and an optional
 * closing sequence of any number of unescaped '#' characters. The opening
 * sequence of '#' characters must be followed by a space or by the end of line.
 * The optional closing sequence of #s must be preceded by a space and may be
 * followed by spaces only. The opening # character may be indented 0-3 spaces.
 * The raw contents of the heading are stripped of leading and trailing spaces
 * before being parsed as inline content. The heading level is equal to the
 * number of '#' characters in the opening sequence.
 */
export class HeadingTokenizer extends BaseBlockTokenizer<T>
  implements
    BlockTokenizer<T>,
    BlockTokenizerPreMatchPhaseHook<
      T,
      HeadingTokenizerPreMatchPhaseState>,
    BlockTokenizerMatchPhaseHook<
      T,
      HeadingTokenizerPreMatchPhaseState,
      HeadingTokenizerMatchPhaseState>,
    BlockTokenizerParsePhaseHook<
      T,
      HeadingTokenizerMatchPhaseState,
      HeadingDataNode>
{
  public readonly name = 'HeadingTokenizer'
  public readonly uniqueTypes: T[] = [HeadingDataNodeType]

  /**
   * hook of @BlockTokenizerPreMatchPhaseHook
   */
  public eatNewMarker(
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    parentState: Readonly<BlockTokenizerPreMatchPhaseState>,
  ): {
    nextIndex: number,
    state: HeadingTokenizerPreMatchPhaseState,
  } | null {
    if (eatingInfo.isBlankLine) return null
    const { startIndex, firstNonWhiteSpaceIndex, endIndex } = eatingInfo

    /**
     * Four spaces are too much
     * @see https://github.github.com/gfm/#example-39
     * @see https://github.github.com/gfm/#example-40
     */
    if (firstNonWhiteSpaceIndex - startIndex >= 4) return null

    let depth = 0, i = firstNonWhiteSpaceIndex, c = codePositions[i]
    for (; i < endIndex; ++i) {
      c = codePositions[i]
      if (c.codePoint !== AsciiCodePoint.NUMBER_SIGN) break
      depth += 1
    }

    /**
     * More than six '#' characters is not a heading
     * @see https://github.github.com/gfm/#example-33
     */
    if (depth < 1 || depth > 6) return null

    /**
     * At least one space is required between the '#' characters and the
     * heading’s contents, unless the heading is empty. Note that many
     * implementations currently do not require the space. However, the space
     * was required by the original ATX implementation, and it helps prevent
     * things like the following from being parsed as headings:
     *
     * ATX headings can be empty
     * @see https://github.github.com/gfm/#example-49
     */
    if (i + 1 < endIndex && c.codePoint !== AsciiCodePoint.SPACE) return null

    /**
     * Leading and trailing whitespace is ignored in parsing inline content
     * Spaces are allowed after the closing sequence
     * @see https://github.github.com/gfm/#example-37
     * @see https://github.github.com/gfm/#example-43
     */
    let leftIndex = i + 1, rightIndex = endIndex - 1
    for (; leftIndex < endIndex; ++leftIndex) {
      c = codePositions[leftIndex]
      if (!isUnicodeWhiteSpaceCharacter(c.codePoint)) break
    }
    for (; rightIndex > leftIndex; --rightIndex) {
      c = codePositions[rightIndex]
      if (!isUnicodeWhiteSpaceCharacter(c.codePoint)) break
    }

    /**
     * A closing sequence of '#' characters is optional
     * It need not be the same length as the opening sequence
     * @see https://github.github.com/gfm/#example-41
     * @see https://github.github.com/gfm/#example-42
     * @see https://github.github.com/gfm/#example-44
     */
    let closeCharCount = 0
    for (let j = rightIndex; j >= leftIndex; --j) {
      c = codePositions[j]
      if (c.codePoint !== AsciiCodePoint.NUMBER_SIGN) break
      closeCharCount += 1
    }
    if (closeCharCount > 0) {
      let spaceCount = 0, j = rightIndex - closeCharCount
      for (; j >= leftIndex; --j) {
        c = codePositions[j]
        if (!isUnicodeWhiteSpaceCharacter(c.codePoint)) break
        spaceCount += 1
      }
      if (spaceCount > 0 || j < leftIndex) {
        rightIndex -= closeCharCount + spaceCount
      }
    }

    const state: HeadingTokenizerPreMatchPhaseState = {
      type: HeadingDataNodeType,
      opening: true,
      parent: parentState,
      depth,
      contents: codePositions.slice(leftIndex, rightIndex + 1),
    }
    return { nextIndex: endIndex, state }
  }

  /**
   * hook of @BlockTokenizerPreMatchPhaseHook
   */
  public eatAndInterruptPreviousSibling(
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    parentState: Readonly<BlockTokenizerPreMatchPhaseState>,
    previousSiblingState: Readonly<BlockTokenizerPreMatchPhaseState>,
  ): {
    nextIndex: number,
    state: HeadingTokenizerPreMatchPhaseState,
    shouldRemovePreviousSibling: boolean,
  } | null {
    const self = this
    switch (previousSiblingState.type) {
      /**
       * ATX headings need not be separated from surrounding content by blank
       * lines, and they can interrupt paragraphs
       * @see https://github.github.com/gfm/#example-47
       * @see https://github.github.com/gfm/#example-48
       */
      case ParagraphDataNodeType: {
        if (previousSiblingState.type !== ParagraphDataNodeType) return null
        const eatingResult = self.eatNewMarker(codePositions, eatingInfo, parentState)
        if (eatingResult == null) return null
        return { ...eatingResult, shouldRemovePreviousSibling: false }
      }
      default:
        return null
    }
  }

  /**
   * hook of @BlockTokenizerMatchPhaseHook
   */
  public match(
    preMatchPhaseState: HeadingTokenizerPreMatchPhaseState,
  ): HeadingTokenizerMatchPhaseState {
    const phrasingContent = calcToPhrasingContentMatchPhaseState(preMatchPhaseState.contents)
    const result: HeadingTokenizerMatchPhaseState = {
      type: preMatchPhaseState.type,
      classify: 'flow',
      depth: preMatchPhaseState.depth,
      children: [phrasingContent],
    }
    return result
  }

  /**
   * hook of @BlockTokenizerParsePhaseHook
   */
  public parseFlow(
    matchPhaseState: HeadingTokenizerMatchPhaseState,
    preParsePhaseState: BlockTokenizerPreParsePhaseState,
    children?: BlockTokenizerParsePhaseState[],
  ): HeadingDataNode {
    const result: HeadingDataNode = {
      type: matchPhaseState.type,
      depth: matchPhaseState.depth,
      children: children as [PhrasingContentDataNode],
    }
    return result
  }
}
