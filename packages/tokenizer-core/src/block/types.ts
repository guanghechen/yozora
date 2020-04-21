import { DataNode, DataNodeData, DataNodeType } from '../_types/data-node'
import { DataNodeMatchResult, DataNodeTokenPointDetail } from '../_types/token'
import {
  DataNodeTokenizer,
  DataNodeTokenizerConstructor,
  DataNodeTokenizerConstructorParams,
} from '../_types/tokenizer'
import {
  DataNodeMatchFunc,
  DataNodeParseFunc,
  DataNodeTokenizerContext,
} from '../_types/tokenizer-context'
import { InlineDataNodeParseFunc } from '../inline/types'


/**
 * 块状数据节点的类型
 * Type of BlockDataNode
 */
export type BlockDataNodeType = DataNodeType & string


/**
 * 块状数据节点的数据
 * Data of BlockDataNode
 */
export interface BlockDataNodeData extends DataNodeData {

}


/**
 * 块状数据节点 / 解析结果
 * BlockDataNode / BlockDataNodeParseResult
 */
export interface BlockDataNode<
  T extends BlockDataNodeType = BlockDataNodeType,
  D extends BlockDataNodeData = BlockDataNodeData,
  > extends DataNode<T, D> {

}


export interface BlockDataNodeEatingLineInfo {
  /**
   * 当前行剩余内容起始的下标
   * The starting index of the rest of the current line
   */
  startIndex: number
  /**
   * 当前行结束的下标
   * The ending index of the rest of the current line
   */
  endIndex: number
  /**
   * 当前行剩余内容第一个非空白字符的下标
   * The index of first non-blank character in the rest of the current line
   */
  firstNonWhiteSpaceIndex: number
  /**
   * 当前行剩余内容是否为空行
   * Whether the remaining content of the current line is blank
   */
  isBlankLine: boolean
}


export interface BlockDataNodeEatingResult<
  T extends BlockDataNodeType,
  MS extends BlockDataNodeMatchState<T>> {
  /**
   * 下一个匹配点的下标
   */
  nextIndex: number
  /**
   * 匹配到的 state 的根节点
   */
  state: MS
  /**
   * 下一个 state
   */
  nextState?: BlockDataNodeMatchState
}


/**
 * 块数据匹配过程的状态，即匹配过程的中间数据
 * The state of the block data matching process,
 * that is, the intermediate data in the matching process
 */
export interface BlockDataNodeMatchState<
  T extends BlockDataNodeType = BlockDataNodeType,
  > {
  /**
   * 块数据类型
   * type of BlockDataNode
   */
  type: T
  /**
   * 是否处于开放（可修改）状态
   * Is it in an opening (modifiable) state
   * @see https://github.github.com/gfm/#phase-1-block-structure
   */
  opening: boolean
  /**
   * 父节点
   * parent MatchState
   */
  parent: BlockDataNodeMatchState
  /**
   * 子节点列表
   * children MatchState
   */
  children?: BlockDataNodeMatchState[]
}


/**
 * 块状数据匹配到的结果
 * The result of matching the block data
 */
export interface BlockDataNodeMatchResult<T extends BlockDataNodeType = BlockDataNodeType>
  extends DataNodeMatchResult<T> {
  children?: BlockDataNodeMatchResult[]
}


