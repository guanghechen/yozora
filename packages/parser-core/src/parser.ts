import type { NodePoint } from '@yozora/character'
import type {
  YastMeta,
  YastNode,
  YastParent,
  YastRoot,
} from '@yozora/tokenizercore'
import type {
  BlockTokenizerContext,
  PhrasingContent,
  YastBlockNode,
} from '@yozora/tokenizercore-block'
import type { InlineTokenizerContext } from '@yozora/tokenizercore-inline'
import type { YastParser } from './types'
import { createNodePointGenerator } from '@yozora/character'
import { PhrasingContentType } from '@yozora/tokenizercore-block'


export class DefaultYastParser implements YastParser {
  protected readonly blockContext: BlockTokenizerContext
  protected readonly inlineContext: InlineTokenizerContext

  public constructor(
    blockContext: BlockTokenizerContext,
    inlineContext: InlineTokenizerContext,
  ) {
    this.blockContext = blockContext
    this.inlineContext = inlineContext
  }

  /**
   * @override
   * @see YastParser
   */
  public parse(
    content: string,
    _startIndex?: number,
    _endIndex?: number,
    nodePoints?: ReadonlyArray<NodePoint>,
  ): YastRoot {
    const result: YastRoot = {
      type: 'root',
      meta: {},
      children: [],
    }

    // calc nodePoints from content
    if (nodePoints == null) {
      const nodePointGenerator = createNodePointGenerator(content)
      // eslint-disable-next-line no-param-reassign
      nodePoints = nodePointGenerator.next(null).value!
    }

    // Optimization: directly return when there are no non-blank characters
    if (nodePoints == null || nodePoints.length <= 0) {
      return result
    }

    const startIndex = Math.min(
      nodePoints.length - 1,
      Math.max(0, _startIndex == null ? 0 : _startIndex))
    const endIndex = Math.min(
      nodePoints.length,
      Math.max(0, _endIndex == null ? nodePoints.length : _endIndex))

    // Optimization: directly return when there are no non-blank characters
    if (startIndex >= endIndex) return result

    const matchPhaseStateTree = this.blockContext.match(nodePoints, startIndex, endIndex)
    const postMatchPhaseStateTree = this.blockContext.postMatch(nodePoints, matchPhaseStateTree)
    const tree = this.blockContext.parse(nodePoints, postMatchPhaseStateTree)

    const { children } = this.deepParse(
      tree as unknown as (YastBlockNode & YastParent),
      tree.meta
    )
    result.meta = tree.meta
    result.children = children as YastBlockNode[]
    return result
  }

  /**
   * Parse phrasingContent to inlines.
   *
   * @param o     current data node
   * @param meta  metadata of state tree
   */
  protected deepParse(o: YastBlockNode & YastParent, meta: YastMeta): YastBlockNode {
    if (o.children == null || o.children.length <= 0) return o

    const children: YastNode[] = []
    for (const u of o.children) {
      if (u.type === PhrasingContentType) {
        const phrasingContent = u as PhrasingContent
        const nodePoints: ReadonlyArray<NodePoint> = phrasingContent.contents
        const matchPhaseStateTree = this.inlineContext.match(
          0, nodePoints.length, nodePoints, meta)
        const postMatchPhaseStateTree = this.inlineContext.postMatch(
          matchPhaseStateTree, nodePoints, meta)
        const parsePhaseMetaTree = this.inlineContext.parse(
          postMatchPhaseStateTree, nodePoints, meta)
        children.push(...parsePhaseMetaTree)
      } else {
        const v = this.deepParse(u as YastBlockNode & YastParent, meta)
        children.push(v)
      }
    }

    // eslint-disable-next-line no-param-reassign
    o.children = children
    return o
  }
}
