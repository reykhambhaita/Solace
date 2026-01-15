// lib/translation/cross-language-map.ts

import { CrossLanguageMapping } from './types';

export const CrossLanguageMap: CrossLanguageMapping = {
  patterns: {
    'array-transformation': {
      from: 'typescript',
      to: {
        typescript: '.map()',
        python: 'list comprehension OR map()',
      },
      restructureNeeded: false,
      notes: 'Python prefers list comprehensions for readability',
    },
    'array-filtering': {
      from: 'typescript',
      to: {
        typescript: '.filter()',
        python: 'list comprehension with if OR filter()',
      },
      restructureNeeded: false,
      notes: 'Python list comprehension: [x for x in items if condition]',
    },
    'error-handling': {
      from: 'typescript',
      to: {
        typescript: 'try-catch',
        python: 'try-except',
      },
      restructureNeeded: false,
      notes: 'Python uses "except" instead of "catch"',
    },
    'async-await': {
      from: 'typescript',
      to: {
        typescript: 'async/await with Promise',
        python: 'async/await with asyncio',
      },
      restructureNeeded: true,
      notes: 'Python requires asyncio import and event loop setup',
    },
    'null-checking': {
      from: 'typescript',
      to: {
        typescript: 'value === null || value === undefined',
        python: 'value is None',
      },
      restructureNeeded: false,
      notes: 'Python uses "is None" instead of "=== null"',
    },
    'for-loop-index': {
      from: 'typescript',
      to: {
        typescript: 'for (let i = 0; i < arr.length; i++)',
        python: 'for i in range(len(arr))',
      },
      restructureNeeded: true,
      notes: 'Python uses range() for numeric iteration',
    },
    'object-iteration': {
      from: 'typescript',
      to: {
        typescript: 'for (const key in obj)',
        python: 'for key in dict',
      },
      restructureNeeded: false,
      notes: 'Python iterates dict keys by default',
    },
    'string-interpolation': {
      from: 'typescript',
      to: {
        typescript: '`template ${variable}`',
        python: 'f"template {variable}"',
      },
      restructureNeeded: false,
      notes: 'Python uses f-strings (3.6+)',
    },
  },

  translationWarnings: [
    {
      from: 'typescript',
      to: 'python',
      warning: 'TypeScript interfaces have no direct Python equivalent',
      suggestion: 'Use dataclasses or TypedDict for type hints',
    },
    {
      from: 'typescript',
      to: 'python',
      warning: 'TypeScript Promise.all() requires asyncio.gather() in Python',
      suggestion: 'Use asyncio.gather(*tasks) for concurrent async operations',
    },
    {
      from: 'typescript',
      to: 'python',
      warning: 'Array methods like .push() differ from Python list methods',
      suggestion: 'Use .append() for push, .pop() for pop, etc.',
    },
    {
      from: 'python',
      to: 'typescript',
      warning: 'Python list comprehensions need conversion to .map()/.filter()',
      suggestion: 'Convert [x for x in items] to items.map(x => x)',
    },
    {
      from: 'python',
      to: 'typescript',
      warning: 'Python tuple unpacking requires explicit destructuring',
      suggestion: 'Convert a, b = values to [a, b] = values',
    },
    {
      from: 'typescript',
      to: 'python',
      warning: 'TypeScript enum needs conversion to Python Enum class',
      suggestion: 'Import and use enum.Enum with class definition',
    },
  ],

  libraryEquivalents: {
    'http-client': {
      typescript: 'fetch / axios',
      python: 'requests / httpx',
    },
    'testing': {
      typescript: 'jest / vitest',
      python: 'pytest / unittest',
    },
    'date-handling': {
      typescript: 'Date / dayjs',
      python: 'datetime / dateutil',
    },
    'json': {
      typescript: 'JSON.parse / JSON.stringify',
      python: 'json.loads / json.dumps',
    },
  },
};