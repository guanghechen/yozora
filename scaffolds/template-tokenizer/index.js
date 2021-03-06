const fs = require('fs')
const path = require('path')
const semverRegex = require('semver-regex')
const manifest = require('./package.json')
const { paramCase: kebabCase } = require('change-case')

module.exports = function (plop) {
  const cwd = path.resolve(process.cwd())
  const tokenizerPackageNameRegex = /^(?:[^\\/]+\/)tokenizer-([\w-]+)$/

  plop.setHelper('xif', function (expression, options) {
    let result
    const context = this
    // eslint-disable-next-line no-with
    with (context) {
      result = function () {
        try {
          return eval(expression)
        } catch (e) {
          console.warn(
            `•Expression: {{x '${expression}'}}\n•JS-Error: `,
            e,
            '\n•Context: ',
            context,
          )
        }
      }.call(context)
    }
    return result ? options.fn(context) : options.inverse(context)
  })

  plop.setGenerator('tokenizer', {
    description: 'create tokenizer template project',
    prompts: [
      {
        type: 'input',
        name: 'packageName',
        message: 'name',
        transform: text => text.trim(),
      },
      {
        type: 'input',
        name: 'tokenizerName',
        message: 'tokenizer name',
        default: ({ packageName }) => {
          let m = tokenizerPackageNameRegex.exec(packageName)
          if (m == null) return packageName.replace(/^[^\\/]+[\\/]/, '')
          return m[1]
        },
        transform: text => text.trim(),
        validate: text => /^[\w-]+|@[\w-]+\/[\w-]+$/.test(text),
      },
      {
        type: 'list',
        name: 'tokenizerCategory',
        message: 'tokenizer category',
        choices: ['block', 'inline'],
        default: answers => {
          if (/block/.test(answers.packageName)) return 'block'
          if (/inline/.test(answers.packageName)) return 'inline'
          return 'block'
        },
      },
      {
        type: 'input',
        name: 'packageAuthor',
        message: 'author',
        default: answers => {
          // set category flag
          switch (answers.tokenizerCategory) {
            case 'block':
              // eslint-disable-next-line no-param-reassign
              answers.isBlockTokenizer = true
              break
            case 'inline':
              // eslint-disable-next-line no-param-reassign
              answers.isInlineTokenizer = true
              break
          }

          // detect package.json
          const packageJsonPath = path.resolve(cwd, 'package.json')
          if (fs.existsSync(packageJsonPath)) {
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
            const packageJson = JSON.parse(packageJsonContent)
            if (packageJson.author == null) return undefined
            if (typeof packageJson.author === 'string')
              return packageJson.author
            if (typeof packageJson.author.name === 'string')
              return packageJson.author.name
          }
          return undefined
        },
        transform: text => text.trim(),
      },
      {
        type: 'input',
        name: 'packageVersion',
        message: 'version',
        default: manifest.version,
        transform: text => text.trim(),
        validate: text => semverRegex().test(text),
      },
      {
        type: 'input',
        name: 'packageLocation',
        message: ({ packageName }) => 'location of ' + packageName,
        default: answers => {
          // detect lerna
          if (fs.existsSync(path.resolve(cwd, 'lerna.json'))) {
            // eslint-disable-next-line no-param-reassign
            answers.isLernaProject = true
            // eslint-disable-next-line no-param-reassign
            answers.projectName = answers.packageName.startsWith('@')
              ? /^@([^\\/]+)/.exec(answers.packageName)[1]
              : /^([^-]+)/.exec(answers.packageName)[1]

            // prefer tokenizers/<tokenizerCategory>
            const tokenizerDir = path.resolve(cwd, 'tokenizers')
            if (
              fs.existsSync(tokenizerDir) &&
              fs.statSync(tokenizerDir).isDirectory()
            ) {
              let prefixDir = 'tokenizers/'
              return (
                prefixDir +
                answers.packageName
                  .replace(/^[^\\/]+[\\/]/i, '')
                  .replace(/^tokenizer-/i, '')
              )
            }
            return (
              'packages/' + answers.packageName.replace(/^[^\\/]+[\\/]/, '')
            )
          }
          // eslint-disable-next-line no-param-reassign
          answers.projectName = answers.packageName
            .replace(/^@/, '')
            .replace('\\/', '-')
          // eslint-disable-next-line no-undef
          return packageName.replace(/^@/, '')
        },
        transform: text => text.trim(),
      },
      {
        type: 'confirm',
        name: 'useTokenizerMatchBlockHook',
        message: 'add match hooks',
        default: true,
        when: answers => answers.isBlockTokenizer,
      },
      {
        type: 'confirm',
        name: 'useTokenizerPostMatchBlockHook',
        message: 'add post-match hooks',
        default: false,
        when: answers => answers.isBlockTokenizer,
      },
      {
        type: 'confirm',
        name: 'useTokenizerParseBlockHook',
        message: 'add parse hooks',
        default: true,
        when: answers => answers.isBlockTokenizer,
      },
    ],
    actions: function (answers) {
      const resolveSourcePath = p =>
        path.normalize(path.resolve(__dirname, 'boilerplate', p))
      const resolveTargetPath = p =>
        path.normalize(path.resolve(answers.packageLocation, p))
      const relativePath = path.relative(answers.packageLocation, cwd)
      const { tokenizerName, tokenizerCategory } = answers
      // eslint-disable-next-line no-param-reassign
      answers.tsconfigExtends = answers.isLernaProject
        ? path.join(relativePath, 'tsconfig')
        : './tsconfig.settings'
      // eslint-disable-next-line no-param-reassign
      answers.tsconfigSrcExtends = answers.isLernaProject
        ? path.join(relativePath, 'tsconfig.settings')
        : './tsconfig.settings'
      // eslint-disable-next-line no-param-reassign
      answers.nodeModulesPath = path.join(relativePath, 'node_modules')

      switch (tokenizerCategory) {
        case 'block':
          // eslint-disable-next-line no-param-reassign
          answers.fallbackTokenizerName = 'paragraph'
          break
        case 'inline':
          // eslint-disable-next-line no-param-reassign
          answers.fallbackTokenizerName = 'text'
          break
      }

      /**
       * Determine whether should append a comma.
       */
      // eslint-disable-next-line no-param-reassign
      answers.usingHooks = false
      const hookNames = [
        'TokenizerMatchBlockHook',
        'TokenizerPostMatchBlockHook',
        'TokenizerParseBlockHook',
        'BlockTokenizerPostParsePhaseHook',
      ]
      for (let i = 0; i < hookNames.length; ++i) {
        const hookName = hookNames[i]
        // eslint-disable-next-line no-param-reassign
        answers[hookName + '__isNotLastHook'] = false
        if (answers['use' + hookName]) {
          // eslint-disable-next-line no-param-reassign
          answers.usingHooks = true
          for (let j = i - 1; j >= 0; --j) {
            const previousHookName = hookNames[j]
            // eslint-disable-next-line no-param-reassign
            answers[previousHookName + '__isNotLastHook'] = true
          }
        }
      }

      if (answers.useTokenizerMatchBlockHook) {
        // eslint-disable-next-line no-param-reassign
        answers.lastHook = 'TokenizerMatchBlockHook'
      }
      if (answers.useTokenizerPostMatchBlockHook) {
        // eslint-disable-next-line no-param-reassign
        answers.lastHook = 'TokenizerPostMatchBlockHook'
      }
      if (answers.useTokenizerParseBlockHook) {
        // eslint-disable-next-line no-param-reassign
        answers.lastHook = 'TokenizerParseBlockHook'
      }

      return [
        {
          type: 'add',
          path: resolveTargetPath('.eslintrc.js'),
          templateFile: resolveSourcePath('.eslintrc.js.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('package.json'),
          templateFile: resolveSourcePath('package.json.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('README.md'),
          templateFile: resolveSourcePath('README.md.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('rollup.config.js'),
          templateFile: resolveSourcePath('rollup.config.js.hbs'),
        },
        !answers.isLernaProject && {
          type: 'add',
          path: resolveTargetPath('tsconfig.settings.json'),
          templateFile: resolveSourcePath('tsconfig.settings.json.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('tsconfig.json'),
          templateFile: resolveSourcePath('tsconfig.json.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('tsconfig.src.json'),
          templateFile: resolveSourcePath('tsconfig.src.json.hbs'),
        },
        {
          type: 'add',
          path: resolveTargetPath('src/index.ts'),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/src/index.ts.hbs`,
          ),
        },
        {
          type: 'add',
          path: resolveTargetPath('src/tokenizer.ts'),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/src/tokenizer.ts.hbs`,
          ),
        },
        {
          type: 'add',
          path: resolveTargetPath('src/types.ts'),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/src/types.ts.hbs`,
          ),
        },
        {
          type: 'add',
          path: resolveTargetPath('__test__/answer.ts'),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/__test__/answer.ts.hbs`,
          ),
        },
        {
          type: 'add',
          path: resolveTargetPath(
            `__test__/${kebabCase(tokenizerName)}.spec.ts`,
          ),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/__test__/suite.spec.ts.hbs`,
          ),
        },
        {
          type: 'add',
          path: resolveTargetPath('__test__/cases/basic.json'),
          templateFile: resolveSourcePath(
            `${tokenizerCategory}-tokenizer/__test__/cases/basic.json.hbs`,
          ),
        },
      ].filter(Boolean)
    },
  })
}
