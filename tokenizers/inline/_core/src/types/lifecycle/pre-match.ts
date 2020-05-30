import { DataNodeTokenPointDetail } from '@yozora/tokenizercore'
import { InlineDataNodeType } from '../base'


/**
 *
 */
export interface InlineTokenDelimiter<
  T extends string = 'opener' | 'closer' | 'both'
  > {
  /**
   * Type of Delimiter
   */
  type: T
  /**
   * Start index of this Delimiter in codePositions
   */
  startIndex: number
  /**
   * End index of this Delimiter in codePositions
   */
  endIndex: number
  /**
   * Thickness of this Delimiter
   */
  thickness: number
}


/**
 *
 */
export interface InlinePotentialToken<
  T extends InlineDataNodeType = InlineDataNodeType,
  D extends InlineTokenDelimiter = InlineTokenDelimiter,
  > {
  /**
   * Type of token
   */
  type: T
  /**
   * Start index of Token in codePositions
   */
  startIndex: number
  /**
   * End index of Token in codePositions
   */
  endIndex: number
  /**
   * Start/Left Delimiter of token
   */
  openerDelimiter?: D
  /**
   * End/Right Delimiter of token
   */
  closerDelimiter?: D
  /**
   * Expose the internal list of raw content fragments that need further
   * processing, the list will be handed over to the context for recursive
   * analysis to get the internal tokens of the current inline token.
   *
   * These content fragments will be processed before assemblePreMatchState.
   */
  innerRawContents?: {
    /**
     *
     */
    startIndex: number
    /**
     *
     */
    endIndex: number
  }[]
}


/**
 * State of pre-match phase
 */
export interface InlineTokenizerPreMatchPhaseState<
  T extends InlineDataNodeType = InlineDataNodeType,
  > {
  /**
   * Type of pre-match phase state
   */
  type: T
  /**
   * Start index of State in codePositions
   */
  startIndex: number
  /**
   * End index of State in codePositions
   */
  endIndex: number
  /**
   *
   */
  children?: InlineTokenizerPreMatchPhaseState[]
}


/**
 * State-tree of pre-match phase
 */
export interface InlineTokenizerPreMatchPhaseStateTree {
  /**
   * Root type of pre-match phase state-tree
   */
  type: 'root'
  /**
   * Start index of root state in codePositions
   */
  startIndex: number
  /**
   * End index of root state in codePositions
   */
  endIndex: number
  /**
   *
   */
  children: InlineTokenizerPreMatchPhaseState[]
}


/**
 * Hooks in the pre-match phase
 */
export interface InlineTokenizerPreMatchPhaseHook<
  T extends InlineDataNodeType = InlineDataNodeType,
  PMS extends InlineTokenizerPreMatchPhaseState<T> = InlineTokenizerPreMatchPhaseState<T>,
  TD extends InlineTokenDelimiter = InlineTokenDelimiter,
  PT extends InlinePotentialToken<T, TD> = InlinePotentialToken<T, TD>
  > {
  /**
   * This method will be called many times when processing codePositions
   * of one leaf block node. This is because the content seen by the current
   * tokenizer may be multiple content segments generated by splitting the
   * original content when the tokenizer with higher priority is processed.
   * These fragments will be passed to eatDelimiter for processing in turn.
   *
   * # Params
   *
   * - [startIndex, endIndex) is a half-closed interval that specifies the
   *   range of available positions for codePositions
   *
   * - delimiters is a pre-prepared container for collecting DelimiterItems
   *   found during multiple calls to this function when processing the content
   *   of a leaf block node
   *
   * - precedingCodePosition is the preceding character info of the
   *   codePositions[startIndex] (skipped internal atomic tokens).
   *   `null` means no such character
   *
   * - followingCodePosition is the following character info of the
   *   codePositions[endIndex-1] (skipped internal atomic tokens).
   *   `null` means no such character
   */
  eatDelimiters: (
    codePositions: DataNodeTokenPointDetail[],
    startIndex: number,
    endIndex: number,
    delimiters: TD[],
    precedingCodePosition: DataNodeTokenPointDetail | null,
    followingCodePosition: DataNodeTokenPointDetail | null,
  ) => void

  /**
   * Process the delimiter stack.
   *
   * # Params
   *
   * - delimiters are DelimiterItems collected in the multiple eatDelimiters
   *   executed while processing a leaf block node
   */
  eatPotentialTokens: (
    codePositions: DataNodeTokenPointDetail[],
    delimiters: TD[],
  ) => PT[]

  /**
   * Assemble tokens and innerTokens to PreMatchState
   */
  assemblePreMatchState: (
    codePositions: DataNodeTokenPointDetail[],
    token: PT,
    innerState: InlineTokenizerPreMatchPhaseState[],
  ) => PMS
}
