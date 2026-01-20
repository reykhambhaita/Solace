/**
 * Library Analysis Component
 * Extracts and categorizes imported libraries/dependencies from code using CST
 * UPDATED: Now uses lossless CSTNode instead of truncated ASTNode
 */

import type { SupportedLanguage } from './language-detector';
import type { CSTNode } from './semantic-ir';


export type ExternalInteractionType = 'filesystem' | 'network' | 'database' | 'environment' | 'process' | 'none';

export interface ExternalInteractionAnalysis {
  types: ExternalInteractionType[];
  confidence: number;
  indicators: string[];
  isDeterministic: boolean;
  nondeterministicSources: string[];
}
export interface ImportInfo {
  name: string;
  path: string;
  type: 'named' | 'default' | 'namespace' | 'dynamic' | 'side-effect';
  specifiers: string[]; // What's actually imported
  location: { row: number; column: number };
  isTypeOnly?: boolean; // TypeScript type imports
}

export interface UsageStats {
  importName: string;
  usageCount: number;
  locations: Array<{ row: number; column: number }>;
  unusedSpecifiers: string[];
  isUnused: boolean;
}

export interface LibraryMetadata {
  name: string;
  latestVersion?: string;
  deprecated: boolean;
  alternatives?: string[];
  securityAdvisories: number;
  category: string;
}

export interface ErrorHandlingStrategy {
  approach: 'exceptions' | 'result-types' | 'panic' | 'silent' | 'mixed' | 'unknown';
  confidence: number;
  indicators: string[];
  hasErrorHandling: boolean;
}
export interface LibraryInfo {
  name: string;
  category: 'standard' | 'framework' | 'utility' | 'testing' | 'database' | 'ui' | 'unknown';
  isStandardLib: boolean;
  importPath: string;
}

export interface LibraryAnalysisResult {
  libraries: LibraryInfo[];
  frameworks: {
    name: string;
    confidence: number;
    indicators: string[];
  }[];
  packageManager?: 'npm' | 'pip' | 'cargo' | 'go-mod' | 'maven' | 'gem' | 'composer';
  externalInteractions: ExternalInteractionAnalysis & { determinismReasoning: DeterminismReasoning };
  errorHandling: ErrorHandlingStrategy;
  outputContract: OutputContract;

