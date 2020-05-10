import { DataNodeTokenPointDetail } from '@yozora/tokenizer-core'
import { BlockDataNodeType } from '../base'


/**
 *
 */
export interface BlockTokenizerEatingInfo {
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


/**
 * State of pre-match phase
 */
export interface BlockTokenizerPreMatchPhaseState<
  T extends BlockDataNodeType = BlockDataNodeType,
  > {
  /**
   *
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
  parent: BlockTokenizerPreMatchPhaseState
  /**
   *
   */
  children?: BlockTokenizerPreMatchPhaseState[]
}


/**
 * State-tree of pre-match phase
 */
export interface BlockTokenizerPreMatchPhaseStateTree {
  /**
   *
   */
  type: 'root'
  /**
   *
   */
  opening: boolean
  /**
   *
   */
  children: BlockTokenizerPreMatchPhaseState[]
}


/**
 * Hooks in the pre-match phase
 */
export interface BlockTokenizerPreMatchPhaseHook<
  T extends BlockDataNodeType = BlockDataNodeType,
  PMS extends BlockTokenizerPreMatchPhaseState<T> = BlockTokenizerPreMatchPhaseState<T>,
  > {
  /**
   * 尝试匹配新的块数据；
   * 返回的数据中，nextIndex 仅当 BlockDataNodeMatchResult 非空时有效
   * Try to match new block data.
   * In the returned data, nextIndex is only valid when BlockDataNodeMatchResult
   * is not null/undefined.
   *
   * @param codePositions
   * @param eatingInfo
   * @param parentState
   * @see https://github.github.com/gfm/#phase-1-block-structure step2
   */
  eatNewMarker: (
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    parentState: Readonly<BlockTokenizerPreMatchPhaseState>,
  ) => {
    nextIndex: number,
    state: PMS,
    nextState?: BlockTokenizerPreMatchPhaseState
  } | null

  /**
   * 尝试打断上一个兄弟节点的 eatContinuationText 动作
   * 若打断成功，且 shouldRemovePreviousSibling 值为
   *  - true: 替换上一个兄弟节点；将上一个兄弟节点从父元素中删除
   *  - false: 将当前节点追加到上一个兄弟节点的后面
   *
   * Try to interrupt the eatContinuationText action of the last sibling node,
   * if the interruption is successful, and the value of shouldRemovePreviousSibling is:
   *  - true:  Replace the previous sibling node; delete the last previous
   *           node from the parent element
   *  - false: Keep the previous sibling node and append the current node
   *           after the previous sibling node
   *
   * @param codePositions
   * @param eatingInfo
   * @param parentState
   * @param previousSiblingState
   */
  eatAndInterruptPreviousSibling?: (
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    parentState: Readonly<BlockTokenizerPreMatchPhaseState>,
    previousSiblingState: Readonly<BlockTokenizerPreMatchPhaseState>,
  ) => {
    nextIndex: number,
    state: PMS,
    shouldRemovePreviousSibling: boolean,
    nextState?: BlockTokenizerPreMatchPhaseState
  } | null

  /**
   * 尝试继续匹配延续文本，判断其是否仍处于 opening 状态；
   * 返回的数据中，nextIndex 仅当 isMatched 为 true 时有效
   * Try to eat the Continuation Text, and check if it is still satisfied
   * to current opening MatchState, if matches, append to the previous
   * matching content.
   * In the returned data, nextIndex is only valid if isMatched is true.
   *
   * @param codePositions
   * @param eatingInfo
   * @param state
   * @see https://github.github.com/gfm/#phase-1-block-structure step1
   */
  eatContinuationText?: (
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    state: PMS,
  ) => number | -1

  /**
   * 尝试继续匹配 Laziness 延续文本，判断其是否仍处于 opening 状态；
   * 返回的数据中，nextIndex 仅当 isMatched 为 true 时有效
   * Try to eat the Laziness Continuation Text, and check if it is still
   * satisfied to current opening MatchState, if matches, append to the
   * previous matching content.
   * In the returned data, nextIndex is only valid if isMatched is true.
   *
   * @param codePositions
   * @param eatingInfo
   * @param matchState
   * @see https://github.github.com/gfm/#phase-1-block-structure step3
   */
  eatLazyContinuationText?: (
    codePositions: DataNodeTokenPointDetail[],
    eatingInfo: BlockTokenizerEatingInfo,
    state: PMS,
  ) => number | -1

  /**
   * 在 pre-match 阶段的其它钩子都被调用之后，match 阶段开始之前调用
   *
   * Called after all other hooks in pre-match phase and before match phase start
   * @param state
   */
  eatEnd?: (state: PMS) => void

  /**
   * 判断是否是可接受子节点，若不是，则将当前节点置为 closed 状态，并回溯到祖先节点
   * 继续处理
   *
   * Check whether the `child` node is accepted as a child node of state:
   *  - `false`:  Rejected this child, and close current MatchState, then
   *              go back to the grandpa node
   *  - `true`:   Accept this child, then `beforeAcceptChild` will be called.
   */
  shouldAcceptChild?: (
    state: PMS,
    childState: BlockTokenizerPreMatchPhaseState,
  ) => boolean

  /**
   * 在添加子节点时被调用（仅对于发生在 BlockTokenizerContext 中的添加行为生效）
   *
   * Called before appending child
   */
  beforeAcceptChild?: (
    state: PMS,
    childState: BlockTokenizerPreMatchPhaseState,
  ) => void
}