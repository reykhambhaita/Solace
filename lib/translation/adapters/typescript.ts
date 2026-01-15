// lib/translation/adapters/typescript.ts

import { LanguageAdapter } from '../types';

export const TypeScriptAdapter: LanguageAdapter = {
  metadata: {
    language: 'typescript',
    paradigm: ['procedural', 'oop', 'functional'],
    typing: 'static',
    executionModel: 'mixed',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'function name(args): returnType { }',
      lambda: '(args) => expression',
      class: 'class ClassName { }',
      interface: 'interface InterfaceName { }',
    },

    controlFlow: {
      if: 'if (condition) { }',
      for: 'for (let i = 0; i < n; i++) { }',
      while: 'while (condition) { }',
      switch: 'switch (value) { case x: break; }',
      tryCatch: 'try { } catch (error) { }',
    },

    errorHandling: {
      throw: 'throw new Error(message)',
      catch: 'catch (error: Error)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'string',
      number: 'number',
      integer: 'number',
      float: 'number',
      boolean: 'boolean',
      null: 'null',
      undefined: 'undefined',
      void: 'void',
    },
    collections: {
      array: 'Array<T>',
      list: 'Array<T>',
      map: 'Map<K, V>',
      dict: 'Record<K, V>',
      set: 'Set<T>',
      tuple: '[T1, T2]',
    },
    special: {
      any: 'any',
      unknown: 'unknown',
      never: 'never',
      promise: 'Promise<T>',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.length', notes: 'Property, not function' },
      print: { name: 'console.log' },
      json_parse: { name: 'JSON.parse' },
      json_stringify: { name: 'JSON.stringify' },
      push: { name: '.push()', notes: 'Array method' },
      map: { name: '.map()', notes: 'Array method' },
      filter: { name: '.filter()', notes: 'Array method' },
      reduce: { name: '.reduce()', notes: 'Array method' },
      split: { name: '.split()', notes: 'String method' },
      join: { name: '.join()', notes: 'Array method' },
      slice: { name: '.slice()', notes: 'Array/String method' },
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
      rule: 'TypeScript requires explicit type annotations for function parameters and return types',
      example: 'function add(a: number, b: number): number { return a + b; }',
    },
    {
      rule: 'Use const for immutable values, let for mutable',
      example: 'const PI = 3.14; let counter = 0;',
    },
    {
      rule: 'Async functions must be declared with async keyword',
      example: 'async function fetchData(): Promise<Data> { }',
    },
  ],
};