/**
 * Enhanced Language Detection System
 * Multi-pass detection with adaptive confidence scaling
 */

export type SupportedLanguage =
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'
  | 'c'
  | 'ruby'
  | 'php';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  dialect: string | null;
  confidence: number;
  indicators: string[];
  detectionMethod?: 'smoking-gun' | 'weighted' | 'fallback';
}

interface SmokingGunPattern {
  regex: RegExp;
  language: SupportedLanguage;
  indicator: string;
  minConfidence: number;
}

interface LanguagePattern {
  name: SupportedLanguage;
  patterns: Array<{
    regex: RegExp;
    weight: number;
    indicator: string;
    contextMultiplier?: (code: string) => number; // Dynamic weight adjustment
  }>;
  negativePatterns?: Array<{
    regex: RegExp;
    penalty: number;
    reason: string;
  }>;
  dialectDetector?: (code: string) => string | null;
}

/**
 * Smoking Gun Patterns - Nearly 100% unique identifiers
 * These patterns provide instant high-confidence detection
 */
const SMOKING_GUN_PATTERNS: SmokingGunPattern[] = [
  {
    regex: /<\?php/i,
    language: 'php',
    indicator: '<?php opening tag',
    minConfidence: 0.98,
  },
  {
    regex: /^package\s+main\b/m,
    language: 'go',
    indicator: 'package main',
    minConfidence: 0.95,
  },
  {
    regex: /fn\s+main\s*\(\s*\)\s*(\{|->)/m,
    language: 'rust',
    indicator: 'fn main()',
    minConfidence: 0.95,
  },
  {
    regex: /def\s+__init__\s*\(\s*self/m,
    language: 'python',
    indicator: 'def __init__(self',
    minConfidence: 0.92,
  },
  {
    regex: /interface\s+\w+\s*\{[\s\S]*?:\s*(string|number|boolean|any)/m,
    language: 'typescript',
    indicator: 'interface with type annotations',
    minConfidence: 0.95,
  },
  {
    regex: /use\s+\w+(::\w+)+;/m,
    language: 'rust',
    indicator: 'use crate::path',
    minConfidence: 0.90,
  },
  {
    regex: /pub\s+fn\s+\w+/m,
    language: 'rust',
    indicator: 'pub fn',
    minConfidence: 0.88,
  },
  {
    regex: /System\.(out|err)\.(print|println)/m,
    language: 'java',
    indicator: 'System.out',
    minConfidence: 0.92,
  },
  {
    regex: /std::\w+/m,
    language: 'cpp',
    indicator: 'std:: namespace',
    minConfidence: 0.88,
  },
];

/**
 * Enhanced Language Patterns with negative scoring
 */
const LANGUAGE_PATTERNS: LanguagePattern[] = [
  // PHP
  {
    name: 'php',
    patterns: [
      { regex: /<\?php/i, weight: 50, indicator: '<?php tag' },
      {
        regex: /\$[a-zA-Z_]\w*\s*=/m,
        weight: 15,
        indicator: '$variable assignment',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 1.5 : 1,
      },
      { regex: /->\w+/m, weight: 12, indicator: '-> operator' },
      { regex: /namespace\s+[\w\\]+;/m, weight: 10, indicator: 'namespace declaration' },
      { regex: /use\s+[\w\\]+;/m, weight: 6, indicator: 'use statement' },
      { regex: /echo|print_r|var_dump/m, weight: 10, indicator: 'PHP output function' },
      { regex: /function\s+\w+\s*\([^)]*\)\s*\{/m, weight: 5, indicator: 'function declaration' },
    ],
    negativePatterns: [
      { regex: /import\s+.*from/, penalty: 15, reason: 'ES6 import (not PHP)' },
      { regex: /:\s*(string|number|boolean)\b/, penalty: 20, reason: 'TypeScript types' },
      { regex: /def\s+\w+.*:/, penalty: 15, reason: 'Python function' },
    ],
    dialectDetector: (code) => {
      if (/declare\s*\(\s*strict_types\s*=\s*1\s*\)/m.test(code)) return 'PHP 7+';
      if (/namespace\s+/m.test(code)) return 'PHP 5.3+';
      return null;
    },
  },

  // TypeScript
  {
    name: 'typescript',
    patterns: [
      {
        regex: /:\s*(string|number|boolean|any|void|never|unknown)\b/m,
        weight: 20,
        indicator: 'type annotation',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 2.0 : 1,
      },
      {
        regex: /interface\s+\w+/m,
        weight: 25,
        indicator: 'interface declaration',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 2.5 : 1,
      },
      { regex: /type\s+\w+\s*=/m, weight: 22, indicator: 'type alias' },
      { regex: /<[A-Z]\w*>/m, weight: 15, indicator: 'generic type' },
      { regex: /as\s+(const|[A-Z]\w*)/m, weight: 16, indicator: 'type assertion' },
      { regex: /import\s+.*\s+from\s+['"][^'"]+['"]/m, weight: 8, indicator: 'ES6 import' },
      { regex: /export\s+(default|const|function|class|interface|type)/m, weight: 10, indicator: 'ES6 export' },
      { regex: /enum\s+\w+/m, weight: 22, indicator: 'enum declaration' },
      { regex: /public|private|protected|readonly/m, weight: 18, indicator: 'access modifier' },
    ],
    negativePatterns: [
      { regex: /def\s+\w+.*:/, penalty: 20, reason: 'Python function' },
      { regex: /fn\s+\w+/, penalty: 15, reason: 'Rust function' },
      { regex: /\bgo\s+\w+\(/, penalty: 20, reason: 'Go goroutine' },
    ],
    dialectDetector: (code) => {
      if (/as\s+const/m.test(code)) return 'TypeScript 3.4+';
      if (/enum\s+\w+/m.test(code)) return 'TypeScript';
      return 'TypeScript/ES6+';
    },
  },

  // Python
  {
    name: 'python',
    patterns: [
      { regex: /^from\s+\w+\s+import/m, weight: 20, indicator: 'from...import statement' },
      { regex: /^import\s+\w+/m, weight: 15, indicator: 'import statement' },
      {
        regex: /def\s+\w+\s*\([^)]*\)\s*:/m,
        weight: 18,
        indicator: 'def function',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 1.8 : 1,
      },
      { regex: /class\s+\w+[\s\S]*?:/m, weight: 15, indicator: 'class definition' },
      { regex: /@\w+/m, weight: 12, indicator: 'decorator' },
      { regex: /if\s+__name__\s*==\s*['"']__main__['"']/m, weight: 18, indicator: '__main__ check' },
      { regex: /:\s*\w+\s*=|\)\s*->\s*\w+/m, weight: 12, indicator: 'type hint' },
      { regex: /print\s*\(/m, weight: 10, indicator: 'print function' },
      { regex: /\bself\b/m, weight: 10, indicator: 'self parameter' },
    ],
    negativePatterns: [
      { regex: /;\s*$/m, penalty: 10, reason: 'Statement semicolons (not Python)' },
      { regex: /\{[^}]*\}/m, penalty: 5, reason: 'Curly braces block' },
      { regex: /fn\s+\w+/, penalty: 20, reason: 'Rust function' },
    ],
    dialectDetector: (code) => {
      if (/:\s*\w+\s*=|\)\s*->\s*\w+/m.test(code)) return 'Python 3.5+';
      if (/print\s*\(/m.test(code)) return 'Python 3';
      if (/print\s+[^(]/m.test(code)) return 'Python 2';
      return 'Python 3';
    },
  },

  // Go
  {
    name: 'go',
    patterns: [
      {
        regex: /^package\s+\w+/m,
        weight: 25,
        indicator: 'package declaration',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 2.0 : 1,
      },
      { regex: /^import\s+\(/m, weight: 20, indicator: 'import block' },
      { regex: /func\s+\w+\s*\(/m, weight: 18, indicator: 'func declaration' },
      { regex: /func\s+main\s*\(\s*\)/m, weight: 22, indicator: 'main function' },
      {
        regex: /:=/m,
        weight: 15,
        indicator: ':= short declaration',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 1.5 : 1,
      },
      { regex: /\bgo\s+\w+\(/m, weight: 20, indicator: 'goroutine' },
      { regex: /chan\s+\w+/m, weight: 18, indicator: 'channel type' },
      { regex: /defer\s+/m, weight: 16, indicator: 'defer statement' },
      { regex: /\brange\s+/m, weight: 10, indicator: 'range keyword' },
    ],
    negativePatterns: [
      { regex: /def\s+\w+/, penalty: 20, reason: 'Python/Ruby function' },
      { regex: /interface\s+\w+\s*\{[^}]*:/m, penalty: 15, reason: 'TypeScript interface' },
    ],
  },

  // Rust
  {
    name: 'rust',
    patterns: [
      {
        regex: /fn\s+main\s*\(\s*\)/m,
        weight: 25,
        indicator: 'fn main()',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 2.0 : 1,
      },
      { regex: /fn\s+\w+/m, weight: 15, indicator: 'fn declaration' },
      { regex: /use\s+\w+(::\w+)*/m, weight: 18, indicator: 'use statement' },
      { regex: /pub\s+(fn|struct|enum|trait)/m, weight: 20, indicator: 'pub visibility' },
      {
        regex: /let\s+mut\s+/m,
        weight: 16,
        indicator: 'let mut binding',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 1.5 : 1,
      },
      { regex: /impl\s+\w+/m, weight: 18, indicator: 'impl block' },
      { regex: /&mut\s+\w+|&\w+/m, weight: 12, indicator: 'reference/borrow' },
      { regex: /::\w+/m, weight: 10, indicator: ':: path separator' },
      { regex: /match\s+\w+\s*\{/m, weight: 15, indicator: 'match expression' },
    ],
    negativePatterns: [
      { regex: /function\s+\w+/, penalty: 15, reason: 'JavaScript function' },
      { regex: /def\s+\w+/, penalty: 20, reason: 'Python function' },
    ],
  },

  // Java
  {
    name: 'java',
    patterns: [
      { regex: /^package\s+[\w.]+;/m, weight: 22, indicator: 'package statement' },
      { regex: /^import\s+[\w.]+;/m, weight: 15, indicator: 'import statement' },
      { regex: /(public|private|protected)\s+class\s+\w+/m, weight: 20, indicator: 'class declaration' },
      {
        regex: /(public|private|protected)\s+static\s+void\s+main/m,
        weight: 28,
        indicator: 'main method',
        contextMultiplier: (code) => code.split('\n').length < 10 ? 1.5 : 1,
      },
      { regex: /System\.(out|err)\.(print|println)/m, weight: 20, indicator: 'System.out' },
      { regex: /@Override|@Deprecated|@SuppressWarnings/m, weight: 15, indicator: 'annotation' },
      { regex: /new\s+\w+\s*\(/m, weight: 8, indicator: 'new keyword' },
      { regex: /extends\s+\w+|implements\s+\w+/m, weight: 12, indicator: 'extends/implements' },
    ],
    negativePatterns: [
      { regex: /fn\s+\w+/, penalty: 20, reason: 'Rust function' },
      { regex: /def\s+\w+/, penalty: 15, reason: 'Python function' },
      { regex: /func\s+\w+/, penalty: 15, reason: 'Go function' },
    ],
  },

  // C++
  {
    name: 'cpp',
    patterns: [
      { regex: /#include\s*<[^>]+>/m, weight: 15, indicator: '#include <>' },
      {
        regex: /std::/m,
        weight: 22,
        indicator: 'std:: namespace',
        contextMultiplier: (code) => code.split('\n').length < 10 ? 1.5 : 1,
      },
      { regex: /using\s+namespace\s+std;/m, weight: 20, indicator: 'using namespace std' },
      { regex: /class\s+\w+/m, weight: 12, indicator: 'class declaration' },
      { regex: /template\s*<[^>]+>/m, weight: 18, indicator: 'template' },
      { regex: /::(public|private|protected)/m, weight: 15, indicator: ':: access specifier' },
      { regex: /cout|cin|endl/m, weight: 16, indicator: 'iostream operator' },
      { regex: /new\s+\w+|delete\s+/m, weight: 10, indicator: 'new/delete' },
      { regex: /virtual\s+/m, weight: 12, indicator: 'virtual keyword' },
    ],
    negativePatterns: [
      { regex: /def\s+\w+/, penalty: 20, reason: 'Python function' },
      { regex: /fn\s+\w+/, penalty: 20, reason: 'Rust function' },
      { regex: /func\s+\w+/, penalty: 15, reason: 'Go function' },
    ],
  },

  // C
  {
    name: 'c',
    patterns: [
      {
        regex: /#include\s*["<]\w+\.h[">]/m,
        weight: 20,
        indicator: '#include .h',
        contextMultiplier: (code) => code.split('\n').length < 10 ? 1.5 : 1,
      },
      { regex: /int\s+main\s*\(/m, weight: 22, indicator: 'int main()' },
      { regex: /printf|scanf|malloc|free/m, weight: 16, indicator: 'C standard library' },
      { regex: /struct\s+\w+/m, weight: 12, indicator: 'struct declaration' },
      { regex: /typedef\s+/m, weight: 10, indicator: 'typedef' },
      { regex: /->\w+/m, weight: 8, indicator: '-> operator' },
      { regex: /sizeof\s*\(/m, weight: 10, indicator: 'sizeof operator' },
    ],
    negativePatterns: [
      { regex: /std::/m, penalty: 25, reason: 'C++ namespace' },
      { regex: /class\s+\w+/, penalty: 20, reason: 'C++ class' },
      { regex: /template\s*</m, penalty: 25, reason: 'C++ template' },
    ],
  },

  // Ruby
  {
    name: 'ruby',
    patterns: [
      { regex: /require\s+['"][^'"]+['"]/m, weight: 16, indicator: 'require statement' },
      { regex: /def\s+\w+/m, weight: 15, indicator: 'def method' },
      { regex: /class\s+\w+\s*</m, weight: 15, indicator: 'class inheritance' },
      { regex: /module\s+\w+/m, weight: 16, indicator: 'module declaration' },
      {
        regex: /\.each\s+do\s*\|/m,
        weight: 20,
        indicator: '.each do block',
        contextMultiplier: (code) => code.split('\n').length < 5 ? 1.8 : 1,
      },
      { regex: /@\w+/m, weight: 10, indicator: 'instance variable' },
      { regex: /puts|print|p\s+/m, weight: 8, indicator: 'Ruby output' },
      { regex: /end\b/m, weight: 6, indicator: 'end keyword' },
      { regex: /:\w+/m, weight: 8, indicator: 'symbol' },
    ],
    negativePatterns: [
      { regex: /;\s*$/m, penalty: 12, reason: 'Statement semicolons' },
      { regex: /fn\s+\w+/, penalty: 20, reason: 'Rust function' },
      { regex: /func\s+\w+/, penalty: 15, reason: 'Go function' },
    ],
  },
];

/**
 * Calculate adaptive confidence based on code length
 */
function calculateAdaptiveConfidence(
  score: number,
  codeLength: number,
  indicators: number
): number {
  const lines = codeLength;

  // For very small snippets (1-3 lines), be more aggressive
  if (lines <= 3) {
    const baseConfidence = Math.min(score / 40, 1.0);
    return Math.min(baseConfidence * 1.3, 1.0);
  }

  // For small snippets (4-10 lines), moderate boost
  if (lines <= 10) {
    const baseConfidence = Math.min(score / 45, 1.0);
    return Math.min(baseConfidence * 1.15, 1.0);
  }

  // For medium code (11-50 lines), standard scaling
  if (lines <= 50) {
    return Math.min(score / 50, 1.0);
  }

  // For large code (50+ lines), require more evidence
  const baseConfidence = Math.min(score / 55, 1.0);

  // Boost if many different indicators found
  const indicatorBonus = Math.min(indicators / 10, 0.15);

  return Math.min(baseConfidence + indicatorBonus, 1.0);
}

/**
 * Multi-pass language detection with smoking gun patterns
 */
export function detectLanguage(code: string): LanguageDetectionResult {
  if (!code || code.trim().length === 0) {
    return {
      language: 'typescript',
      dialect: null,
      confidence: 0,
      indicators: ['empty code'],
      detectionMethod: 'fallback',
    };
  }

  const lineCount = code.split('\n').length;

  // PASS 1: Check for smoking gun patterns
  for (const pattern of SMOKING_GUN_PATTERNS) {
    if (pattern.regex.test(code)) {
      const matchedLangPattern = LANGUAGE_PATTERNS.find(p => p.name === pattern.language);
      const dialect = matchedLangPattern?.dialectDetector?.(code) || null;

      return {
        language: pattern.language,
        dialect,
        confidence: pattern.minConfidence,
        indicators: [pattern.indicator],
        detectionMethod: 'smoking-gun',
      };
    }
  }

  // PASS 2: Weighted scoring with context and negative patterns
  const scores: Map<SupportedLanguage, { score: number; indicators: string[] }> = new Map();

  // Initialize scores
  for (const pattern of LANGUAGE_PATTERNS) {
    scores.set(pattern.name, { score: 0, indicators: [] });
  }

  // Score each language
  for (const pattern of LANGUAGE_PATTERNS) {
    const langScore = scores.get(pattern.name)!;

    // Apply positive patterns
    for (const p of pattern.patterns) {
      if (p.regex.test(code)) {
        let weight = p.weight;

        // Apply context multiplier for small snippets
        if (p.contextMultiplier) {
          weight *= p.contextMultiplier(code);
        }

        langScore.score += weight;
        langScore.indicators.push(p.indicator);
      }
    }

    // Apply negative patterns
    if (pattern.negativePatterns) {
      for (const neg of pattern.negativePatterns) {
        if (neg.regex.test(code)) {
          langScore.score -= neg.penalty;
          langScore.indicators.push(`-${neg.reason}`);
        }
      }
    }
  }

  // Find language with highest score
  let bestMatch: SupportedLanguage = 'typescript';
  let bestScore = 0;
  let bestIndicators: string[] = [];

  for (const [lang, data] of scores.entries()) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestMatch = lang;
      bestIndicators = data.indicators;
    }
  }

  // Calculate adaptive confidence
  const positiveIndicators = bestIndicators.filter(i => !i.startsWith('-')).length;
  const confidence = calculateAdaptiveConfidence(bestScore, lineCount, positiveIndicators);

  // Detect dialect
  let dialect: string | null = null;
  const matchedPattern = LANGUAGE_PATTERNS.find(p => p.name === bestMatch);
  if (matchedPattern?.dialectDetector) {
    dialect = matchedPattern.dialectDetector(code);
  }

  // Fallback for very low confidence
  if (bestScore <= 0) {
    return {
      language: 'typescript',
      dialect: null,
      confidence: 0.1,
      indicators: ['no patterns matched'],
      detectionMethod: 'fallback',
    };
  }

  return {
    language: bestMatch,
    dialect,
    confidence: Math.round(confidence * 100) / 100,
    indicators: bestIndicators.filter(i => !i.startsWith('-')).slice(0, 5),
    detectionMethod: 'weighted',
  };
}