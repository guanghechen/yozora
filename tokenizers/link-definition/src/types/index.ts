import type { YastAssociation } from '@yozora/tokenizercore'
import type {
  BlockTokenizerMatchPhaseState,
  BlockTokenizerPostMatchPhaseState,
  PhrasingContentLine,
  YastBlockNode,
} from '@yozora/tokenizercore-block'
import type { LinkDestinationCollectingState } from '../util/link-destination'
import type { LinkLabelCollectingState } from '../util/link-label'
import type { LinkTitleCollectingState } from '../util/link-title'


/**
 * typeof LinkDefinition
 */
export const LinkDefinitionType = 'linkDefinition'
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LinkDefinitionType = typeof LinkDefinitionType


/**
 * data of LinkDefinition
 *
 *  * @example
 *    ````markdown
 *    [Alpha]: https://example.com "title"
 *    ````
 *    ===>
 *    ```json
 *    {
 *      "type": "root",
        "meta": {
          "linkDefinition": {
            "foo": {
              "type": "linkDefinition",
              "identifier": "bravo",
              "label": "Bravo",
              "destination": "https://example.com",
              "title": "title"
            }
          }
        }
      }
 *    ```
 *
 * @see https://github.com/syntax-tree/mdast#definition
 */
export interface LinkDefinition extends YastAssociation, YastBlockNode<LinkDefinitionType> {
  /**
   * Link destination
   */
  destination: string
  /**
   * Link title
   */
  title?: string
}


/**
 * State on match phase of LinkDefinitionTokenizer
 */
export type LinkDefinitionMatchPhaseState =
  & BlockTokenizerMatchPhaseState<LinkDefinitionType>
  & LinkDefinitionMatchPhaseStateData


/**
 * State on post-match phase of LinkDefinitionTokenizer
 */
export type LinkDefinitionPostMatchPhaseState =
  & BlockTokenizerPostMatchPhaseState<LinkDefinitionType>
  & LinkDefinitionMatchPhaseStateData


/**
 * State data on match phase of LinkDefinitionTokenizer
 */
export interface LinkDefinitionMatchPhaseStateData {
  /**
   *
   */
  lines: PhrasingContentLine[]
  /**
   * Link label
   * Trimmed, Case-Insensitive
   */
  label: LinkLabelCollectingState
  /**
   * Link destination
   */
  destination: LinkDestinationCollectingState | null
  /**
   * Link title
   */
  title: LinkTitleCollectingState | null
  /**
   * The line number of the first matched character of the link label
   */
  lineNoOfLabel: number
  /**
   * The line number of the first matched character of the link destination
   */
  lineNoOfDestination: number
  /**
   * The line number of the first matched character of the link title
   */
  lineNoOfTitle: number
}


/**
 * Meta data of LinkDefinition
 */
export interface LinkDefinitionMetaData {
  /**
   * <label, LinkDefinitionData>
   * Label is a trimmed and case-insensitive string
   */
  [label: string]: LinkDefinition
}