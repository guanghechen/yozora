import { AsciiCodePoint } from '@yozora/character'
import { DataNodeTokenPointDetail } from '@yozora/tokenizercore'
import { ImageDataNodeMatchState } from './tokenizer'


/**
 * override
 *
 * @see https://github.github.com/gfm/#link-text
 * @see https://github.github.com/gfm/#images
 * @return position at next iteration
 */
export function eatImageDescription(
  codePoints: DataNodeTokenPointDetail[],
  state: ImageDataNodeMatchState,
  openBracketIndex: number,
  closeBracketIndex: number,
  firstSafeIndex: number,
): number {
  if (openBracketIndex - 1 < firstSafeIndex) return -1
  if (codePoints[openBracketIndex - 1].codePoint !== AsciiCodePoint.EXCLAMATION_MARK) return -1

  let i = openBracketIndex - 2
  for (; i >= firstSafeIndex && codePoints[i].codePoint === AsciiCodePoint.BACK_SLASH;) i -= 1
  if ((openBracketIndex - i) & 1) return -1

  /**
   * 将其置为左边界，即便此前已经存在左边界 (state.leftFlanking != null)；
   * 因为必然是先找到了中间边界，且尚未找到对应的右边界，说明之前的左边界和
   * 中间边界是无效的
   */
  // eslint-disable-next-line no-param-reassign
  state.leftFlanking = {
    start: openBracketIndex - 1,
    end: openBracketIndex + 1,
    thickness: 2,
  }
  return closeBracketIndex + 1
}
