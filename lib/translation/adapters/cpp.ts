// lib/translation/adapters/cpp.ts

import { LanguageAdapter } from '../types';

export const CppAdapter: LanguageAdapter = {
  metadata: {
    language: 'cpp',
    paradigm: ['procedural', 'oop'],
    typing: 'static',
    executionModel: 'mixed',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'ReturnType functionName(Type arg) { }',
      lambda: '[captures](args) { body }',
      class: 'class ClassName { public: ... };',
      interface: 'class InterfaceName { virtual void method() = 0; };',
    },

    controlFlow: {
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      while: 'while (condition) { }',
      switch: 'switch (value) { case x: break; }',
      tryCatch: 'try { } catch (const std::exception& e) { }',
    },

    errorHandling: {
      throw: 'throw std::runtime_error(message)',
      catch: 'catch (const std::exception& e)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'std::string',
      number: 'int / double',
      boolean: 'bool',
      null: 'nullptr',
      void: 'void',
    },
    collections: {
      array: 'std::vector<T>',
      map: 'std::map<K, V>',
      set: 'std::set<T>',
    },
    special: {
      pointer: 'T*',
      reference: 'T&',
      smart_ptr: 'std::shared_ptr<T>',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.size()', notes: 'Method for containers' },
      print: { name: 'std::cout <<', notes: 'Requires <iostream>' },
      push: { name: '.push_back()', notes: 'Vector method' },
      map: { name: 'std::transform', notes: 'Requires <algorithm>' },
      filter: { name: 'std::copy_if', notes: 'Requires <algorithm>' },
    },
  },

  naming: {
    variables: 'snake_case',
    functions: 'camelCase',
    classes: 'PascalCase',
    constants: 'UPPER_SNAKE_CASE',
  },

  specialRules: [
    {
      rule: 'Use std::vector for dynamic arrays instead of raw arrays',
      example: 'std::vector<int> numbers = {1, 2, 3};',
    },
    {
      rule: 'Pass objects by const reference to avoid copying',
      example: 'void process(const std::string& data);',
    },
    {
      rule: 'Use smart pointers instead of new/delete',
      example: 'auto ptr = std::make_unique<MyClass>();',
    },
  ],
};
