// lib/translation/adapters/java.ts

import { LanguageAdapter } from '../types';

export const JavaAdapter: LanguageAdapter = {
  metadata: {
    language: 'java',
    paradigm: ['oop', 'procedural'],
    typing: 'static',
    executionModel: 'sync',
    errorHandling: 'exceptions',
  },

  syntax: {
    declarations: {
      function: 'public returnType methodName(Type args) { }',
      class: 'public class ClassName { }',
      interface: 'public interface InterfaceName { }',
    },

    controlFlow: {
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      while: 'while (condition) { }',
      switch: 'switch (value) { case x: break; }',
      tryCatch: 'try { } catch (Exception e) { }',
    },

    errorHandling: {
      throw: 'throw new Exception(message)',
      catch: 'catch (Exception e)',
    },

    formatting: {
      blockStyle: 'braces',
      statementTerminator: ';',
    },
  },

  types: {
    primitives: {
      string: 'String',
      number: 'int | double',
      integer: 'int',
      float: 'double',
      boolean: 'boolean',
      null: 'null',
      void: 'void',
    },
    collections: {
      array: 'T[]',
      list: 'List<T>',
      map: 'Map<K, V>',
      set: 'Set<T>',
    },
    special: {
      optional: 'Optional<T>',
    },
  },

  stdlib: {
    commonFunctions: {
      length: { name: '.length', notes: 'Array property or .size() for collections' },
      print: { name: 'System.out.println' },
      json_parse: { name: 'new ObjectMapper().readValue', notes: 'Requires Jackson library' },
      json_stringify: { name: 'new ObjectMapper().writeValueAsString', notes: 'Requires Jackson library' },
      add: { name: '.add()', notes: 'List method' },
      get: { name: '.get()', notes: 'List/Map method' },
      put: { name: '.put()', notes: 'Map method' },
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
      rule: 'Java requires explicit class and method declarations',
      example: 'public class MyClass {\n    public static void main(String[] args) { }\n}',
    },
    {
      rule: 'Use generics for type-safe collections',
      example: 'List<String> names = new ArrayList<>();',
    },
    {
      rule: 'Exceptions must be caught or declared',
      example: 'public void method() throws IOException { }',
    },
  ],
};