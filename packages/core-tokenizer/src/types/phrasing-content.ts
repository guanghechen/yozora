import type { NodeInterval, NodePoint } from '@yozora/character'
import type { YastBlockState } from './lifecycle/match-block'
import type { YastNode } from './node'

/**
 * typeof PhrasingContent
 */
export const PhrasingContentType = 'phrasingContent'
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type PhrasingContentType = typeof PhrasingContentType

/**
 * Phrasing content represent the text in a document, and its markup.
 *
 * @see https://github.com/syntax-tree/mdast#phrasingcontent
 */
export interface PhrasingContent extends YastNode<PhrasingContentType> {
  /**
   * Inline data nodes
   */
  contents: NodePoint[]
}

/**
 * Middle state during the whole match and parse phase.
 */
export interface PhrasingContentState
  extends YastBlockState<PhrasingContentType> {
  /**
   * Lines of a PhrasingContent.
   */
  lines: PhrasingContentLine[]
}

/**
 * Phrasing content lines
 */
export interface PhrasingContentLine extends NodeInterval {
  /**
   * Array of NodePoint which contains all the contents of this line.
   */
  nodePoints: ReadonlyArray<NodePoint>
  /**
   * The index of first non-blank character in the rest of the current line
   */
  firstNonWhitespaceIndex: number
  /**
   * The precede space count, one tab equals four space.
   * @see https://github.github.com/gfm/#tabs
   */
  countOfPrecedeSpaces: number
}
