import type { YastBlockNodeMeta, YastBlockNodeType } from '../node'
import type { BlockTokenizerMatchPhaseState } from './match'


/**
 * Hooks in the parse phase
 */
export interface BlockTokenizerParsePhaseHook<
  T extends YastBlockNodeType = YastBlockNodeType,
  MS extends BlockTokenizerMatchPhaseState<T> = BlockTokenizerMatchPhaseState<T>,
  PS extends BlockTokenizerParsePhaseState<T> = BlockTokenizerParsePhaseState<T>,
  M extends unknown = unknown
  > {
  /**
   * Parse matchStates
   *
   * @returns
   *  - {PS}: parsed ParsePhaseState
   *  - {null}: ignore this ParserPhaseState
   */
  parse: (
    matchPhaseState: MS,
    parsedChildren?: BlockTokenizerParsePhaseState[],
  ) => ResultOfParse<T, PS>

  /**
   * Parse meta nodes
   */
  parseMeta?: (parsePhaseStates: PS[]) => M
}


/**
 * State on parse phase
 */
export interface BlockTokenizerParsePhaseState<
  T extends YastBlockNodeType = YastBlockNodeType,
  > {
  /**
   * Type of DataNode
   */
  type: T
  /**
   * List of child nodes of current data node
   */
  children?: BlockTokenizerParsePhaseState[]
}


/**
 * State-tree on parse phase
 */
export interface BlockTokenizerParsePhaseStateTree<
  M extends YastBlockNodeMeta = YastBlockNodeMeta
  > {
  /**
   * The root node identifier of the ParsePhaseStateTree
   */
  type: 'root'
  /**
   * Metadata of the block data state tree in the parse phase
   */
  meta: M
  /**
   * List of child nodes of current data node
   */
  children: BlockTokenizerParsePhaseState[]
}


/**
 * Result data type of {BlockTokenizerParsePhaseHook.parse}
 *
 *  * success => { type: 'flow' | 'meta', state: PS }
 *    - classification: classify YastNode
 *      - *flow*: Represents this YastNode is in the Document-Flow
 *      - *meta*: Represents this YastNode is a meta data node
 *    - state: the parsed data node
 *
 *  * failure => null
 */
export type ResultOfParse<
  T extends YastBlockNodeType = YastBlockNodeType,
  PS extends BlockTokenizerParsePhaseState<T> = BlockTokenizerParsePhaseState<T>> =
  | { classification: 'flow' | 'meta', state: PS }
  | null