export interface BlockDataNodeTokenizer<
  T extends BlockDataNodeType = BlockDataNodeType,
  D extends BlockDataNodeData = BlockDataNodeData,
  MS extends BlockDataNodeMatchState<T> = BlockDataNodeMatchState<T>,
  MR extends BlockDataNodeMatchResult<T> = BlockDataNodeMatchResult<T>,
  > extends DataNodeTokenizer<T> {
  /**
   * 子级分词器列表，不直接被 BlockDataNodeTokenizerContext 所感知，即
   *  - 在 `context.match` 操作中不受 context 指派，而受当前的 tokenizer 委托；
   *  - 而在 `context.parse` 操作中，context 可以通过 MatchResult.type 发现和使用此 subTokenizer
   *
   * The list of sublevel tokenizers which are not directly perceived by
   * BlockDataNodeTokenizerContext, that is:
   *  - During the `context.match` called, these sublevel tokenizers will never be assigned
   *    by context, but delegated by current tokenizer;
   *  - During the `context.parse` called, context can find through `MatchResult.type` and
   *    delegate the parsing task to it.
   */
  readonly subTokenizers: BlockDataNodeTokenizer[]

  /**
   * 添加子级分词器
   * use sublevel BlockDataNodeTokenizer
   */
  useSubTokenizer(tokenizer: BlockDataNodeTokenizer): this

  /**
   * 尝试匹配新的块数据；
   * 返回的数据中，nextIndex 仅当 BlockDataNodeMatchResult 非空时有效
   * Try to match new block data.
   * In the returned data, nextIndex is only valid when BlockDataNodeMatchResult
   * is not null/undefined.
   *
   * @param codePoints
   * @param eatingLineInfo
   * @param parentState
   * @see https://github.github.com/gfm/#phase-1-block-structure step2
   */
  eatNewMarker(
    codePoints: DataNodeTokenPointDetail[],
    eatingLineInfo: BlockDataNodeEatingLineInfo,
    parentState: BlockDataNodeMatchState,
  ): BlockDataNodeEatingResult<T, MS> | null

  /**
   * 尝试继续匹配延续文本，判断其是否仍处于 opening 状态；
   * 返回的数据中，nextIndex 仅当 isMatched 为 true 时有效
   * Try to eat the Continuation Text, and check if it is still satisfied
   * to current opening MatchState, if matches, append to the previous
   * matching content.
   * In the returned data, nextIndex is only valid if isMatched is true.
   *
   * @param codePoints
   * @param eatingLineInfo
   * @param state
   * @see https://github.github.com/gfm/#phase-1-block-structure step1
   */
  eatContinuationText?(
    codePoints: DataNodeTokenPointDetail[],
    eatingLineInfo: BlockDataNodeEatingLineInfo,
    state: MS,
  ): BlockDataNodeEatingResult<T, MS> | null

  /**
   * 尝试继续匹配 Laziness 延续文本，判断其是否仍处于 opening 状态；
   * 返回的数据中，nextIndex 仅当 isMatched 为 true 时有效
   * Try to eat the Laziness Continuation Text, and check if it is still
   * satisfied to current opening MatchState, if matches, append to the
   * previous matching content.
   * In the returned data, nextIndex is only valid if isMatched is true.
   *
   * @param codePoints
   * @param eatingLineInfo
   * @param matchState
   * @see https://github.github.com/gfm/#phase-1-block-structure step3
   */
  eatLazyContinuationText?(
    codePoints: DataNodeTokenPointDetail[],
    eatingLineInfo: BlockDataNodeEatingLineInfo,
    state: MS,
  ): BlockDataNodeEatingResult<T, MS> | null

  /**
   * Convert MatchState to MatchResult
   */
  match(
    matchState: MS,
    children: BlockDataNodeMatchResult[],
  ): MR

  /**
   * Parse matchResult into block data
   * @param codePoints
   * @param matchResult
   * @param children
   * @param parseInline
   */
  parse(
    codePoints: DataNodeTokenPointDetail[],
    matchResult: MR,
    children?: BlockDataNode[],
    parseInline?: InlineDataNodeParseFunc,
  ): BlockDataNode<T, D>

  /**
   * 判断是否是可接受子节点，若不是，则将当前节点置为 closed 状态，并回溯到祖先节点
   * 继续处理
   *
   * Hook method
   * Check whether the `child` node is accepted as a child node of state:
   *  - `false`:  Rejected this child, and close current MatchState, then
   *              go back to the grandpa node
   *  - `true`:   Accept this child, then `beforeAcceptChild` will be called.
   */
  shouldAcceptChild?(
    state: MS,
    childState: BlockDataNodeMatchState,
  ): boolean

  /**
   * 在添加子节点时被调用（仅对于发生在 BlockDataNodeTokenizerContext 中的添加行为生效）
   *
   * Hook method
   * Called before appending child
   */
  beforeAcceptChild?(
    state: MS,
    childState: BlockDataNodeMatchState,
  ): void

  /**
   * 在 MatchState 结束时被调用，可在此函数中执行一些善尾工作
   *
   * Hook method
   * Called before closing MatchState
   * @param state
   */
  beforeCloseMatchState?(state: MS): void
}


/**
 * 块状数据节点的分词器的构造函数的参数
 * Params for BlockDataNodeTokenizerConstructor
 */
export interface BlockDataNodeTokenizerConstructorParams<
  T extends BlockDataNodeType = BlockDataNodeType,
  > extends DataNodeTokenizerConstructorParams<T> {

}


/**
 * 块状数据词法分析器的构造类接口
 * Constructor of BlockDataNodeTokenizer
 */
export interface BlockDataNodeTokenizerConstructor<
  T extends BlockDataNodeType = BlockDataNodeType,
  DT extends BlockDataNodeTokenizer<T> = BlockDataNodeTokenizer<T>,
  > extends DataNodeTokenizerConstructor<T, BlockDataNodeTokenizer<T>> {
  new(params: DataNodeTokenizerConstructorParams<T>): DT
}


/**
 * 块状数据节点的词法分析器的上下文
 * Context of BlockDataNodeTokenizer
 */
export interface BlockDataNodeTokenizerContext<
  T extends BlockDataNodeType = BlockDataNodeType,
  DT extends BlockDataNodeTokenizer<T> = BlockDataNodeTokenizer<T>,
  MR extends BlockDataNodeMatchResult<T> = BlockDataNodeMatchResult<T>,
  PR extends BlockDataNode<T> = BlockDataNode<T>
  > extends DataNodeTokenizerContext<T, DT, MR, PR> {

}

// match func
export type BlockDataNodeMatchFunc = DataNodeMatchFunc<
  BlockDataNodeType, BlockDataNodeMatchResult>

// parse func
export type BlockDataNodeParseFunc = DataNodeParseFunc<
  BlockDataNodeType, BlockDataNodeMatchResult, BlockDataNode>