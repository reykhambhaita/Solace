// lib/translation/adapters/javascript.ts

import { LanguageAdapter } from '../types';

export const JavaScriptAdapter: LanguageAdapter = {
  metadata: {
    language: 'javascript',
    paradigm: ['procedural', 'oop', 'functional'],
    typing: 'dynamic',
    executionModel: 'mixed',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'function name(args) { }',
      lambda: '(args) => expression',
      class: 'class ClassName { }',
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
      catch: 'catch (error)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'String',
      number: 'Number',
      boolean: 'Boolean',
      null: 'null',
      undefined: 'undefined',
      void: 'undefined',
    },
    collections: {
      array: 'Array',
      map: 'Map',
      set: 'Set',
    },
    special: {
      promise: 'Promise',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.length', notes: 'Property' },
      print: { name: 'console.log' },
      json_parse: { name: 'JSON.parse' },
      json_stringify: { name: 'JSON.stringify' },
      push: { name: '.push()' },
      map: { name: '.map()' },
      filter: { name: '.filter()' },
      reduce: { name: '.reduce()' },
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
      rule: 'JavaScript is dynamically typed',
      example: 'let x = 5; x = "hello";',
    },
    {
      rule: 'Use modern ES6+ syntax',
      example: 'const sum = (a, b) => a + b;',
    },
  ],
};
