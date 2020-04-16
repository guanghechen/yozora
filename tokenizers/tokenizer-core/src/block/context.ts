import { CodePoint } from '../_constant/character'
import { DataNodeTokenPointDetail } from '../_types/token'
import { isUnicodeWhiteSpace } from '../_util/character'
import {
  InlineDataNodeMatchFunc,
  InlineDataNodeParseFunc,
  InlineDataNodeTokenizerContext,
} from '../inline/types'
import {
  BlockDataNode,
  BlockDataNodeEatingLineInfo,
  BlockDataNodeMatchResult,
  BlockDataNodeMatchState,
  BlockDataNodeTokenizer,
  BlockDataNodeTokenizerConstructor,
  BlockDataNodeTokenizerConstructorParams,
  BlockDataNodeTokenizerContext,
  BlockDataNodeType,
} from './types'


interface BlockDataNodeTokenizerContextParams {
  readonly inlineDataNodeMatchFunc?: InlineDataNodeMatchFunc
  readonly inlineDataNodeParseFunc?: InlineDataNodeParseFunc
}


/**
 * 块状数据的分词器的上下文
 */
export class DefaultBlockDataNodeTokenizerContext implements BlockDataNodeTokenizerContext {
  protected readonly tokenizers: BlockDataNodeTokenizer[]
  protected readonly tokenizerMap: Map<BlockDataNodeType, BlockDataNodeTokenizer>
  protected readonly fallbackTokenizer?: BlockDataNodeTokenizer
  protected readonly inlineContext?: InlineDataNodeTokenizerContext
  protected readonly inlineDataNodeMatchFunc?: InlineDataNodeMatchFunc
  protected readonly inlineDataNodeParseFunc?: InlineDataNodeParseFunc

  public constructor(
    FallbackTokenizerOrTokenizerConstructor?: BlockDataNodeTokenizer | BlockDataNodeTokenizerConstructor,
    fallbackTokenizerParams?: BlockDataNodeTokenizerConstructorParams,
    contextParams: BlockDataNodeTokenizerContextParams = {}
  ) {
    this.tokenizers = []
    this.tokenizerMap = new Map()
    this.inlineDataNodeMatchFunc = contextParams.inlineDataNodeMatchFunc
    this.inlineDataNodeParseFunc = contextParams.inlineDataNodeParseFunc

    if (FallbackTokenizerOrTokenizerConstructor != null) {
      let fallbackTokenizer: BlockDataNodeTokenizer
      if (typeof FallbackTokenizerOrTokenizerConstructor === 'function') {
        fallbackTokenizer = new FallbackTokenizerOrTokenizerConstructor({
          priority: -1,
          name: '__block_fallback__',
          ...fallbackTokenizerParams,
        })
      } else {
        fallbackTokenizer = FallbackTokenizerOrTokenizerConstructor
      }
      this.fallbackTokenizer = fallbackTokenizer
      this.registerTokenizer(fallbackTokenizer)
    }
  }

  /**
   * override
   */
  public useTokenizer(tokenizer: BlockDataNodeTokenizer): this {
    const self = this
    self.tokenizers.push(tokenizer)
    self.tokenizers.sort((x, y) => y.priority - x.priority)
    self.registerTokenizer(tokenizer)
    return this
  }

