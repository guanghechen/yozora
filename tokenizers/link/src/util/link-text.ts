import type { NodePoint } from '@yozora/character'
import { AsciiCodePoint } from '@yozora/character'
import type { YastToken } from '@yozora/core-tokenizer'

/**
 * The link text may contain balanced brackets, but not unbalanced ones,
 * unless they are escaped
 *
 * @see https://github.github.com/gfm/#example-520
 * @see https://github.github.com/gfm/#example-521
 * @see https://github.github.com/gfm/#example-522
 * @see https://github.github.com/gfm/#example-523
 */
export const checkBalancedBracketsStatus = (
  startIndex: number,
  endIndex: number,
  innerStates: ReadonlyArray<YastToken>,
  nodePoints: ReadonlyArray<NodePoint>,
): -1 | 0 | 1 => {
  let i = startIndex
  let bracketCount = 0

  // update bracketCount
  const updateBracketCount = (): void => {
    const c = nodePoints[i].codePoint
    switch (c) {
      case AsciiCodePoint.BACKSLASH:
        i += 1
        break
      case AsciiCodePoint.OPEN_BRACKET:
        bracketCount += 1
        break
      case AsciiCodePoint.CLOSE_BRACKET:
        bracketCount -= 1
        break
    }
  }

  for (const innerState of innerStates) {
    for (; i < innerState.startIndex; ++i) {
      updateBracketCount()
      if (bracketCount < 0) return -1
    }
    i = innerState.endIndex
  }

  for (; i < endIndex; ++i) {
    updateBracketCount()
    if (bracketCount < 0) return -1
  }
  return bracketCount > 0 ? 1 : 0
}
