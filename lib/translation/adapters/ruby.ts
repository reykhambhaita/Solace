// lib/translation/adapters/ruby.ts

import { LanguageAdapter } from '../types';

export const RubyAdapter: LanguageAdapter = {
  metadata: {
    language: 'ruby',
    paradigm: ['oop', 'functional'],
    typing: 'dynamic',
    executionModel: 'mixed',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'def function_name(args)',
      lambda: '->(args) { expression }',
      class: 'class ClassName',
    },

    controlFlow: {
      if: 'if condition ... end',
      for: 'iterable.each do |item| ... end',
      while: 'while condition ... end',
      tryCatch: 'begin ... rescue ... end',
    },

    errorHandling: {
      throw: 'raise StandardError, message',
      catch: 'rescue StandardError => e',
    },

    formatting: {
      blockStyle: 'indentation',
      statementTerminator: 'newline',
    },
  },

  types: {
    primitives: {
      string: 'String',
      number: 'Integer / Float',
      boolean: 'TrueClass / FalseClass',
      null: 'nil',
    },
    collections: {
      array: 'Array',
      hash: 'Hash',
      set: 'Set',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.length', notes: 'Method' },
      print: { name: 'puts' },
      json_parse: { name: 'JSON.parse' },
      json_stringify: { name: 'JSON.generate' },
      push: { name: '.push()' },
      map: { name: '.map' },
      filter: { name: '.select' },
      reduce: { name: '.reduce' },
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
      rule: 'Everything is an object',
      example: '1.to_s',
    },
    {
      rule: 'Implicit returns',
      example: 'def add(a, b); a + b; end',
    },
    {
      rule: 'Use symbols for hash keys and identifiers',
      example: ':status',
    },
  ],
};
