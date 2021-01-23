import path from 'path'
import { BlockTokenizerTester } from '@yozora/jest-for-tokenizer'
import { FencedCodeTokenizer } from '../src'


const caseRootDirectory = path.resolve(__dirname, 'cases')
const tester = new BlockTokenizerTester({ caseRootDirectory })


tester.context
  .useTokenizer(new FencedCodeTokenizer())


tester
  .scan('gfm')
  .scan('*.json')
  .runTest()
