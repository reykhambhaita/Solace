/**
 * Library Analysis Component
 * Extracts and categorizes imported libraries/dependencies from code using CST
 * UPDATED: Now uses lossless CSTNode instead of truncated ASTNode
 */

import type { SupportedLanguage } from './language-detector';
import type { CSTNode } from './semantic-ir';

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
function extractImports(node: CSTNode, language: SupportedLanguage): string[] {
  const imports: string[] = [];

  function traverse(n: CSTNode) {
    // TypeScript/JavaScript imports
    if (language === 'typescript') {
      if (n.type === 'import_statement') {
        // Look for string literals in import statements
        const stringNode = n.children.find(c => c.type === 'string' || c.type === 'string_fragment');
        if (stringNode) {
          // Use full text - NO TRUNCATION
          const importPath = stringNode.text.replace(/['"]/g, '');
          imports.push(importPath);
        }
      }
    }

    // Python imports
    if (language === 'python') {
      if (n.type === 'import_statement' || n.type === 'import_from_statement') {
        // Get module name
        const moduleNode = n.children.find(c =>
          c.type === 'dotted_name' || c.type === 'identifier' || c.type === 'aliased_import'
        );
        if (moduleNode) {
          // Use full text - NO TRUNCATION
          imports.push(moduleNode.text.split('.')[0]);
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
              // Use full text - NO TRUNCATION
              const importPath = pathNode.text.replace(/"/g, '');
              const parts = importPath.split('/');
              imports.push(parts[parts.length - 1]);
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
          // Use full text - NO TRUNCATION
          imports.push(pathNode.text.split('::')[0]);
        }
      }
    }

    // Java imports
    if (language === 'java') {
      if (n.type === 'import_declaration') {
        const pathNode = n.children.find(c => c.type === 'scoped_identifier' || c.type === 'identifier');
        if (pathNode) {
          // Use full text - NO TRUNCATION
          const parts = pathNode.text.split('.');
          imports.push(parts.length > 2 ? parts.slice(0, 2).join('.') : parts[0]);
        }
      }
    }

    // C/C++ includes
    if (language === 'cpp' || language === 'c') {
      if (n.type === 'preproc_include') {
        const pathNode = n.children.find(c => c.type === 'system_lib_string' || c.type === 'string_literal');
        if (pathNode) {
          // Use full text - NO TRUNCATION
          const lib = pathNode.text.replace(/[<>"]/g, '');
          imports.push(lib);
        }
      }
    }

    // Ruby requires
    if (language === 'ruby') {
      if (n.type === 'call' && n.text.startsWith('require')) {
        const stringNode = n.children.find(c => c.type === 'string' || c.type === 'simple_symbol');
        if (stringNode) {
          // Use full text - NO TRUNCATION
          imports.push(stringNode.text.replace(/['"]/g, ''));
        }
      }
    }

    // PHP uses
    if (language === 'php') {
      if (n.type === 'namespace_use_declaration') {
        const nameNode = n.children.find(c => c.type === 'namespace_name' || c.type === 'qualified_name');
        if (nameNode) {
          // Use full text - NO TRUNCATION
          const parts = nameNode.text.split('\\');
          imports.push(parts[parts.length - 1]);
        }
      }
    }

    n.children.forEach(traverse);
  }

  traverse(node);
  return [...new Set(imports)]; // Remove duplicates
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
 * Analyze libraries from CST
 * UPDATED: Now uses CSTNode instead of ASTNode for lossless analysis
 */
export function analyzeLibraries(
  cst: CSTNode,
  language: SupportedLanguage
): LibraryAnalysisResult {
  // Extract imports - now with full text access
  const importNames = extractImports(cst, language);

  // Create library info
  const libraries: LibraryInfo[] = importNames.map(name => {
    const isStandardLib = STANDARD_LIBS[language]?.has(name) || false;
    const category = categorizeLibrary(name, language);

    return {
      name,
      category,
      isStandardLib,
      importPath: name,
    };
  });

  // Detect frameworks - now with full text access
  const frameworks = detectFrameworks(libraries, cst);

  // Detect package manager
  const packageManager = detectPackageManager(language);

  return {
    libraries,
    frameworks,
    packageManager,
  };
}