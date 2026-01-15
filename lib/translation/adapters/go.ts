// lib/translation/adapters/go.ts

import { LanguageAdapter } from '../types';

export const GoAdapter: LanguageAdapter = {
  metadata: {
    language: 'go',
    paradigm: ['procedural', 'concurrent'],
    typing: 'static',
    executionModel: 'mixed',
    errorHandling: 'explicit_returns',
  },

  syntax: {
    declarations: {
      function: 'func functionName(args type) returnType { }',
      lambda: 'func(args type) returnType { }',
    },

    controlFlow: {
      if: 'if condition { }',
      for: 'for i := 0; i < n; i++ { }',
      switch: 'switch value { case x: }',
    },

    errorHandling: {
      returnError: 'return value, err',
    },

    formatting: {
      blockStyle: 'braces',
    },
  },

  types: {
    primitives: {
      string: 'string',
      number: 'int | float64',
      integer: 'int',
      float: 'float64',
      boolean: 'bool',
      null: 'nil',
      void: '',
    },
    collections: {
      array: '[]T',
      list: '[]T',
      map: 'map[K]V',
      set: 'map[T]bool',
    },
    special: {
      error: 'error',
      interface: 'interface{}',
      any: 'interface{}',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: 'len()', notes: 'Built-in function' },
      print: { name: 'fmt.Println', notes: 'Requires import "fmt"' },
      json_parse: { name: 'json.Unmarshal', notes: 'Requires import "encoding/json"' },
      json_stringify: { name: 'json.Marshal', notes: 'Requires import "encoding/json"' },
      append: { name: 'append()', notes: 'Built-in function for slices' },
      string_split: { name: 'strings.Split', notes: 'Requires import "strings"' },
      string_join: { name: 'strings.Join', notes: 'Requires import "strings"' },
    },
  },

  naming: {
    variables: 'camelCase',
    functions: 'camelCase',
    classes: 'PascalCase',
    constants: 'UPPER_SNAKE_CASE',
  },

  specialRules: [
    {
      rule: 'Go uses explicit error returns instead of exceptions',
      example: 'result, err := doSomething()\nif err != nil {\n    return err\n}',
    },
    {
      rule: 'Exported names must start with capital letter',
      example: 'func PublicFunc() vs func privateFunc()',
    },
    {
      rule: 'No implicit type conversions',
      example: 'var x int = 5\nvar y float64 = float64(x)',
    },
    {
      rule: 'Use goroutines and channels for concurrency',
      example: 'go functionCall()\nch := make(chan int)',
    },
  ],
};