import type { YastLiteral, YastNode } from '@yozora/tokenizercore'
import type {
  InlineTokenDelimiter,
  InlineTokenizerMatchPhaseState,
} from '@yozora/tokenizercore-inline'


/**
 * typeof InlineFormula
 */
export const InlineFormulaType = 'inlineFormula'
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type InlineFormulaType = typeof InlineFormulaType


/**
 * 行内数学公式，mathjax 的语法，在 InlineCode 的语法上进行改造，
 * 即在 backtick string 的两侧分别添加美元符号，如：
 *
 *  inline-code (`code`) ===> inline-formula (`$code$`)
 *  inline-code (``code``) ===> inline-formula (``$code$``)
 *
 * @example
 *    ````markdown
 *    `$\displaystyle x^2 + y^2 + z^2 = 1$` `\`beta\`` `\$gamma$`
 *    ````
 *    ===>
 *    ```json
 *    [
 *      {
 *        "type": "inlineFormula",
 *        "value": "displaystyle x^2 + y^2 + z^2 = 1"
 *      },
 *      {
 *        "type": "text",
 *        "value": " "
 *      },
 *      {
 *        "type": "inlineFormula",
 *        "value": "`beta`"
 *      },
 *      {
 *        "type": "text",
 *        "value": " "
 *      },
 *      {
 *        "type": "inlineFormula",
 *        "value": "$gamma$"
 *      }
 *    ]
 *    ```
 */
export interface InlineFormula
  extends YastNode<InlineFormulaType>, YastLiteral { }


/**
 * State on match phase of InlineFormulaTokenizer
 */
export interface InlineFormulaMatchPhaseState
  extends InlineTokenizerMatchPhaseState<InlineFormulaType> {
  /**
   * Thickness of the InlineFormulaDelimiter
   */
  thickness: number
}


/**
 * Delimiter of InlineFormulaToken
 */
export interface InlineFormulaTokenDelimiter
  extends InlineTokenDelimiter {
  type: 'full'
  /**
   * Thickness of the InlineFormulaDelimiter
   */
  thickness: number
}
