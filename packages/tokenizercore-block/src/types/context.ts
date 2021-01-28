import type {
  EnhancedYastNodePoint,
  YastMeta,
  YastNodePosition,
} from '@yozora/tokenizercore'
import type { YastBlockNodeType, YastBlockRoot } from './node'
import type {
  BlockTokenizer,
  BlockTokenizerMatchPhaseHook,
  BlockTokenizerMatchPhaseState,
  BlockTokenizerParsePhaseHook,
  BlockTokenizerPostMatchPhaseHook,
  BlockTokenizerPostMatchPhaseState,
  BlockTokenizerPostParsePhaseHook,
  PhrasingContent,
  PhrasingContentLine,
  PhrasingContentPostMatchPhaseState,
} from './tokenizer'


export type BlockTokenizerPhase =
  | 'match'
  | 'post-match'
  | 'parse'
  | 'post-parse'


/**
 * set *false* to disable corresponding hook
 */
export type BlockTokenizerHookFlags = {
  'match'?: false
  'post-match'?: false
  'parse'?: false
  'post-parse'?: false
}


export type BlockTokenizerHook =
  | BlockTokenizerMatchPhaseHook
  | BlockTokenizerPostMatchPhaseHook
  | BlockTokenizerParsePhaseHook
  | BlockTokenizerPostParsePhaseHook


export type BlockTokenizerHookAll =
  & BlockTokenizerMatchPhaseHook
  & BlockTokenizerPostMatchPhaseHook
  & BlockTokenizerParsePhaseHook
  & BlockTokenizerPostParsePhaseHook


export type ImmutableBlockTokenizerContext<M extends YastMeta = YastMeta> =
  Pick<
    BlockTokenizerContext<M>,
    | 'match'
    | 'postMatch'
    | 'parse'
    | 'postParse'
    | 'extractPhrasingContentLines'
    | 'buildPhrasingContentPostMatchPhaseState'
    | 'buildPhrasingContentParsePhaseState'
    | 'buildPostMatchPhaseState'
  >


/**
 * Context of BlockTokenizer.
 */
export interface BlockTokenizerContext<M extends YastMeta = YastMeta> {
  /**
   * Register tokenizer and hook into context
   * @param tokenizer
   * @param lifecycleHookFlags  `false` represented skipped that phase
   */
  useTokenizer: <T extends YastBlockNodeType>(
    tokenizer:
      & BlockTokenizer<
        T & any,
        BlockTokenizerMatchPhaseState<T> & any,
        BlockTokenizerPostMatchPhaseState<T> & any>
      & Partial<BlockTokenizerHook>,
    lifecycleHookFlags?: Readonly<BlockTokenizerHookFlags>,
  ) => this

  /**
   * Called on match phase
   * @param nodePoints
   * @param startIndex
   * @param endIndex
   */
  match: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    startIndex: number,
    endIndex: number,
  ) => BlockTokenizerContextMatchPhaseStateTree

  /**
   * Called on post-match phase
   * @param nodePoints
   * @param matchPhaseStateTree
   */
  postMatch: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    matchPhaseStateTree: BlockTokenizerContextMatchPhaseStateTree,
  ) => BlockTokenizerContextPostMatchPhaseStateTree

  /**
   * Called on parse phase
   * @param nodePoints
   * @param postMatchPhaseStateTree
   */
  parse: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    postMatchPhaseStateTree: BlockTokenizerContextPostMatchPhaseStateTree,
  ) => YastBlockRoot<M>

  /**
   * Called on post-parse-phase
   * @param nodePoints
   * @param parsePhaseStateTree
   */
  postParse: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    parsePhaseStateTree: YastBlockRoot<M>,
  ) => YastBlockRoot<M>

  /**
   * Extract array of PhrasingContentLine from a given BlockTokenizerMatchPhaseState
   *
   * @param state
   */
  extractPhrasingContentLines: (
    state: BlockTokenizerMatchPhaseState,
  ) => ReadonlyArray<PhrasingContentLine> | null

  /**
   * Build PhrasingContentPostMatchPhaseState from array of PhrasingContentLine
   *
   * @param nodePoints
   * @param lines
   */
  buildPhrasingContentPostMatchPhaseState: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    lines: ReadonlyArray<PhrasingContentLine>,
  ) => PhrasingContentPostMatchPhaseState | null

  /**
   * Build PhrasingContentMatchPhaseState from array of PhrasingContentLine
   *
   * @param nodePoints
   * @param lines
   */
  buildPhrasingContentParsePhaseState: (
    nodePoints: ReadonlyArray<EnhancedYastNodePoint>,
    lines: ReadonlyArray<PhrasingContentLine>,
  ) => PhrasingContent | null

  /**
   * Build BlockTokenizerPostMatchPhaseState.
   *
   * @param nodePoints
   * @param originalState
   * @param lines
   */
  buildPostMatchPhaseState: (
    originalState: BlockTokenizerPostMatchPhaseState,
    lines: ReadonlyArray<PhrasingContentLine>,
  ) => BlockTokenizerPostMatchPhaseState | null
}


/**
 * State on match phase of BlockTokenizerContext
 */
export interface BlockTokenizerContextMatchPhaseState {
  /**
   * State of tokenizer on match phase.
   */
  data: BlockTokenizerMatchPhaseState
  /**
   * Location of a node in the source contents.
   */
  position: YastNodePosition
  /**
   * List of child node of current state node
   */
  children: BlockTokenizerContextMatchPhaseState[]
}


/**
 * State tree on match phase of BlockTokenizerContext
 */
export interface BlockTokenizerContextMatchPhaseStateTree {
  /**
   * State of tokenizer on match phase.
   */
  data: BlockTokenizerMatchPhaseState
  /**
   * Location of a node in the source contents.
   */
  position: YastNodePosition
  /**
   * List of child node of current state node
   */
  children: BlockTokenizerContextMatchPhaseState[]
}


/**
 * State on post-match phase tree of BlockTokenizerContext
 */
export interface BlockTokenizerContextPostMatchPhaseState
  extends BlockTokenizerPostMatchPhaseState {
  /**
   * List of child node of current state node.
   */
  children?: BlockTokenizerContextPostMatchPhaseState[]
}


/**
 * State on post-match phase of BlockTokenizerContext
 */
export interface BlockTokenizerContextPostMatchPhaseStateTree {
  /**
   * The root node identifier of the BlockTokenizerContextPostMatchPhaseStateTree
   */
  type: 'root'
  /**
   * Location of a node in the source contents.
   */
  position: YastNodePosition
  /**
   * List of child nodes of current data node
   */
  children: BlockTokenizerContextPostMatchPhaseState[]
}
