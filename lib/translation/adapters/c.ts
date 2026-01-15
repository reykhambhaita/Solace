// lib/translation/adapters/c.ts

import { LanguageAdapter } from '../types';

export const CAdapter: LanguageAdapter = {
  metadata: {
    language: 'c',
    paradigm: ['procedural'],
    typing: 'static',
    executionModel: 'sync',
    errorHandling: 'explicit_returns',
  },

  syntax: {
    declarations: {
      function: 'ReturnType function_name(Type arg) { }',
    },

    controlFlow: {
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      while: 'while (condition) { }',
      switch: 'switch (value) { case x: break; }',
    },

    errorHandling: {
      returnError: 'return ERROR_CODE;',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'char*',
      number: 'int / double',
      boolean: 'int (or bool with <stdbool.h>)',
      null: 'NULL',
      void: 'void',
    },
    collections: {
      array: 'T[]',
      pointer: 'T*',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: 'strlen()', notes: 'For strings, requires <string.h>' },
      print: { name: 'printf', notes: 'Requires <stdio.h>' },
      malloc: { name: 'malloc', notes: 'Requires <stdlib.h>' },
      free: { name: 'free', notes: 'Requires <stdlib.h>' },
    },
  },

  naming: {
    variables: 'snake_case',
    functions: 'snake_case',
    constants: 'UPPER_SNAKE_CASE',
  },

  specialRules: [
    {
      rule: 'Manual memory management is required',
      example: 'int* x = malloc(sizeof(int)); ... free(x);',
    },
    {
      rule: 'Check return values for error handling',
      example: 'if (file == NULL) return -1;',
    },
    {
      rule: 'No classes, use structs and functions',
      example: 'struct Point { int x; int y; }; void point_move(struct Point* p);',
    },
  ],
};
