// lib/translation/adapters/rust.ts

import { LanguageAdapter } from '../types';

export const RustAdapter: LanguageAdapter = {
  metadata: {
    language: 'rust',
    paradigm: ['procedural', 'functional'],
    typing: 'static',
    executionModel: 'mixed',
    errorHandling: 'result_types',
  },

  syntax: {
    declarations: {
      function: 'fn function_name(args: Type) -> ReturnType { }',
      lambda: '|args| expression',
    },

    controlFlow: {
      if: 'if condition { }',
      for: 'for item in iterator { }',
      while: 'while condition { }',
      switch: 'match value { pattern => result, }',
    },

    errorHandling: {
      returnError: 'return Err(error)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'String | &str',
      number: 'i32 | f64',
      integer: 'i32',
      float: 'f64',
      boolean: 'bool',
      null: 'None',
      void: '()',
    },
    collections: {
      array: '[T; N]',
      list: 'Vec<T>',
      map: 'HashMap<K, V>',
      set: 'HashSet<T>',
    },
    special: {
      option: 'Option<T>',
      result: 'Result<T, E>',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.len()', notes: 'Method on collections' },
      print: { name: 'println!', notes: 'Macro' },
      json_parse: { name: 'serde_json::from_str', notes: 'Requires serde_json crate' },
      json_stringify: { name: 'serde_json::to_string', notes: 'Requires serde_json crate' },
      push: { name: '.push()', notes: 'Vec method' },
      map: { name: '.map()', notes: 'Iterator method' },
      filter: { name: '.filter()', notes: 'Iterator method' },
      collect: { name: '.collect()', notes: 'Convert iterator to collection' },
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
      rule: 'Rust uses Result<T, E> for error handling',
      example: 'fn may_fail() -> Result<i32, Error> { Ok(42) }',
    },
    {
      rule: 'Ownership and borrowing must be respected',
      example: 'let x = vec![1, 2];\nlet y = &x; // borrow\nlet z = x; // move',
    },
    {
      rule: 'Use match for exhaustive pattern matching',
      example: 'match result {\n    Ok(val) => println!("{}", val),\n    Err(e) => eprintln!("{}", e),\n}',
    },
    {
      rule: 'Immutable by default, use mut for mutability',
      example: 'let x = 5; // immutable\nlet mut y = 5; // mutable',
    },
  ],
};