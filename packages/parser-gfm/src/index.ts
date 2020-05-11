import { BaseDataNodeParser, DataNodeParser } from '@yozora/parser-core'
import { DeleteTokenizer } from '@yozora/tokenizer-delete'
import { EmphasisTokenizer } from '@yozora/tokenizer-emphasis'
import { ImageTokenizer } from '@yozora/tokenizer-image'
import { InlineCodeTokenizer } from '@yozora/tokenizer-inline-code'
import { InlineFormulaTokenizer } from '@yozora/tokenizer-inline-formula'
import {
  InlineHtmlCommentTokenizer,
} from '@yozora/tokenizer-inline-html-comment'
import { LineBreakTokenizer } from '@yozora/tokenizer-line-break'
import { LinkTokenizer } from '@yozora/tokenizer-link'
import { ReferenceImageTokenizer } from '@yozora/tokenizer-reference-image'
import { ReferenceLinkTokenizer } from '@yozora/tokenizer-reference-link'
import { TextTokenizer } from '@yozora/tokenizer-text'
import {
  DataNode,
  DataNodeTokenPointDetail,
  DefaultInlineDataNodeTokenizerContext,
  InlineDataNodeMatchResult,
} from '@yozora/tokenizercore'


export class GFMDataNodeParser implements DataNodeParser {
  protected readonly dataNodeParser: DataNodeParser

  public constructor() {
    const inlineContext = new DefaultInlineDataNodeTokenizerContext(TextTokenizer)
    inlineContext
      .useTokenizer(new DeleteTokenizer({ priority: 1 }))
      .useTokenizer(new EmphasisTokenizer({ priority: 1 }))
      .useTokenizer(new LineBreakTokenizer({ priority: 2 }))
      .useTokenizer(new ReferenceLinkTokenizer({ priority: 3 }))
      .useTokenizer(new ReferenceImageTokenizer({ priority: 3.1 }))
      .useTokenizer(new LinkTokenizer({ priority: 3 }))
      .useTokenizer(new ImageTokenizer({ priority: 3.1 }))
      .useTokenizer(new InlineFormulaTokenizer({ priority: 4 }))
      .useTokenizer(new InlineCodeTokenizer({ priority: 4 }))
      .useTokenizer(new InlineHtmlCommentTokenizer({ priority: 4 }))
    const gfmDataNodeParser = new BaseDataNodeParser(inlineContext)
    this.dataNodeParser = gfmDataNodeParser
  }

  /**
   * match content
   */
  public matchInlineData(
    content: string,
    codePoints?: DataNodeTokenPointDetail[],
    startIndex?: number,
    endIndex?: number,
  ): InlineDataNodeMatchResult[] {
    return this.dataNodeParser.matchInlineData(content, codePoints, startIndex, endIndex)
  }

  /**
   * parse matched results
   */
  public parseInlineData(
    content: string,
    codePoints?: DataNodeTokenPointDetail[],
    startIndex?: number,
    endIndex?: number,
    tokenPositions?: InlineDataNodeMatchResult[],
  ): DataNode[] {
    return this.dataNodeParser.parseInlineData(
      content, codePoints, startIndex, endIndex, tokenPositions)
  }
}


export const gfmDataNodeParser = new GFMDataNodeParser()
