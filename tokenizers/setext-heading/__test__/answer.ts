import path from 'path'
import { BlockTokenizerTester } from '@yozora/jest-for-tokenizer'
import { ParagraphTokenizer } from '@yozora/tokenizer-paragraph'
import { SetextHeadingTokenizer } from '../src'


const caseRootDirectory = path.resolve(__dirname, 'cases')
const fallbackTokenizer = new ParagraphTokenizer({ priority: -1 })

const tester = new BlockTokenizerTester({
  caseRootDirectory,
  fallbackTokenizer,
})

tester.context
  .useTokenizer(new SetextHeadingTokenizer({ priority: 1 }))
  .useTokenizer(BlockTokenizerTester.defaultInlineDataTokenizer())


tester
  .scan('gfm')
  .scan('*.json')
  .runAnswer()