import type { NodeInterval } from '@yozora/character'
import type {
  YastNode,
  YastParent,
  YastResource,
  YastToken,
  YastTokenDelimiter,
} from '@yozora/core-tokenizer'

/**
 * typeof Autolink
 */
export const AutolinkType = 'autolink'
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AutolinkType = typeof AutolinkType

// Content type of autolink
export type AutolinkContentType = 'uri' | 'email'

/**
 *
 * @example
 *    ````markdown
 *    ````
 *    ===>
 *    ```js
 *    ```
 * @see https://github.github.com/gfm/#autolink
 */
export interface Autolink
  extends YastNode<AutolinkType>,
    YastResource,
    YastParent {}

/**
 * An autolink token.
 */
export interface AutolinkToken extends YastToken<AutolinkType> {
  /**
   * Autolink content type: absolute uri or email.
   */
  contentType: AutolinkContentType
  /**
   * Auto link content.
   */
  content: NodeInterval
}

/**
 * Delimiter of AutolinkToken.
 */
export interface AutolinkTokenDelimiter extends YastTokenDelimiter {
  type: 'full'
  /**
   * Autolink content type: absolute uri or email.
   */
  contentType: AutolinkContentType
  /**
   * Auto link content.
   */
  content: NodeInterval
}
