import path from 'path'
import {
  TokenizerMatchUseCaseMaster,
  TokenizerParseUseCaseMaster,
  mapBlockTokenizerToMatchFunc,
  mapBlockTokenizerToParseFunc,
} from '@yozora/jest-for-tokenizer'
import { ParagraphTokenizer } from '@yozora/tokenizer-paragraph'
import { PhrasingContentDataNodeType } from '@yozora/tokenizercore-block'
import { HeadingTokenizer } from '../src'


/**
 * create answer (to be checked)
 */
async function answer() {
  const tokenizer = new HeadingTokenizer({ priority: 1 })
  const fallbackTokenizer = new ParagraphTokenizer({ priority: -1 })
  const { match } = mapBlockTokenizerToMatchFunc(fallbackTokenizer, tokenizer)
  const { parse } = mapBlockTokenizerToParseFunc(
    fallbackTokenizer,
    [PhrasingContentDataNodeType],
    tokenizer)

  const caseRootDirectory = path.resolve(__dirname)
  const matchUseCaseMaster = new TokenizerMatchUseCaseMaster(match, caseRootDirectory)
  const parseUseCaseMaster = new TokenizerParseUseCaseMaster(parse, caseRootDirectory)

  const caseDirs: string[] = ['cases']
  for (const caseDir of caseDirs) {
    matchUseCaseMaster.scan(caseDir)
    parseUseCaseMaster.scan(caseDir)
  }

  await parseUseCaseMaster.answerCaseTree()
  await matchUseCaseMaster.answerCaseTree()
}


answer()