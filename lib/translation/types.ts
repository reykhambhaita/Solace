// lib/translation/types.ts

export type LanguageAdapter = {
  metadata: {
    language: string;
    paradigm: Array<'procedural' | 'oop' | 'functional' | 'concurrent'>;
    typing: 'static' | 'dynamic' | 'gradual';
    executionModel: 'sync' | 'async' | 'mixed';
    errorHandling: 'exceptions' | 'explicit_returns' | 'result_types' | 'panic_recover';
  };

  syntax: {
    declarations: {
      function: string;
      lambda?: string;
      class?: string;
      interface?: string;
    };

    controlFlow: {
      if: string;
      for: string;
      while?: string;
      switch?: string;
      tryCatch?: string;
    };

    errorHandling?: {
      throw?: string;
      catch?: string;
      returnError?: string;
    };

    formatting: {
      blockStyle: 'indentation' | 'braces';
      statementTerminator?: string;
    };
  };

  types: {
    primitives: Record<string, string>;
    collections: Record<string, string>;
    special?: Record<string, string>;
  };

  stdlib: {
    commonFunctions: Record<
      string,
      {
        name: string;
        notes?: string;
      }
    >;
  };

  naming: {
    variables: 'snake_case' | 'camelCase';
    functions: 'snake_case' | 'camelCase';
    classes?: 'PascalCase';
    constants?: 'UPPER_SNAKE_CASE';
  };

  specialRules?: Array<{
    rule: string;
    example?: string;
  }>;
};

export interface CrossLanguageMapping {
  // Pattern equivalents
  patterns: {
    [key: string]: {
      from: string;
      to: Record<string, string>; // language -> equivalent
      restructureNeeded: boolean;
      notes?: string;
    };
  };

  // Common gotchas when translating
  translationWarnings: Array<{
    from: string;
    to: string;
    warning: string;
    suggestion: string;
  }>;

  // Library equivalents
  libraryEquivalents?: {
    [key: string]: Record<string, string>; // library name -> language equivalents
  };
}