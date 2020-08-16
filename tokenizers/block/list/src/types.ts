import {
  BlockDataNode,
  BlockTokenizerMatchPhaseState,
  BlockTokenizerParsePhaseState,
} from '@yozora/tokenizercore-block'


/**
 * typeof ListDataNode
 */
export const ListDataNodeType = 'LIST'
export type ListDataNodeType = typeof ListDataNodeType


/**
 * State of pre-match phase of ListTokenizer
 */
export interface ListItemDataNode extends
  BlockDataNode, BlockTokenizerParsePhaseState {
  /**
   * 列表类型
   * list type
   */
  listType: 'bullet' | 'ordered' | string
  /**
   * 列表标记或分隔符
   * marker of bullet list-item, and delimiter of ordered list-item
   */
  marker: number
  /**
   * whether exists blank line in the list-item
   */
  spread: boolean
  /**
   * 最后一行是否为空行
   * Whether the last line is blank line or not
   */
  isLastLineBlank: boolean
}


/**
 * 列表
 * List (Parent) represents a list of items.
 *
 * @example
 *    ````markdown
 *    1. foo
 *    ````
 *    ===>
 *    ```js
 *    {
 *      type: 'LIST',
 *      start: 1,
 *      listType: 'ordered',
 *      delimiter: '.',
 *      spread: false,
 *      children: [{
 *        type: 'LIST_ITEM',
 *        spread: false,
 *        children: [{
 *          type: 'PARAGRAPH',
 *          children: [{ type: 'TEXT', value: 'foo' }]
 *        }]
 *      }]
 *    }
 *    ```
 * @see https://github.com/syntax-tree/mdast#list
 * @see https://github.github.com/gfm/#list
 */
export interface ListDataNode extends
  BlockDataNode<ListDataNodeType>,
  BlockTokenizerParsePhaseState<ListDataNodeType> {
  /**
* 列表类型
* list type
*/
  listType: 'bullet' | 'ordered' | string
  /**
   * 列表标记或分隔符
   * marker of bullet list-item, and delimiter of ordered list-item
   */
  marker: number
  /**
   * whether exists blank line in the list-item
   */
  spread: boolean
  /**
   * Lists are container block
   */
  children: ListItemDataNode[]
}


/**
 * State of pre-match phase of ListTokenizer
 */
export interface ListItemMatchPhaseState
  extends BlockTokenizerMatchPhaseState<ListDataNodeType> {
  /**
   * 列表类型
   * list type
   */
  listType: 'bullet' | 'ordered' | string
  /**
   * 列表标记或分隔符
   * marker of bullet list-item, and delimiter of ordered list-item
   */
  marker: number
  /**
   * whether exists blank line in the list-item
   */
  spread: boolean
  /**
   * 最后一行是否为空行
   * Whether the last line is blank line or not
   */
  isLastLineBlank: boolean
}

/**
 * State of match phase of ListTokenizer
 */
export interface ListMatchPhaseState
  extends BlockTokenizerMatchPhaseState<ListDataNodeType> {
  /**
   * 列表类型
   * list type
   */
  listType: 'bullet' | 'ordered' | string
  /**
   * 列表标记或分隔符
   * marker of bullet list-item, and delimiter of ordered list-item
   */
  marker: number
  /**
   * whether exists blank line in the list-item
   */
  spread: boolean
}