  // NEW FIELDS:
  importUsage?: Map<string, UsageStats>; // Track which imports are actually used
  securityIssues?: Array<{
    library: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  versionCompatibility?: Array<{
    library: string;
    detectedVersion?: string;
    latestVersion?: string;
    compatible: boolean;
  }>;
}
export interface DeterminismReasoning {
  isDeterministic: boolean;
  confidence: number;
  reasoning: string[];
  nondeterministicSources: Array<{
    source: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;

  // Explicit classification metadata
  classification: {
    class: 'fully-deterministic' | 'value-deterministic' | 'weakly-deterministic' | 'execution-nondeterministic' | 'value-nondeterministic';
    valueStability: 'stable' | 'unstable' | 'conditional';
    orderStability: 'stable' | 'unstable' | 'unordered';
    hasRaceConditions: boolean;
    hasTimeDependency: boolean;
    hasRandomness: boolean;
    hasExternalState: boolean;
    llmGuidance: string;
  };
}

export interface OutputContract {
  returnTypes: string[];
  structure: 'primitive' | 'object' | 'array' | 'union' | 'unknown';
  semanticMeaning: string;
  guarantees: string[];
  uncertainties: string[];
}
// Standard library mappings
const STANDARD_LIBS: Record<SupportedLanguage, Set<string>> = {
  typescript: new Set(['fs', 'path', 'http', 'https', 'util', 'os', 'crypto', 'stream', 'events', 'buffer', 'child_process', 'url', 'querystring', 'readline']),
  python: new Set(['sys', 'os', 'math', 're', 'json', 'datetime', 'collections', 'itertools', 'functools', 'pathlib', 'typing', 'random', 'time', 'io', 'subprocess', 'urllib', 'http', 'socket', 'threading', 'multiprocessing', 'asyncio', 'unittest', 'logging', 'argparse']),
  go: new Set(['fmt', 'os', 'io', 'time', 'strings', 'strconv', 'math', 'rand', 'sync', 'encoding/json', 'net/http', 'context', 'errors', 'log', 'testing', 'bytes', 'bufio', 'path', 'filepath']),
  rust: new Set(['std', 'core', 'alloc']),
  java: new Set(['java.lang', 'java.util', 'java.io', 'java.nio', 'java.net', 'java.math', 'java.time', 'java.text', 'java.util.concurrent', 'java.util.stream', 'java.util.function']),
  cpp: new Set(['iostream', 'vector', 'string', 'map', 'set', 'algorithm', 'memory', 'cmath', 'cstring', 'cstdlib', 'cstdio', 'fstream', 'sstream', 'thread', 'mutex', 'atomic']),
  c: new Set(['stdio.h', 'stdlib.h', 'string.h', 'math.h', 'time.h', 'ctype.h', 'limits.h', 'stdint.h', 'stdbool.h', 'assert.h', 'errno.h']),
  ruby: new Set(['fileutils', 'json', 'yaml', 'uri', 'net/http', 'time', 'date', 'set', 'ostruct', 'tempfile', 'pathname', 'digest', 'base64', 'securerandom']),
  php: new Set(['PDO', 'DateTime', 'Exception', 'ArrayObject', 'SplFileObject', 'DirectoryIterator']),
};

// Library categorization database
const LIBRARY_CATEGORIES: Record<string, { category: LibraryInfo['category'], framework?: string }> = {
  // JavaScript/TypeScript
  'react': { category: 'framework', framework: 'React' },
  'vue': { category: 'framework', framework: 'Vue' },
  'angular': { category: 'framework', framework: 'Angular' },
  'express': { category: 'framework', framework: 'Express' },
  'next': { category: 'framework', framework: 'Next.js' },
  'nest': { category: 'framework', framework: 'NestJS' },
  'svelte': { category: 'framework', framework: 'Svelte' },
  'lodash': { category: 'utility' },
  'axios': { category: 'utility' },
  'moment': { category: 'utility' },
  'dayjs': { category: 'utility' },
  'jest': { category: 'testing' },
  'mocha': { category: 'testing' },
  'chai': { category: 'testing' },
  'vitest': { category: 'testing' },
  'testing-library': { category: 'testing' },
  'mongoose': { category: 'database' },
  'sequelize': { category: 'database' },
  'prisma': { category: 'database' },
  'typeorm': { category: 'database' },
  'styled-components': { category: 'ui' },
  'tailwindcss': { category: 'ui' },
  'material-ui': { category: 'ui' },
  '@mui': { category: 'ui' },
  'antd': { category: 'ui' },
  'lucide-react': { category: 'ui' },

  // Python
  'django': { category: 'framework', framework: 'Django' },
  'flask': { category: 'framework', framework: 'Flask' },
  'fastapi': { category: 'framework', framework: 'FastAPI' },
  'tornado': { category: 'framework', framework: 'Tornado' },
  'numpy': { category: 'utility' },
  'pandas': { category: 'utility' },
  'requests': { category: 'utility' },
  'pytest': { category: 'testing' },
  'unittest': { category: 'testing' },
  'sqlalchemy': { category: 'database' },
  'pymongo': { category: 'database' },
  'psycopg2': { category: 'database' },
  'tkinter': { category: 'ui' },
  'pyside': { category: 'ui' },

  // Go
  'gin': { category: 'framework', framework: 'Gin' },
  'echo': { category: 'framework', framework: 'Echo' },
  'fiber': { category: 'framework', framework: 'Fiber' },
  'gorm': { category: 'database' },
  'testify': { category: 'testing' },

  // Rust
  'actix': { category: 'framework', framework: 'Actix' },
  'rocket': { category: 'framework', framework: 'Rocket' },
  'axum': { category: 'framework', framework: 'Axum' },
  'tokio': { category: 'framework' },
  'diesel': { category: 'database' },
  'sqlx': { category: 'database' },

  // Java
  'springframework': { category: 'framework', framework: 'Spring' },
  'spring': { category: 'framework', framework: 'Spring' },
  'hibernate': { category: 'database' },
  'junit': { category: 'testing' },
  'mockito': { category: 'testing' },

  // Ruby
  'rails': { category: 'framework', framework: 'Rails' },
  'sinatra': { category: 'framework', framework: 'Sinatra' },
  'rspec': { category: 'testing' },
  'activerecord': { category: 'database' },

  // PHP
  'laravel': { category: 'framework', framework: 'Laravel' },
  'symfony': { category: 'framework', framework: 'Symfony' },
  'phpunit': { category: 'testing' },
  'doctrine': { category: 'database' },
};

// Framework detection patterns
const FRAMEWORK_PATTERNS: Record<string, { imports: string[], indicators: string[], confidence: number }> = {
  'React': {
    imports: ['react', 'react-dom', 'react-router'],
    indicators: ['useState', 'useEffect', 'useContext', 'useReducer', 'Component', 'createElement'],
    confidence: 0.95
  },
  'Vue': {
    imports: ['vue', 'vue-router', 'vuex', 'pinia'],
    indicators: ['createApp', 'ref', 'reactive', 'computed', 'watch'],
    confidence: 0.95
  },
  'Angular': {
    imports: ['@angular/core', '@angular/common', '@angular/router'],
    indicators: ['Component', 'NgModule', 'Injectable', 'Directive'],
    confidence: 0.98
  },
  'Express': {
    imports: ['express'],
    indicators: ['app.get', 'app.post', 'app.use', 'req.', 'res.'],
    confidence: 0.90
  },
  'Django': {
    imports: ['django'],
    indicators: ['models.Model', 'views', 'HttpResponse', 'render'],
    confidence: 0.95
  },
  'Flask': {
    imports: ['flask'],
    indicators: ['Flask', 'route', 'request', 'render_template'],
    confidence: 0.90
  },
  'FastAPI': {
    imports: ['fastapi'],
    indicators: ['FastAPI', 'APIRouter', 'HTTPException', 'Depends'],
    confidence: 0.95
  },
  'Spring': {
    imports: ['org.springframework'],
    indicators: ['@SpringBootApplication', '@RestController', '@Service', '@Autowired'],
    confidence: 0.95
  },
  'Rails': {
    imports: ['rails'],
    indicators: ['ActiveRecord', 'ActionController', 'render', 'redirect_to'],
    confidence: 0.90
  },
};

/**
 * Extract import information from CST nodes
 * UPDATED: Now uses full, untruncated text from CSTNode
 */
function extractImports(node: CSTNode, language: SupportedLanguage): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function traverse(n: CSTNode) {
    // TypeScript/JavaScript imports
    if (language === 'typescript') {
      if (n.type === 'import_statement') {
        const importPath = extractImportPath(n);
        const specifiers = extractImportSpecifiers(n);
        const isTypeOnly = n.text.toLowerCase().includes('import type');

        if (importPath) {
          imports.push({
            name: importPath.split('/').pop() || importPath,
            path: importPath,
            type: determineImportType(n),
            specifiers,
            location: n.startPosition,
            isTypeOnly
          });
        }
      }
    }

    // Python imports
    if (language === 'python') {
      if (n.type === 'import_statement' || n.type === 'import_from_statement') {
        const moduleNode = n.children.find(c =>
          c.type === 'dotted_name' || c.type === 'identifier'
        );
        if (moduleNode) {
          const moduleName = moduleNode.text.split('.')[0];
          imports.push({
            name: moduleName,
            path: moduleNode.text,
            type: n.type === 'import_from_statement' ? 'named' : 'namespace',
            specifiers: extractPythonSpecifiers(n),
            location: n.startPosition
          });
        }
      }
    }

    // Go imports
    if (language === 'go') {
      if (n.type === 'import_declaration') {
        n.children.forEach(child => {
          if (child.type === 'import_spec') {
            const pathNode = child.children.find(c => c.type === 'interpreted_string_literal');
            if (pathNode) {
              const importPath = pathNode.text.replace(/"/g, '');
              const parts = importPath.split('/');
              imports.push({
                name: parts[parts.length - 1],
                path: importPath,
                type: 'namespace',
                specifiers: [],
                location: child.startPosition
              });
            }
          }
        });
      }
    }

    // Rust uses
    if (language === 'rust') {
      if (n.type === 'use_declaration') {
        const pathNode = n.children.find(c => c.type === 'scoped_identifier' || c.type === 'identifier');
        if (pathNode) {
          const crateName = pathNode.text.split('::')[0];
          imports.push({
            name: crateName,
            path: pathNode.text,
            type: 'namespace',
            specifiers: extractRustSpecifiers(n),
            location: n.startPosition
          });
        }
      }
    }

    n.children.forEach(traverse);
  }

  traverse(node);
  return imports;
}


function extractImportPath(node: CSTNode): string | null {
  const stringNode = node.children.find(c => c.type === 'string' || c.type === 'string_fragment');
  if (stringNode) {
    return stringNode.text.replace(/['"]/g, '');
  }
  return null;
}

function extractImportSpecifiers(node: CSTNode): string[] {
  const specifiers: string[] = [];

  function findSpecifiers(n: CSTNode) {
    if (n.type === 'import_specifier' || n.type === 'identifier') {
      const name = n.text.trim();
      if (name && name.length > 0 && name !== 'from' && name !== 'import') {
        specifiers.push(name);
      }
    }
    n.children.forEach(findSpecifiers);
  }

  findSpecifiers(node);
  return [...new Set(specifiers)];
}

function extractPythonSpecifiers(node: CSTNode): string[] {
  const specifiers: string[] = [];

  function findSpecifiers(n: CSTNode) {
    if (n.type === 'dotted_name' || n.type === 'identifier') {
      const name = n.text.trim();
      if (name && !name.includes('import') && !name.includes('from')) {
        specifiers.push(name);
      }
    }
    n.children.forEach(findSpecifiers);
  }

  findSpecifiers(node);
  return [...new Set(specifiers)];
}

function extractRustSpecifiers(node: CSTNode): string[] {
  const specifiers: string[] = [];
  const text = node.text;

  // Extract from use statements like: use std::{io, fs};
  const braceMatch = text.match(/\{([^}]+)\}/);
  if (braceMatch) {
    specifiers.push(...braceMatch[1].split(',').map(s => s.trim()));
  } else {
    // Single import
    const parts = text.split('::');
    if (parts.length > 0) {
      specifiers.push(parts[parts.length - 1].replace(/;/g, '').trim());
    }
  }

  return specifiers;
}

function determineImportType(node: CSTNode): ImportInfo['type'] {
  const text = node.text.toLowerCase();

  if (text.includes('import(')) return 'dynamic';
  if (text.includes('* as ')) return 'namespace';
  if (text.includes('import \'') || text.includes('import "')) {
    // Check if it's just importing for side effects
    if (!text.includes('from') && !text.includes('{')) return 'side-effect';
  }
  if (text.includes('default')) return 'default';

  return 'named';
}

function trackImportUsage(
  imports: ImportInfo[],
  cst: CSTNode
): Map<string, UsageStats> {
  const usageMap = new Map<string, UsageStats>();
  const codeText = cst.text;

  for (const imp of imports) {
    const stats: UsageStats = {
      importName: imp.name,
      usageCount: 0,
      locations: [],
      unusedSpecifiers: [...imp.specifiers],
      isUnused: true
    };

    // Count occurrences of import name (excluding the import statement itself)
    const importLineEnd = imp.location.row + 1;
    const codeAfterImport = codeText.split('\n').slice(importLineEnd).join('\n');

    // Count direct usage of import name
    const importNameRegex = new RegExp(`\\b${escapeRegex(imp.name)}\\b`, 'g');
    let match;
    while ((match = importNameRegex.exec(codeAfterImport)) !== null) {
      stats.usageCount++;
      stats.isUnused = false;
    }

    // Check specifiers usage
    stats.unusedSpecifiers = imp.specifiers.filter(spec => {
      const specRegex = new RegExp(`\\b${escapeRegex(spec)}\\b`, 'g');
      return !specRegex.test(codeAfterImport);
    });

    usageMap.set(imp.name, stats);
  }

  return usageMap;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function getLibraryMetadata(name: string, language: SupportedLanguage): LibraryMetadata {
  // This would fetch from APIs in production
  // For now, return basic info

  const knownDeprecated = new Set([
    'moment', // Use date-fns or dayjs
    'request', // Use axios or fetch
    'gulp', // Use webpack/vite
  ]);

  return {
    name,
    deprecated: knownDeprecated.has(name.toLowerCase()),
    alternatives: knownDeprecated.has(name.toLowerCase())
      ? getAlternatives(name)
      : undefined,
    securityAdvisories: 0,
    category: categorizeLibrary(name, language)
  };
}

function getAlternatives(name: string): string[] {
  const alternatives: Record<string, string[]> = {
    'moment': ['date-fns', 'dayjs', 'luxon'],
    'request': ['axios', 'node-fetch', 'got'],
    'gulp': ['webpack', 'vite', 'esbuild'],
  };

  return alternatives[name.toLowerCase()] || [];
}
/**
 * Categorize a library
 */
function categorizeLibrary(name: string, language: SupportedLanguage): LibraryInfo['category'] {
  const lowerName = name.toLowerCase();

  // Check direct matches
  for (const [key, value] of Object.entries(LIBRARY_CATEGORIES)) {
    if (lowerName.includes(key.toLowerCase())) {
      return value.category;
    }
  }

  // Check standard library
  if (STANDARD_LIBS[language]?.has(name)) {
    return 'standard';
  }

  // Heuristic categorization
  if (lowerName.includes('test') || lowerName.includes('spec') || lowerName.includes('mock')) {
    return 'testing';
  }
  if (lowerName.includes('db') || lowerName.includes('sql') || lowerName.includes('mongo') || lowerName.includes('redis')) {
    return 'database';
  }
  if (lowerName.includes('ui') || lowerName.includes('component') || lowerName.includes('style')) {
    return 'ui';
  }

  return 'unknown';
}

/**
 * Detect package manager from imports
 */
function detectPackageManager(language: SupportedLanguage): LibraryAnalysisResult['packageManager'] {
  const managerMap: Record<SupportedLanguage, LibraryAnalysisResult['packageManager']> = {
    typescript: 'npm',
    python: 'pip',
    go: 'go-mod',
    rust: 'cargo',
    java: 'maven',
    cpp: undefined,
    c: undefined,
    ruby: 'gem',
    php: 'composer',
  };

  return managerMap[language];
}

/**
 * Detect frameworks from imports and code patterns
 * UPDATED: Now uses full, untruncated text from CSTNode
 */
function detectFrameworks(
  libraries: LibraryInfo[],
  cstNode: CSTNode
): Array<{ name: string; confidence: number; indicators: string[] }> {
  const frameworks: Array<{ name: string; confidence: number; indicators: string[] }> = [];
  const libraryNames = libraries.map(l => l.name.toLowerCase());

  // Use full text - NO TRUNCATION
  const codeText = cstNode.text.toLowerCase();

  for (const [frameworkName, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
    let confidence = 0;
    const foundIndicators: string[] = [];

    // Check imports
    const importMatches = pattern.imports.filter(imp =>
      libraryNames.some(lib => lib.includes(imp.toLowerCase()))
    );
    if (importMatches.length > 0) {
      confidence = pattern.confidence;
      foundIndicators.push(...importMatches.map(imp => `imports ${imp}`));
    }

    // Check code indicators
    const indicatorMatches = pattern.indicators.filter(indicator =>
      codeText.includes(indicator.toLowerCase())
    );
    if (indicatorMatches.length > 0) {
      confidence = Math.max(confidence, pattern.confidence * 0.7);
      foundIndicators.push(...indicatorMatches.map(ind => `uses ${ind}`));
    }

    if (confidence > 0.5 && foundIndicators.length > 0) {
      frameworks.push({
        name: frameworkName,
        confidence: Math.round(confidence * 100) / 100,
        indicators: foundIndicators.slice(0, 3),
      });
    }
  }

  return frameworks.sort((a, b) => b.confidence - a.confidence);
}





/**
 * Detect external interactions with determinism reasoning
 */
function analyzeExternalInteractions(
  cst: CSTNode,
  libraries: LibraryInfo[]
): ExternalInteractionAnalysis & { determinismReasoning: DeterminismReasoning } {
  const types = new Set<ExternalInteractionType>();
  const indicators: string[] = [];
  const nondeterministicSources: Array<{
    source: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }> = [];
  const reasoning: string[] = [];

  const codeText = cst.text.toLowerCase();
  const libNames = libraries.map(l => l.name.toLowerCase());

  // Filesystem
  if (codeText.includes('readfile') || codeText.includes('writefile') ||
    codeText.includes('fs.') || libNames.some(l => l.includes('fs'))) {
    types.add('filesystem');
    indicators.push('file I/O');
    nondeterministicSources.push({
      source: 'filesystem',
      severity: 'high',
      explanation: 'File contents can change between executions'
    });
    reasoning.push('File system state is external and mutable');
  }

  // Network
  if (codeText.includes('fetch') || codeText.includes('http') || codeText.includes('axios') ||
    codeText.includes('request') || libNames.some(l => l.includes('http') || l === 'axios')) {
    types.add('network');
    indicators.push('network requests');
    nondeterministicSources.push({
      source: 'network',
      severity: 'high',
      explanation: 'Network responses vary based on server state and availability'
    });
    reasoning.push('Network calls depend on remote state');
  }

  // Database
  if (libNames.some(l => l.includes('sql') || l.includes('mongo') || l.includes('redis') || l.includes('db'))) {
    types.add('database');
    indicators.push('database access');
    nondeterministicSources.push({
      source: 'database',
      severity: 'high',
      explanation: 'Database content changes over time'
    });
    reasoning.push('Database queries return mutable external state');
  }

  // Environment
  if (codeText.includes('process.env') || codeText.includes('os.environ') ||
    codeText.includes('getenv')) {
    types.add('environment');
    indicators.push('environment variables');
    nondeterministicSources.push({
      source: 'environment',
      severity: 'medium',
      explanation: 'Environment variables differ across deployments'
    });
    reasoning.push('Relies on external configuration');
  }

  // Process
  if (codeText.includes('process.') || codeText.includes('subprocess') ||
    codeText.includes('exec') || codeText.includes('spawn')) {
    types.add('process');
    indicators.push('process execution');
    nondeterministicSources.push({
      source: 'external-process',
      severity: 'high',
      explanation: 'External process output is unpredictable'
    });
    reasoning.push('Executes external processes with variable output');
  }

  // Randomness
  if (codeText.includes('random') || codeText.includes('math.random') ||
    codeText.includes('uuid')) {
    nondeterministicSources.push({
      source: 'randomness',
      severity: 'high',
      explanation: 'Uses random number generation'
    });
    reasoning.push('Generates random values');
  }

  // Time
  if (codeText.includes('date.now') || codeText.includes('datetime') ||
    codeText.includes('time.time')) {
    nondeterministicSources.push({
      source: 'time',
      severity: 'medium',
      explanation: 'Depends on current timestamp'
    });
    reasoning.push('Reads current time');
  }

  if (types.size === 0) types.add('none');

  const isDeterministic = nondeterministicSources.length === 0;
  if (isDeterministic) {
    reasoning.push('No external dependencies detected');
    reasoning.push('Output depends only on inputs');
  }

  const confidence = types.size > 0 || nondeterministicSources.length > 0 ? 0.9 : 0.6;

  // Classify determinism with fine-grained metadata
  const hasRaceConditions =
    codeText.includes('thread') ||
    codeText.includes('async') ||
    codeText.includes('parallel') ||
    codeText.includes('concurrent') ||
    codeText.includes('goroutine') ||
    codeText.includes('promise.all');

  const hasTimeDependency =
    nondeterministicSources.some(s => s.source === 'time');

  const hasRandomness =
    nondeterministicSources.some(s => s.source === 'randomness');

  const hasExternalState =
    nondeterministicSources.some(s =>
      ['filesystem', 'network', 'database', 'environment'].includes(s.source)
    );

  // Determine classification
  let deterministicClass: DeterminismReasoning['classification']['class'];
  let valueStability: 'stable' | 'unstable' | 'conditional';
  let orderStability: 'stable' | 'unstable' | 'unordered';
  let llmGuidance: string;

  if (isDeterministic) {
    deterministicClass = 'fully-deterministic';
    valueStability = 'stable';
    orderStability = 'stable';
    llmGuidance = 'Same inputs always produce same outputs in same order. Safe to assume stable behavior.';
  } else if (hasRaceConditions && !hasRandomness && !hasTimeDependency) {
    deterministicClass = 'execution-nondeterministic';
    valueStability = 'stable';
    orderStability = 'unstable';
    llmGuidance = 'Values are deterministic but execution order/timing may vary due to concurrency. Do NOT assume stable ordering of async operations.';
  } else if ((hasRandomness || hasTimeDependency) && !hasExternalState) {
    deterministicClass = 'weakly-deterministic';
    valueStability = 'conditional';
    orderStability = 'stable';
    llmGuidance = 'Deterministic with fixed seed/timestamp. Different values on each run unless inputs are controlled.';
  } else if (hasExternalState) {
    deterministicClass = 'value-nondeterministic';
    valueStability = 'unstable';
    orderStability = 'unstable';
    llmGuidance = 'Depends on external mutable state (filesystem, network, database). Values and order both unpredictable.';
  } else {
    deterministicClass = 'value-nondeterministic';
    valueStability = 'unstable';
    orderStability = 'stable';
    llmGuidance = 'Values change between runs. Cannot assume consistent output.';
  }

  const classification: DeterminismReasoning['classification'] = {
    class: deterministicClass,
    valueStability,
    orderStability,
    hasRaceConditions,
    hasTimeDependency,
    hasRandomness,
    hasExternalState,
    llmGuidance,
  };

  const determinismReasoning: DeterminismReasoning = {
    isDeterministic,
    confidence,
    reasoning: reasoning.slice(0, 3),
    nondeterministicSources,
    classification,
  };

  return {
    types: Array.from(types),
    confidence,
    indicators: indicators.slice(0, 4),
    isDeterministic,
    nondeterministicSources: nondeterministicSources.map(s => s.source).slice(0, 3),
    determinismReasoning,
  };
}

/**
 * Extract output contract from code
 */
function extractOutputContract(cst: CSTNode, language: SupportedLanguage): OutputContract {
  const returnTypes: string[] = [];
  const guarantees: string[] = [];
  const uncertainties: string[] = [];
  const codeText = cst.text;

  // TypeScript return type annotations
  if (language === 'typescript') {
    const returnMatches = codeText.match(/:\s*([\w<>[\]|]+)\s*=>/g) ||
      codeText.match(/\):\s*([\w<>[\]|]+)\s*{/g);
    if (returnMatches) {
      returnMatches.forEach(match => {
        const type = match.match(/:\s*([\w<>[\]|]+)/)?.[1];
        if (type) returnTypes.push(type);
      });
    }
  }

  // Detect structure from returns
  const hasReturnObject = /return\s*\{/.test(codeText);
  const hasReturnArray = /return\s*\[/.test(codeText);
  const hasReturnPrimitive = /return\s+(\d+|true|false|null|"[^"]*"|'[^']*')/.test(codeText);

  let structure: OutputContract['structure'] = 'unknown';
  if (hasReturnObject) {
    structure = 'object';
    guarantees.push('Returns structured object');
  } else if (hasReturnArray) {
    structure = 'array';
    guarantees.push('Returns array/list');
  } else if (hasReturnPrimitive) {
    structure = 'primitive';
    guarantees.push('Returns primitive value');
  }

  if (returnTypes.length > 1) {
    structure = 'union';
    uncertainties.push('Multiple return types possible');
  }

  // Semantic meaning heuristics
  let semanticMeaning = 'Unspecified output';
  if (codeText.toLowerCase().includes('validate')) {
    semanticMeaning = 'Validation result (boolean or error)';
    guarantees.push('Indicates validity');
  } else if (codeText.toLowerCase().includes('parse')) {
    semanticMeaning = 'Parsed structured data';
    guarantees.push('Structured representation of input');
  } else if (codeText.toLowerCase().includes('format') || codeText.toLowerCase().includes('render')) {
    semanticMeaning = 'Formatted output string';
    guarantees.push('Human-readable format');
  }

  if (!hasReturnObject && !hasReturnArray && !hasReturnPrimitive) {
    uncertainties.push('No explicit return statements found');
  }

  return {
    returnTypes: [...new Set(returnTypes)],
    structure,
    semanticMeaning,
    guarantees,
    uncertainties,
  };
}
/**
 * Analyze error handling strategy
 */
function analyzeErrorHandling(
  cst: CSTNode,
  language: SupportedLanguage
): ErrorHandlingStrategy {
  const indicators: string[] = [];
  const codeText = cst.text.toLowerCase();

  let approach: ErrorHandlingStrategy['approach'] = 'unknown';
  let hasErrorHandling = false;
  let score = 0;

  // Exceptions
  const hasTryCatch = codeText.includes('try') && codeText.includes('catch');
  const hasThrow = codeText.includes('throw');
  if (hasTryCatch || hasThrow) {
    score += 2;
    indicators.push('try-catch blocks');
    hasErrorHandling = true;
  }

  // Result types
  const hasResultType = codeText.includes('result<') || codeText.includes('option<') ||
    codeText.includes('either') || codeText.includes('ok(') || codeText.includes('err(');
  if (hasResultType) {
    score += 2;
    indicators.push('result types');
    hasErrorHandling = true;
  }

  // Panic
  const hasPanic = codeText.includes('panic') || codeText.includes('unwrap') ||
    codeText.includes('expect');
  if (hasPanic) {
    score += 1;
    indicators.push('panic/unwrap');
  }

  // Determine approach
  if (hasTryCatch && !hasResultType) approach = 'exceptions';
  else if (hasResultType && !hasTryCatch) approach = 'result-types';
  else if (hasPanic && !hasTryCatch && !hasResultType) approach = 'panic';
  else if ((hasTryCatch || hasResultType) && hasPanic) approach = 'mixed';
  else if (!hasErrorHandling) approach = 'silent';

  const confidence = score > 0 ? 0.85 : 0.3;

  return {
    approach,
    confidence,
    indicators: indicators.slice(0, 3),
    hasErrorHandling,
  };
}

/**
 * Analyze libraries from CST
 * UPDATED: Now uses CSTNode instead of ASTNode for lossless analysis
 */
export function analyzeLibraries(
  cst: CSTNode,
  language: SupportedLanguage
): LibraryAnalysisResult {
  // Extract detailed imports
  const importInfos = extractImports(cst, language);

  // Track usage
  const importUsage = trackImportUsage(importInfos, cst);

  // Create library info with metadata
  const libraries: LibraryInfo[] = importInfos.map((imp: { name: string; path: any; }) => {
    const isStandardLib = STANDARD_LIBS[language]?.has(imp.name) || false;
    const category = categorizeLibrary(imp.name, language);

    return {
      name: imp.name,
      category,
      isStandardLib,
      importPath: imp.path,
    };
  });

  // Detect frameworks
  const frameworks = detectFrameworks(libraries, cst);

  // Detect package manager
  const packageManager = detectPackageManager(language);

  // Analyze external interactions
  const externalInteractions = analyzeExternalInteractions(cst, libraries);

  // Analyze error handling
  const errorHandling = analyzeErrorHandling(cst, language);

  // Extract output contract
  const outputContract = extractOutputContract(cst, language);

  // Check for security issues (placeholder)
  const securityIssues = libraries
    .map(lib => getLibraryMetadata(lib.name, language))
    .filter(meta => meta.deprecated)
    .map(meta => ({
      library: meta.name,
      severity: 'medium' as const,
      description: `${meta.name} is deprecated. Consider using: ${meta.alternatives?.join(', ')}`
    }));

  return {
    libraries,
    frameworks,
    packageManager,
    externalInteractions,
    errorHandling,
    outputContract,
    importUsage,
    securityIssues: securityIssues.length > 0 ? securityIssues : undefined,
  };
}


