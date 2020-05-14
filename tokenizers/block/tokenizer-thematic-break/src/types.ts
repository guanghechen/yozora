import {
  BlockDataNode,
  BlockTokenizerParsePhaseState,
} from '@yozora/tokenizercore-block'


/**
 * typeof ThematicBreakDataNode
 */
export const ThematicBreakDataNodeType = 'THEMATIC_BREAK'
export type ThematicBreakDataNodeType = typeof ThematicBreakDataNodeType


/**
 * 分割线
 * ThematicBreak (Node) represents a thematic break, such as a scene change in a story, a transition to another topic, or a new document.
 *
 * @example
 *    ````markdown
 *    ***
 *    ---
 *    ___
 *    ````
 *    ===>
 *    ```js
 *    [
 *      { type: 'THEMATIC_BREAK' },
 *      { type: 'THEMATIC_BREAK' },
 *      { type: 'THEMATIC_BREAK' }
 *    ]
 *    ```
 * @see https://github.com/syntax-tree/mdast#thematicbreak
 */
export interface ThematicBreakDataNode extends
  BlockDataNode<ThematicBreakDataNodeType>,
  BlockTokenizerParsePhaseState<ThematicBreakDataNodeType> {

}