  /**
   * override
   */
  public match(
    codePoints: DataNodeTokenPointDetail[],
    startIndex: number,
    endIndex: number,
  ): BlockDataNodeMatchResult[] {
    const self = this
    const root: BlockDataNodeMatchState = {
      type: 'root',
      opening: true,
      children: [],
    }

    for (let i = startIndex, lineEndIndex: number; i < endIndex; i = lineEndIndex) {
      // find the index of the end of current line
      for (lineEndIndex = i; lineEndIndex < endIndex; ++lineEndIndex) {
        if (codePoints[lineEndIndex].codePoint === CodePoint.LINE_FEED) {
          ++lineEndIndex
          break
        }
      }

      /**
       * 使用 firstNonWhiteSpaceIndex 记录当前行剩余内容中第一个非空白符的下标，
       * 使得 isBlankLine() 无论调用多少次，当前行中累计复杂度都是 O(lineEndIndex-i)
       *
       * Use firstNonWhiteSpaceIndex to record the index of the first non-whitespace
       * in the remaining content of the current line, so that no matter how many
       * times isBlankLine() is called, the cumulative complexity in the current line
       * is O(lineEndIndex-i)
       */
      let firstNonWhiteSpaceIndex = i
      const calcEatingLineInfo = (): BlockDataNodeEatingLineInfo => {
        while (firstNonWhiteSpaceIndex < lineEndIndex) {
          const c = codePoints[firstNonWhiteSpaceIndex]
          if (!isUnicodeWhiteSpace(c.codePoint)) break
          firstNonWhiteSpaceIndex += 1
        }
        return {
          startIndex: i,
          endIndex: lineEndIndex,
          firstNonWhiteSpaceIndex,
          isBlankLine: firstNonWhiteSpaceIndex >= lineEndIndex,
        }
      }

      /**
       * 往前移动到下一个匹配位置
       *
       * Move i forward to the next starting match position
       * @param nextIndex next matching position
       */
      const moveToNext = (nextIndex: number) => {
        i = nextIndex
        firstNonWhiteSpaceIndex = Math.max(firstNonWhiteSpaceIndex, nextIndex)
      }

      /**
       * Step 1: First we iterate through the open blocks, starting with the
       *         root document, and descending through last children down to
       *         the last open block. Each block imposes a condition that the
       *         line must satisfy if the block is to remain open.
       * @see https://github.github.com/gfm/#phase-1-block-structure
       */
      let parent: BlockDataNodeMatchState = root
      let unmatchedState: BlockDataNodeMatchState | null = null
      if (parent.children != null && parent.children.length > 0) {
        unmatchedState = parent.children[parent.children.length - 1]
        while (unmatchedState != null && unmatchedState.opening) {
          const tokenizer = self.tokenizerMap.get(unmatchedState.type)
          if (tokenizer == null) break

          const [nextIndex, success] = tokenizer
            .eatContinuationText(codePoints, calcEatingLineInfo(), unmatchedState, parent)
          if (!success) break
          moveToNext(nextIndex)

          // descending through last children down to the next open block
          if (unmatchedState.children == null || unmatchedState.children.length <= 0) {
            parent = unmatchedState
            unmatchedState = null
            break
          }

          const lastChild: BlockDataNodeMatchState = unmatchedState
            .children[unmatchedState.children.length - 1]
          parent = unmatchedState
          unmatchedState = lastChild
        }
      }

      /**
       * 递归关闭未匹配到状态处于 opening 的块
       * Recursively close unmatched opening blocks
       */
      let stateClosed = false
      const recursivelyCloseState = () => {
        if (stateClosed) return
        stateClosed = true
        if (unmatchedState == null) return
        self.recursivelyCloseState(unmatchedState)
      }

      /**
       * Step 2: Next, after consuming the continuation markers for existing blocks,
       *         we look for new block starts (e.g. > for a block quote)
       */
      let newTokenMatched = false
      for (; i < lineEndIndex && parent.children != null;) {
        const currentIndex = i
        for (const tokenizer of self.tokenizers) {
          const [nextIndex, state] = tokenizer
            .eatNewMarker(codePoints, calcEatingLineInfo(), parent)
          if (state == null) continue

          // The marker of the new data node cannot be empty
          if (i === nextIndex) {
            break
          }

          moveToNext(nextIndex)

          /**
           * If we encounter a new block start, we close any blocks unmatched
           * in step 1 before creating the new block as a child of the last matched block
           */
          if (!newTokenMatched) {
            newTokenMatched = true
            recursivelyCloseState()
          }
          parent.children?.push(state)
          parent = state
          break
        }
        if (currentIndex === i) break
      }

      /**
       * 本行没有剩余内容，提前结束匹配，并关闭未匹配到的块
       * There is no remaining content in this bank, end the match in advance,
       * and close the unmatched opening blocks
       */
      if (i >= lineEndIndex) {
        if (!newTokenMatched) {
          recursivelyCloseState()
        }
        continue
      }

      /**
       * Step 3: Finally, we look at the remainder of the line (after block
       *         markers like >, list markers, and indentation have been consumed).
       *         This is text that can be incorporated into the last open block
       *         (a paragraph, code block, heading, or raw HTML).
       */
      let lastChild: BlockDataNodeMatchState = parent
      while (lastChild.children != null && lastChild.children.length > 0) {
        lastChild = lastChild.children[lastChild.children.length - 1]
      }
      if (lastChild.opening) {
        let continuationTextMatched = false
        const tokenizer = self.tokenizerMap.get(lastChild.type)
        if (tokenizer != null && tokenizer.eatLazyContinuationText != null) {
          const [nextIndex, success] = tokenizer
            .eatLazyContinuationText(codePoints, calcEatingLineInfo(), lastChild)
          if (success) {
            continuationTextMatched = true
            moveToNext(nextIndex)
          }
        }
        if (!continuationTextMatched) {
          recursivelyCloseState()
        }
      }

      /**
       * There is still unknown content, close unmatched blocks and use FallbackTokenizer
       */
      if (firstNonWhiteSpaceIndex < lineEndIndex) {
        recursivelyCloseState()
        if (self.fallbackTokenizer != null && parent.children != null) {
          const [nextIndex, state] = self.fallbackTokenizer
            .eatNewMarker(codePoints, calcEatingLineInfo(), parent)
          if (state != null) {
            parent.children.push(state)
            moveToNext(nextIndex)
          }
        }
      }
    }

    self.recursivelyCloseState(root)
    return root.children!
  }

