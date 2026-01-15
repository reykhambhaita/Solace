// lib/translation/adapters/python.ts

import { LanguageAdapter } from '../types';

export const PythonAdapter: LanguageAdapter = {
  metadata: {
    language: 'python',
    paradigm: ['procedural', 'oop', 'functional'],
    typing: 'dynamic',
    executionModel: 'mixed',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'def function_name(args):',
      lambda: 'lambda args: expression',
      class: 'class ClassName:',
    },

    controlFlow: {
      if: 'if condition:',
      for: 'for item in iterable:',
      while: 'while condition:',
      tryCatch: 'try:\n    ...\nexcept Exception as e:\n    ...',
    },

    errorHandling: {
      throw: 'raise Exception(message)',
      catch: 'except Exception as e',
    },

    formatting: {
      blockStyle: 'indentation',
    },
  },

  types: {
    primitives: {
      string: 'str',
      number: 'int | float',
      integer: 'int',
      float: 'float',
      boolean: 'bool',
      null: 'None',
      void: 'None',
    },
    collections: {
      array: 'list',
      list: 'list',
      map: 'dict',
      dict: 'dict',
      set: 'set',
      tuple: 'tuple',
    },
    special: {
      any: 'Any',
      optional: 'Optional[T]',
      union: 'Union[T1, T2]',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: 'len' },
      print: { name: 'print' },
      json_parse: { name: 'json.loads', notes: 'Requires import json' },
      json_stringify: { name: 'json.dumps', notes: 'Requires import json' },
      push: { name: '.append()', notes: 'List method' },
      map: { name: 'map()', notes: 'Built-in function or list comprehension' },
      filter: { name: 'filter()', notes: 'Built-in function or list comprehension' },
      reduce: { name: 'functools.reduce', notes: 'Requires from functools import reduce' },
      split: { name: '.split()', notes: 'String method' },
      join: { name: '.join()', notes: 'String method (reversed: separator.join(list))' },
      slice: { name: '[start:end]', notes: 'Slice notation' },
    },
  },

  naming: {
    variables: 'snake_case',
    functions: 'snake_case',
    classes: 'PascalCase',
    constants: 'UPPER_SNAKE_CASE',
  },

  specialRules: [
    {
      rule: 'Mutable default arguments must be avoided',
      example: 'def f(x=[]): ❌ → use None and initialize inside: def f(x=None): x = x or []',
    },
    {
      rule: 'Indentation is syntactically significant (use 4 spaces)',
      example: 'def function():\n    statement1\n    statement2',
    },
    {
      rule: 'List comprehensions are preferred over map/filter when readable',
      example: '[x*2 for x in items] instead of map(lambda x: x*2, items)',
    },
  ],
};