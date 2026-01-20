

import type { SupportedLanguage } from '../analyzer/language-detector';
import type { CSTNode } from '../analyzer/semantic-ir';

export interface PatternMatch {
  type: 'api-usage' | 'idiom' | 'anti-pattern' | 'design-pattern';
  name: string;
  confidence: number;
  location: { row: number; column: number };
  context: string;
  suggestion?: string;
}

export interface APIUsagePattern {
  library: string;
  method: string;
  usage: 'correct' | 'deprecated' | 'misuse';
  replacement?: string;
}

/**
 * Language-specific pattern definitions
 */
const LANGUAGE_PATTERNS: Record<SupportedLanguage, {
  idioms: Array<{ pattern: RegExp; name: string; description: string }>;
  antiPatterns: Array<{ pattern: RegExp; name: string; issue: string; fix: string }>;
}> = {
  typescript: {
    idioms: [
      {
        pattern: /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState/,
        name: 'React useState hook',
        description: 'Standard React state management pattern'
      },
      {
        pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\},\s*\[\s*\]\s*\)/,
        name: 'useEffect with empty deps',
        description: 'Component mount effect pattern'
      },
      {
        pattern: /\?\.\w+/,
        name: 'Optional chaining',
        description: 'Safe property access pattern'
      },
      {
        pattern: /\?\?\s*/,
        name: 'Nullish coalescing',
        description: 'Default value assignment pattern'
      }
    ],
    antiPatterns: [
      {
        pattern: /==\s*null|null\s*==/,
        name: 'Loose equality with null',
        issue: 'Should use strict equality',
        fix: 'Use === null or !== null'
      },
      {
        pattern: /var\s+\w+\s*=/,
        name: 'var declaration',
        issue: 'var has function scope and hoisting issues',
        fix: 'Use const or let instead'
      },
      {
        pattern: /new\s+Array\(/,
        name: 'Array constructor',
        issue: 'Can have unexpected behavior',
        fix: 'Use array literal [] instead'
      }
    ]
  },
  python: {
    idioms: [
      {
        pattern: /if\s+__name__\s*==\s*['"']__main__['"']/,
        name: 'Main guard',
        description: 'Standard entry point pattern'
      },
      {
        pattern: /with\s+open\(/,
        name: 'Context manager for files',
        description: 'Safe file handling pattern'
      },
      {
        pattern: /\[.+\s+for\s+.+\s+in\s+.+\]/,
        name: 'List comprehension',
        description: 'Pythonic iteration pattern'
      }
    ],
    antiPatterns: [
      {
        pattern: /except:\s*$/m,
        name: 'Bare except clause',
        issue: 'Catches all exceptions including system exits',
        fix: 'Specify exception type: except Exception:'
      },
      {
        pattern: /==\s*True|True\s*==/,
        name: 'Explicit True comparison',
        issue: 'Redundant and unpythonic',
        fix: 'Use if condition: instead of if condition == True:'
      }
    ]
  },
  go: {
    idioms: [
      {
        pattern: /if\s+err\s*!=\s*nil\s*\{/,
        name: 'Error check pattern',
        description: 'Standard Go error handling'
      },
      {
        pattern: /defer\s+\w+\(/,
        name: 'Defer cleanup',
        description: 'Resource cleanup pattern'
      },
      {
        pattern: /go\s+func\s*\(/,
        name: 'Anonymous goroutine',
        description: 'Concurrent execution pattern'
      }
    ],
    antiPatterns: [
      {
        pattern: /_\s*=\s*err/,
        name: 'Ignored error',
        issue: 'Error is not handled',
        fix: 'Handle or log the error'
      }
    ]
  },
  rust: {
    idioms: [
      {
        pattern: /if\s+let\s+Some\(/,
        name: 'if let pattern',
        description: 'Option unwrapping pattern'
      },
      {
        pattern: /match\s+\w+\s*\{[\s\S]*?Some\(.*?\)\s*=>[\s\S]*?None\s*=>/,
        name: 'Option matching',
        description: 'Exhaustive Option handling'
      },
      {
        pattern: /\.map\(|\.and_then\(/,
        name: 'Combinator pattern',
        description: 'Functional error handling'
      }
    ],
    antiPatterns: [
      {
        pattern: /\.unwrap\(\)/,
        name: 'unwrap() usage',
        issue: 'Will panic if value is None/Err',
        fix: 'Use pattern matching or .unwrap_or() instead'
      },
      {
        pattern: /\.clone\(\).*\.clone\(\)/,
        name: 'Multiple clones',
        issue: 'Inefficient memory usage',
        fix: 'Consider using references or restructuring'
      }
    ]
  },
  java: {
    idioms: [
      {
        pattern: /@Override/,
        name: 'Override annotation',
        description: 'Method override documentation'
      },
      {
        pattern: /try\s*\([\s\S]*?\)\s*\{/,
        name: 'Try-with-resources',
        description: 'Automatic resource management'
      }
    ],
    antiPatterns: [
      {
        pattern: /catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}/,
        name: 'Empty catch block',
        issue: 'Silently swallows exceptions',
        fix: 'Log or handle the exception'
      }
    ]
  },
  cpp: {
    idioms: [
      {
        pattern: /auto\s+\w+\s*=\s*std::make_unique/,
        name: 'make_unique pattern',
        description: 'Safe unique_ptr creation'
      },
      {
        pattern: /for\s*\(\s*auto\s*&/,
        name: 'Range-based for with reference',
        description: 'Efficient iteration pattern'
      }
    ],
    antiPatterns: [
      {
        pattern: /new\s+\w+(?!.*delete)/,
        name: 'Raw new without delete',
        issue: 'Potential memory leak',
        fix: 'Use smart pointers instead'
      }
    ]
  },
  c: {
    idioms: [],
    antiPatterns: [
      {
        pattern: /malloc\(.*?\)(?!.*free)/,
        name: 'malloc without free',
        issue: 'Memory leak',
        fix: 'Ensure matching free() call'
      }
    ]
  },
  ruby: {
    idioms: [
      {
        pattern: /\.each\s+do\s*\|/,
        name: 'each block',
        description: 'Ruby iteration pattern'
      }
    ],
    antiPatterns: []
  },
  php: {
    idioms: [
      {
        pattern: /declare\s*\(\s*strict_types\s*=\s*1\s*\)/,
        name: 'Strict types',
        description: 'Type safety pattern'
      }
    ],
    antiPatterns: [
      {
        pattern: /==\s*true|true\s*==/,
        name: 'Loose equality',
        issue: 'Type coercion can cause bugs',
        fix: 'Use === for strict comparison'
      }
    ]
  }
};

/**
 * API usage patterns for common libraries
 */
const API_PATTERNS: Record<string, Array<{
  pattern: RegExp;
  library: string;
  method: string;
  version?: string;
  deprecated?: boolean;
  replacement?: string;
}>> = {
  typescript: [
    {
      pattern: /moment\(\)/,
      library: 'moment',
      method: 'constructor',
      deprecated: true,
      replacement: 'Use date-fns or dayjs instead'
    },
    {
      pattern: /\.findDOMNode\(/,
      library: 'react',
      method: 'findDOMNode',
      deprecated: true,
      replacement: 'Use refs instead'
    },
    {
      pattern: /componentWillMount|componentWillReceiveProps|componentWillUpdate/,
      library: 'react',
      method: 'legacy lifecycle',
      deprecated: true,
      replacement: 'Use new lifecycle methods or hooks'
    }
  ],
  python: [
    {
      pattern: /time\.clock\(/,
      library: 'time',
      method: 'clock',
      deprecated: true,
      replacement: 'Use time.perf_counter() or time.process_time()'
    }
  ]
};

/**
 * Detect patterns in code
 */
export function detectPatterns(
  cst: CSTNode,
  language: SupportedLanguage
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const codeText = cst.text;
  const patterns = LANGUAGE_PATTERNS[language];

  if (!patterns) return matches;

  // Detect idioms
  for (const idiom of patterns.idioms) {
    const match = codeText.match(idiom.pattern);
    if (match) {
      matches.push({
        type: 'idiom',
        name: idiom.name,
        confidence: 0.9,
        location: findLocation(cst, match[0]),
        context: idiom.description
      });
    }
  }

  // Detect anti-patterns
  for (const antiPattern of patterns.antiPatterns) {
    const regex = new RegExp(antiPattern.pattern, 'g');
    let match;
    while ((match = regex.exec(codeText)) !== null) {
      matches.push({
        type: 'anti-pattern',
        name: antiPattern.name,
        confidence: 0.85,
        location: findLocation(cst, match[0]),
        context: antiPattern.issue,
        suggestion: antiPattern.fix
      });
    }
  }

  // Detect API usage
  const apiPatterns = API_PATTERNS[language] || [];
  for (const api of apiPatterns) {
    const match = codeText.match(api.pattern);
    if (match) {
      matches.push({
        type: 'api-usage',
        name: `${api.library}.${api.method}`,
        confidence: api.deprecated ? 1.0 : 0.8,
        location: findLocation(cst, match[0]),
        context: api.deprecated ? 'Deprecated API' : 'API usage detected',
        suggestion: api.replacement
      });
    }
  }

  return matches;
}

/**
 * Detect version compatibility issues
 */
export function detectVersionIssues(
  cst: CSTNode,
  language: SupportedLanguage
): Array<{
  feature: string;
  minimumVersion: string;
  location: { row: number; column: number };
}> {
  const issues: Array<{
    feature: string;
    minimumVersion: string;
    location: { row: number; column: number };
  }> = [];

  const codeText = cst.text.toLowerCase();

  // TypeScript version features
  if (language === 'typescript') {
    if (codeText.includes('satisfies')) {
      issues.push({
        feature: 'satisfies operator',
        minimumVersion: '4.9',
        location: { row: 0, column: 0 }
      });
    }
    if (codeText.includes('as const')) {
      issues.push({
        feature: 'const assertions',
        minimumVersion: '3.4',
        location: { row: 0, column: 0 }
      });
    }
  }

  // Python version features
  if (language === 'python') {
    if (codeText.includes('match ') && codeText.includes('case ')) {
      issues.push({
        feature: 'match statement',
        minimumVersion: '3.10',
        location: { row: 0, column: 0 }
      });
    }
    if (/:\s*\w+\s*=/.test(codeText)) {
      issues.push({
        feature: 'type hints with assignment',
        minimumVersion: '3.5',
        location: { row: 0, column: 0 }
      });
    }
  }

  return issues;
}

/**
 * Helper to find location of matched text in CST
 */
function findLocation(cst: CSTNode, text: string): { row: number; column: number } {
  const index = cst.text.indexOf(text);
  if (index === -1) return { row: 0, column: 0 };

  const lines = cst.text.substring(0, index).split('\n');
  return {
    row: lines.length - 1,
    column: lines[lines.length - 1].length
  };
}

/**
 * Suggest migrations for deprecated APIs
 */
export function suggestMigrations(
  patterns: PatternMatch[]
): Array<{
  from: string;
  to: string;
  reason: string;
  autoFixable: boolean;
}> {
  const migrations: Array<{
    from: string;
    to: string;
    reason: string;
    autoFixable: boolean;
  }> = [];

  for (const pattern of patterns) {
    if (pattern.type === 'api-usage' && pattern.suggestion) {
      migrations.push({
        from: pattern.name,
        to: pattern.suggestion,
        reason: pattern.context,
        autoFixable: false
      });
    }
  }

  return migrations;
}