import {
  PhrasingContentDataNode,
  PhrasingContentMatchPhaseState,
} from '@yozora/tokenizer-paragraph'
import {
  BlockDataNode,
  BlockTokenizerMatchPhaseState,
  BlockTokenizerParsePhaseState,
} from '@yozora/tokenizercore-block'


/**
 * typeof SetextHeadingDataNode
 */
export const SetextHeadingDataNodeType = 'SETEXT_HEADING'
export type SetextHeadingDataNodeType = typeof SetextHeadingDataNodeType


/**
 *
 * @example
 *    ````markdown
 *    Foo
 *    Bar
 *    ---
 *    ````
 *    ===>
 *    ```js
 *    {
 *      type: 'SETEXT_HEADING',
 *      depth: 2,
 *      children: [{ type: 'TEXT', value: 'Foo\nBar' }]
 *    }
 *    ```
 * @see https://github.github.com/gfm/#setext-heading
 */
export interface SetextHeadingDataNode extends
  BlockDataNode<SetextHeadingDataNodeType>,
  BlockTokenizerParsePhaseState<SetextHeadingDataNodeType> {
  /**
   * 标题的级别
   * level of heading
   */
  depth: number
  /**
   * 标题内容
   * Contents of heading
   */
  children: [PhrasingContentDataNode]
}


/**
 * State of match phase of SetextHeadingTokenizer
 */
export interface SetextHeadingMatchPhaseState
  extends BlockTokenizerMatchPhaseState<SetextHeadingDataNodeType> {
  /**
   * Level of heading
   */
  depth: number
  /**
   * Contents of heading
   */
  children: [PhrasingContentMatchPhaseState]
}