  /**
   * override
   */
  public parse(
    codePoints: DataNodeTokenPointDetail[],
    startIndex: number,
    endIndex: number,
    matchResults?: BlockDataNodeMatchResult[],
  ): BlockDataNode[] {
    const self = this
    if (matchResults == null) {
      // eslint-disable-next-line no-param-reassign
      matchResults = self.match(codePoints, startIndex, endIndex)
    }
    return self.deepParse(codePoints, matchResults)
  }

  protected deepParse(
    codePoints: DataNodeTokenPointDetail[],
    matchResults: BlockDataNodeMatchResult[],
  ): BlockDataNode[] {
    const self = this
    const results: BlockDataNode[] = []
    for (const mr of matchResults) {
      const tokenizer = self.tokenizerMap.get(mr.type)
      if (tokenizer == null) {
        throw new TypeError(`unknown matched result: ${ JSON.stringify(mr) }`)
      }

      let children: BlockDataNode[] | undefined
      if (mr.children != null) {
        children = self.deepParse(codePoints, mr.children)
      }
      const result = tokenizer.parse(codePoints, mr, children, self.inlineDataNodeParseFunc)
      results.push(result)
    }
    return results
  }


  /**
   * 递归关闭未匹配到状态处于 opening 的块
   * Recursively close unmatched opening blocks
   * @param state
   */
  protected recursivelyCloseState(state: BlockDataNodeMatchState): void {
    const self = this
    if (!state.opening) return
    if (state.children != null && state.children.length > 0) {
      self.recursivelyCloseState(state.children[state.children.length - 1])
    }

    const tokenizer = self.tokenizerMap.get(state.type)
    if (tokenizer != null && tokenizer.closeMatchState != null) {
      tokenizer.closeMatchState(state)
    }
    // eslint-disable-next-line no-param-reassign
    state.opening = false
  }

  /**
   * Add tokenizer to this.tokenizerMap
   * @param tokenizer
   */
  protected registerTokenizer(tokenizer: BlockDataNodeTokenizer) {
    for (const t of tokenizer.recognizedTypes) {
      this.tokenizerMap.set(t, tokenizer)
    }
  }
}
