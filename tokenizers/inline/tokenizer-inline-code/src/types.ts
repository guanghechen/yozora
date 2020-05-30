import {
  InlineDataNode,
  InlinePotentialToken,
  InlineTokenDelimiter,
  InlineTokenizerMatchPhaseState,
  InlineTokenizerParsePhaseState,
  InlineTokenizerPreMatchPhaseState,
} from '@yozora/tokenizercore-inline'


/**
 * typeof InlineCodeDataNode
 */
export const InlineCodeDataNodeType = 'INLINE_CODE'
export type InlineCodeDataNodeType = typeof InlineCodeDataNodeType


/**
 * 行内代码
 *
 * @example
 *    ````markdown
 *    `alpha` `\`beta\``
 *    ````
 *    ===>
 *    ```json
 *    [
 *      {
 *        "type": "INLINE_CODE",
 *        "value": "alpha"
 *      },
 *      {
 *        "type": "TEXT",
 *        "value": " "
 *      },
 *      {
 *        "type": "INLINE_CODE",
 *        "value": "`beta`"
 *      }
 *    ]
 *    ```
 * @see https://github.com/syntax-tree/mdast#inline-code
 * @see https://github.github.com/gfm/#code-span
 */
export interface InlineCodeDataNode extends
  InlineDataNode<InlineCodeDataNodeType>,
  InlineTokenizerParsePhaseState<InlineCodeDataNodeType> {
  /**
   * 代码内容
   */
  value: string
}


/**
 * Delimiter of InlineCodeToken
 */
export interface InlineCodeTokenDelimiter
  extends InlineTokenDelimiter<'opener' | 'both' | 'closer'> {

}


/**
 * Potential token of InlineCode
 */
export interface InlineCodePotentialToken
  extends InlinePotentialToken<InlineCodeDataNodeType, InlineCodeTokenDelimiter> {
  /**
   * Start/Left Delimiter of InlineCodeToken
   */
  openerDelimiter: InlineCodeTokenDelimiter
  /**
   * End/Right Delimiter of InlineCodeToken
   */
  closerDelimiter: InlineCodeTokenDelimiter
}


/**
 * State of pre-match phase of InlineCodeTokenizer
 */
export interface InlineCodePreMatchPhaseState
  extends InlineTokenizerPreMatchPhaseState<InlineCodeDataNodeType> {
  /**
   * Start/Left Delimiter of InlineCodeToken
   */
  openerDelimiter: InlineCodeTokenDelimiter
  /**
   * End/Right Delimiter of InlineCodeToken
   */
  closerDelimiter: InlineCodeTokenDelimiter
}


/**
 * State of match phase of InlineCodeTokenizer
 */
export interface InlineCodeMatchPhaseState
  extends InlineTokenizerMatchPhaseState<InlineCodeDataNodeType> {
  /**
   * Start/Left Delimiter of InlineCodeToken
   */
  openerDelimiter: InlineCodeTokenDelimiter
  /**
   * End/Right Delimiter of InlineCodeToken
   */
  closerDelimiter: InlineCodeTokenDelimiter
  /**
   * Contents of InlineCode
   */
  contents: {
    /**
     *
     */
    startIndex: number
    /**
     *
     */
    endIndex: number
  }
}
