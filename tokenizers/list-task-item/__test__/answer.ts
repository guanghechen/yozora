import path from 'path'
import { BlockTokenizerTester } from '@yozora/jest-for-tokenizer'
import { ListBulletItemTokenizer } from '@yozora/tokenizer-list-bullet-item'
import { ListOrderedItemTokenizer } from '@yozora/tokenizer-list-ordered-item'
import { PhrasingContentType } from '@yozora/tokenizercore-block'
import { ListTaskItemTokenizer } from '../src'


const caseRootDirectory = path.resolve(__dirname, 'cases')
const tester = new BlockTokenizerTester({ caseRootDirectory })


tester.context
  .useTokenizer(new ListBulletItemTokenizer({
    interruptableTypes: [PhrasingContentType],
  }))
  .useTokenizer(new ListOrderedItemTokenizer({
    interruptableTypes: [PhrasingContentType],
  }))
  .useTokenizer(new ListTaskItemTokenizer())
  .useTokenizer(BlockTokenizerTester.defaultInlineDataTokenizer())


tester
  .scan('gfm')
  .scan('*.json')
  .runAnswer()
