// lib/translation/adapters/php.ts

import { LanguageAdapter } from '../types';

export const PhpAdapter: LanguageAdapter = {
  metadata: {
    language: 'php',
    paradigm: ['procedural', 'oop'],
    typing: 'dynamic',
    executionModel: 'sync',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'function functionName($args)',
      lambda: 'fn($args) => expression',
      class: 'class ClassName',
      interface: 'interface InterfaceName',
    },

    controlFlow: {
      if: 'if ($condition) { }',
      for: 'foreach ($iterable as $item) { }',
      while: 'while ($condition) { }',
      switch: 'switch ($value) { case $x: break; }',
      tryCatch: 'try { } catch (Exception $e) { }',
    },

    errorHandling: {
      throw: 'throw new Exception($message);',
      catch: 'catch (Exception $e)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'string',
      number: 'int / float',
      boolean: 'bool',
      null: 'null',
      void: 'void',
    },
    collections: {
      array: 'array',
      map: 'array (associative)',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: 'count()', notes: 'Function' },
      print: { name: 'echo / print_r' },
      json_parse: { name: 'json_decode' },
      json_stringify: { name: 'json_encode' },
      push: { name: 'array_push' },
      map: { name: 'array_map' },
      filter: { name: 'array_filter' },
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
      rule: 'Variables must start with $',
      example: '$variable = "value";',
    },
    {
      rule: 'Arrays are versatile (both list and map)',
      example: '$arr = [1, 2]; $map = ["key" => "value"];',
    },
    {
      rule: 'String concatenation uses .',
      example: '$str = "Hello" . " " . "World";',
    },
  ],
};
