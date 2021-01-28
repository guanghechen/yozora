import type {
  EnhancedYastNodePoint,
  YastNodeInterval,
} from '@yozora/tokenizercore'
import type { YastBlockNode } from '../node'
import type { BlockTokenizerMatchPhaseState } from './lifecycle/match'
import type { BlockTokenizerPostMatchPhaseState } from './lifecycle/post-match'


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
export interface PhrasingContent extends YastBlockNode<PhrasingContentType> {
  /**
   * Inline data nodes
   */
  contents: EnhancedYastNodePoint[]
}


/**
 * State of match phase of PhrasingContentTokenizer.
 */
export type PhrasingContentMatchPhaseState =
  & BlockTokenizerMatchPhaseState<PhrasingContentType>
  & PhrasingContentMatchPhaseStateData


/**
 * State on post-match phase of PhrasingContentTokenizer.
 */
export type PhrasingContentPostMatchPhaseState=
  & BlockTokenizerPostMatchPhaseState<PhrasingContentType>
  & PhrasingContentMatchPhaseStateData


/**
 * State data on match phase of PhrasingContentTokenizer
 */
export interface PhrasingContentMatchPhaseStateData {
  /**
   * Lines of a PhrasingContent.
   */
  lines: PhrasingContentLine[]
}


/**
 * Phrasing content lines
 */
export interface PhrasingContentLine extends YastNodeInterval {
  /**
   * Array of EnhancedYastNodePoint which contains all the contents of this line.
   */
  nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
  /**
   * The index of first non-blank character in the rest of the current line
   */
  firstNonWhitespaceIndex: number
}
