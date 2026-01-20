import type { CSTNode } from '../analyzer/semantic-ir';
import type { SupportedLanguage } from './language-detector';
import type { LibraryAnalysisResult } from './library-analyzer';

export type CodeType =
  | 'test'
  | 'script'
  | 'library'
  | 'application'
  | 'configuration'
  | 'unknown';

export interface CodeTypeResult {
  // Primary type
  type: CodeType;
  confidence: number;
  indicators: string[];

  // NEW: Secondary type if significant
  secondary?: {
    type: CodeType;
    confidence: number;
  };

  entryPoints?: string[];
  exports?: string[];
  executionIntent?: ExecutionIntent;

  // NEW: More detailed test classification
  testType?: 'unit' | 'integration' | 'e2e' | 'unknown';

  // NEW: Execution context
  executionContext?: ExecutionContext;
}

export interface ExecutionContext {
  canRunStandalone: boolean;
  requiresRuntime: string[]; // e.g., ['node', 'browser', 'deno']
  environmentDependencies: string[]; // env vars, etc.
  buildRequired: boolean;
  runnabilityScore: number; // 0-1
}
export interface ExecutionIntent {
  isRunnable: boolean;
  confidence: number;
  entryPointType: 'explicit-main' | 'top-level' | 'module-export' | 'none';
  runnabilityIndicators: string[];
  blockers: string[];
}




// Test framework indicators
const TEST_FRAMEWORKS = new Set([
  'jest', 'mocha', 'chai', 'jasmine', 'vitest', 'ava', '@testing-library',
  'pytest', 'unittest', 'nose', 'doctest',
  'junit', 'testng', 'mockito',
  'testify', 'gotest',
  'rspec', 'minitest',
  'phpunit',
]);

// Test function patterns
const TEST_PATTERNS = {
  typescript: ['describe(', 'it(', 'test(', 'expect(', 'assert', 'beforeEach(', 'afterEach(', 'beforeAll(', 'afterAll('],
  python: ['def test_', 'class Test', 'unittest.TestCase', 'pytest', 'assert ', '@pytest', 'def setUp', 'def tearDown'],
  go: ['func Test', '*testing.T', 't.Run(', 't.Error(', 't.Fatal('],
  rust: ['#[test]', '#[cfg(test)]', 'assert_eq!', 'assert!', '#[should_panic]'],
  java: ['@Test', '@Before', '@After', '@BeforeClass', '@AfterClass', 'assertEquals', 'assertTrue', 'assertFalse'],
  cpp: ['TEST(', 'EXPECT_', 'ASSERT_', 'TEST_F(', 'GTEST_'],
  c: ['assert(', 'CU_ASSERT', 'TEST_'],
  ruby: ['describe ', 'it ', 'expect(', 'should ', 'RSpec', 'test_', 'assert_'],
  php: ['function test', 'class Test', 'PHPUnit', 'assertEquals', 'assertTrue', 'assertFalse'],
};

// Entry point patterns
const ENTRY_POINTS = {
  typescript: ['function main(', 'const main =', 'async function main'],
  python: ['if __name__ == "__main__"', "if __name__ == '__main__'", 'def main('],
  go: ['func main()'],
  rust: ['fn main()'],
  java: ['public static void main(', 'public static void main ('],
  cpp: ['int main(', 'void main('],
  c: ['int main(', 'void main('],
  ruby: ['if __FILE__ == $0', 'if __FILE__ == $PROGRAM_NAME'],
  php: ['// Entry point', '// Main script'],
};

// Export patterns
const EXPORT_PATTERNS = {
  typescript: ['export function', 'export class', 'export const', 'export default', 'export {', 'export *', 'module.exports'],
  python: ['def ', 'class '],
  go: ['func [A-Z]'], // Capital letter = exported
  rust: ['pub fn', 'pub struct', 'pub enum', 'pub trait'],
  java: ['public class', 'public interface', 'public enum'],
  cpp: ['extern "C"', 'class [A-Z]'],
  c: ['extern ', 'struct ', 'typedef'],
  ruby: ['module ', 'class '],
  php: ['class ', 'function ', 'interface '],
};

/**
 * Check if code contains test patterns
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function detectTest(
  cst: CSTNode,
  language: SupportedLanguage,
  libraries: LibraryAnalysisResult
): { isTest: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Check for test frameworks in imports
  const hasTestFramework = libraries.libraries.some(lib =>
    TEST_FRAMEWORKS.has(lib.name.toLowerCase()) || lib.category === 'testing'
  );

  if (hasTestFramework) {
    score += 40;
    const frameworks = libraries.libraries.filter(l => l.category === 'testing');
    indicators.push(`imports ${frameworks[0]?.name || 'test framework'}`);
  }

  // Check for test patterns in code - now with full text access
  const codeText = cst.text.toLowerCase();
  const patterns = TEST_PATTERNS[language] || [];
  const foundPatterns = patterns.filter(pattern =>
    codeText.includes(pattern.toLowerCase())
  );

  if (foundPatterns.length > 0) {
    score += foundPatterns.length * 10;
    indicators.push(`contains test patterns (${foundPatterns.slice(0, 2).join(', ')})`);
  }

  // Check CST for test-specific nodes
  function countTestNodes(node: CSTNode): number {
    let count = 0;
    const type = node.type;
    // Use full text - NO TRUNCATION
    const text = node.text.toLowerCase();

    // Test function declarations
    if (type.includes('function') && (text.includes('test') || text.includes('describe') || text.includes('it('))) {
      count++;
    }

    // Assertion calls
    if (type.includes('call') && (text.includes('assert') || text.includes('expect') || text.includes('should'))) {
      count++;
    }

    node.children.forEach(child => {
      count += countTestNodes(child);
    });

    return count;
  }

  const testNodeCount = countTestNodes(cst);
  if (testNodeCount > 2) {
    score += Math.min(testNodeCount * 5, 30);
    indicators.push(`${testNodeCount} test assertions/functions`);
  }

  const confidence = Math.min(score / 100, 1.0);
  return { isTest: score > 40, confidence, indicators };
}

function detectTestType(cst: CSTNode, language: SupportedLanguage): 'unit' | 'integration' | 'e2e' | 'unknown' {
  const codeText = cst.text.toLowerCase();

  // E2E test indicators
  const e2eIndicators = [
    'browser', 'puppeteer', 'playwright', 'selenium', 'cypress',
    'page.goto', 'page.click', 'browser.newpage',
    'webdriver', 'chromedriver'
  ];

  if (e2eIndicators.some(ind => codeText.includes(ind))) {
    return 'e2e';
  }

  // Integration test indicators
  const integrationIndicators = [
    'database', 'api', 'http', 'request', 'fetch',
    'integration', 'db.connect', 'client.',
    'testcontainers', 'docker'
  ];

  // Count integration indicators
  const integrationCount = integrationIndicators.filter(ind => codeText.includes(ind)).length;

  // Unit test indicators (mock/stub usage)
  const unitIndicators = [
    'mock', 'stub', 'spy', 'jest.fn', 'sinon',
    'unittest.mock', '@patch', 'mockito'
  ];

  const unitCount = unitIndicators.filter(ind => codeText.includes(ind)).length;

  // Integration tests use real dependencies
  if (integrationCount >= 2 && unitCount === 0) {
    return 'integration';
  }

  // Unit tests mock dependencies
  if (unitCount >= 1) {
    return 'unit';
  }

  // If neither, check for isolated function tests
  const hasSimpleAssertions = (codeText.match(/assert|expect/g) || []).length;
  const hasComplexSetup = codeText.includes('beforeall') || codeText.includes('setupclass');

  if (hasSimpleAssertions > 0 && !hasComplexSetup) {
    return 'unit';
  }

  return 'unknown';
}


export function detectExecutionIntent(
  cst: CSTNode,
  language: SupportedLanguage,
  codeType: CodeType,
  entryPoints: string[]
): ExecutionIntent {
  const indicators: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  // Explicit entry points boost score significantly
  if (entryPoints.length > 0) {
    score += 40;
    indicators.push(`has ${entryPoints[0]}`);
  }

  // Top-level executable statements
  const codeText = cst.text.toLowerCase();
  const hasTopLevelCode =
    !codeText.match(/^\s*(import|export|class|interface|type|function\s+\w+)/m) ||
    codeText.includes('console.log') ||
    codeText.includes('print(');

  if (hasTopLevelCode) {
    score += 20;
    indicators.push('top-level statements');
  }

  // Library/module indicators are blockers
  if (codeType === 'library') {
    score -= 30;
    blockers.push('library structure');
  }

  // Configuration files are not runnable as scripts
  if (codeType === 'configuration') {
    score -= 40;
    blockers.push('configuration file');
  }

  // Heavy exports without entry point
  const exportCount = (codeText.match(/\bexport\b/g) || []).length;
  if (exportCount > 3 && entryPoints.length === 0) {
    score -= 20;
    blockers.push('module exports without main');
  }

  // Type-only files
  if (language === 'typescript' &&
    codeText.match(/^\s*(interface|type)\s/m) &&
    !codeText.includes('function') &&
    !codeText.includes('const')) {
    score -= 40;
    blockers.push('type definitions only');
  }

  // Script or application types are likely runnable
  if (codeType === 'script' || codeType === 'application') {
    score += 25;
    indicators.push(`${codeType} structure`);
  }

  // Test files can be run via test runners
  if (codeType === 'test') {
    score += 15;
    indicators.push('executable via test runner');
  }

  const confidence = Math.max(0, Math.min(1, (score + 50) / 100));

  let entryPointType: ExecutionIntent['entryPointType'] = 'none';
  if (entryPoints.length > 0) entryPointType = 'explicit-main';
  else if (hasTopLevelCode) entryPointType = 'top-level';
  else if (exportCount > 0) entryPointType = 'module-export';

  return {
    isRunnable: score > 20,
    confidence: Math.round(confidence * 100) / 100,
    entryPointType,
    runnabilityIndicators: indicators,
    blockers,
  };
}
function handleMixedTypes(results: Array<{ type: CodeType, confidence: number }>): CodeType {
  // Common mixed patterns

  // Test fixtures (test + library)
  const hasTest = results.some(r => r.type === 'test' && r.confidence > 0.4);
  const hasLibrary = results.some(r => r.type === 'library' && r.confidence > 0.4);

  if (hasTest && hasLibrary) {
    // If test confidence is higher, it's a test file with helpers
    const testConf = results.find(r => r.type === 'test')!.confidence;
    const libConf = results.find(r => r.type === 'library')!.confidence;

    return testConf > libConf ? 'test' : 'library';
  }

  // CLI tools (script + library)
  const hasScript = results.some(r => r.type === 'script' && r.confidence > 0.4);

  if (hasScript && hasLibrary) {
    // CLI tools are scripts with library exports
    return 'script';
  }

  // Build scripts (script + configuration)
  const hasConfig = results.some(r => r.type === 'configuration' && r.confidence > 0.4);

  if (hasScript && hasConfig) {
    return 'script'; // Executable configuration
  }

  // Default: return highest confidence
  return results[0].type;
}

function analyzeExecutionContext(
  cst: CSTNode,
  language: SupportedLanguage,
  entryPoints: string[],
  libraries: LibraryAnalysisResult
): ExecutionContext {
  const codeText = cst.text.toLowerCase();
  const requiresRuntime: string[] = [];
  const environmentDependencies: string[] = [];
  let buildRequired = false;

  // Detect runtime requirements
  if (language === 'typescript') {
    // Browser APIs
    if (codeText.includes('window') || codeText.includes('document') ||
      codeText.includes('localstorage')) {
      requiresRuntime.push('browser');
    }

    // Node.js APIs
    if (codeText.includes('process.') || codeText.includes('__dirname') ||
      libraries.libraries.some(l => l.name === 'fs' || l.name === 'path')) {
      requiresRuntime.push('node');
    }

    // Deno
    if (codeText.includes('deno.')) {
      requiresRuntime.push('deno');
    }

    // TypeScript needs build step
    buildRequired = true;
  }

  if (language === 'python') {
    // Python 3 runtime
    requiresRuntime.push('python3');

    // Virtual environment check
    if (libraries.libraries.some(l => !l.isStandardLib)) {
      environmentDependencies.push('virtual environment with dependencies');
    }
  }

  if (language === 'go') {
    requiresRuntime.push('go');
    buildRequired = codeText.includes('package main');
  }

  if (language === 'rust') {
    requiresRuntime.push('rustc/cargo');
    buildRequired = true;
  }

  if (language === 'java') {
    requiresRuntime.push('jvm');
    buildRequired = true;
  }

  // Detect environment dependencies
  if (codeText.includes('process.env') || codeText.includes('os.getenv') ||
    codeText.includes('os.environ')) {
    environmentDependencies.push('environment variables');
  }

  // Config files
  if (codeText.includes('config') || codeText.includes('.env')) {
    environmentDependencies.push('configuration files');
  }

  // Calculate standalone runnability
  const canRunStandalone = entryPoints.length > 0 &&
    requiresRuntime.length > 0 &&
    !environmentDependencies.includes('configuration files');

  // Score: higher if fewer dependencies
  let score = 0.5;
  if (canRunStandalone) score += 0.3;
  if (environmentDependencies.length === 0) score += 0.1;
  if (!buildRequired) score += 0.1;

  return {
    canRunStandalone,
    requiresRuntime,
    environmentDependencies,
    buildRequired,
    runnabilityScore: Math.min(1, score)
  };
}

/**
 * Detect entry points in code
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function detectEntryPoints(
  cst: CSTNode,
  language: SupportedLanguage
): string[] {
  const entryPoints: string[] = [];
  // Use full text - NO TRUNCATION
  const codeText = cst.text;
  const patterns = ENTRY_POINTS[language] || [];

  for (const pattern of patterns) {
    if (codeText.includes(pattern)) {
      entryPoints.push(pattern);
    }
  }

  // Check CST for main functions
  function findMainFunction(node: CSTNode) {
    // Use full text - NO TRUNCATION
    if (node.type.includes('function') && node.text.toLowerCase().includes('main')) {
      entryPoints.push('main function');
    }
    node.children.forEach(findMainFunction);
  }

  findMainFunction(cst);

  return [...new Set(entryPoints)];
}

/**
 * Count exports in code
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function countExports(
  cst: CSTNode,
  language: SupportedLanguage
): { count: number; exports: string[] } {
  let count = 0;
  const exports: string[] = [];
  const patterns = EXPORT_PATTERNS[language] || [];

  // Check text for export patterns - now with full text
  const codeText = cst.text;
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'g');
    const matches = codeText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  // Check CST for export nodes
  function findExports(node: CSTNode) {
    const type = node.type;
    // Use full text - NO TRUNCATION
    const text = node.text;

    if (type.includes('export') ||
      (language === 'python' && (type === 'function_definition' || type === 'class_definition'))) {
      count++;

      // Extract export name - now with full text access
      const nameMatch = text.match(/(?:export\s+(?:default\s+)?(?:function|class|const|let|var)\s+)?(\w+)/);
      if (nameMatch && nameMatch[1]) {
        exports.push(nameMatch[1]);
      }
    }

    node.children.forEach(findExports);
  }

  findExports(cst);

  return { count, exports: [...new Set(exports)].slice(0, 5) };
}

/**
 * Detect if code is a script
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function detectScript(
  entryPoints: string[],
  exportCount: number,
  cst: CSTNode
): { isScript: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Has entry point
  if (entryPoints.length > 0) {
    score += 40;
    indicators.push(`has entry point (${entryPoints[0]})`);
  }

  // Few or no exports
  if (exportCount === 0) {
    score += 20;
    indicators.push('no exports');
  } else if (exportCount <= 2) {
    score += 10;
    indicators.push('minimal exports');
  }

  // Simple structure (not many classes/modules)
  // Use full text - NO TRUNCATION
  const lineCount = cst.text.split('\n').length;
  if (lineCount < 100) {
    score += 15;
    indicators.push('simple structure');
  }

  const confidence = Math.min(score / 100, 1.0);
  return { isScript: score > 50, confidence, indicators };
}

/**
 * Detect if code is a library
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function detectLibrary(
  entryPoints: string[],
  exportCount: number,
  cst: CSTNode
): { isLibrary: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Many exports
  if (exportCount >= 5) {
    score += 40;
    indicators.push(`${exportCount} exports`);
  } else if (exportCount >= 2) {
    score += 25;
    indicators.push(`${exportCount} exports`);
  }

  // No entry point
  if (entryPoints.length === 0) {
    score += 30;
    indicators.push('no main entry point');
  }

  // Modular structure (multiple classes/functions)
  function countDefinitions(node: CSTNode): number {
    let count = 0;
    if (node.type.includes('function') || node.type.includes('class')) {
      count++;
    }
    node.children.forEach(child => {
      count += countDefinitions(child);
    });
    return count;
  }

  const defCount = countDefinitions(cst);
  if (defCount >= 3) {
    score += 20;
    indicators.push(`${defCount} definitions`);
  }

  const confidence = Math.min(score / 100, 1.0);
  return { isLibrary: score > 50, confidence, indicators };
}

/**
 * Detect if code is an application
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function detectApplication(
  entryPoints: string[],
  exportCount: number,
  libraries: LibraryAnalysisResult,
  cst: CSTNode
): { isApplication: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Has entry point
  if (entryPoints.length > 0) {
    score += 30;
    indicators.push('has main entry');
  }

  // Uses frameworks
  if (libraries.frameworks.length > 0) {
    score += 25;
    indicators.push(`uses ${libraries.frameworks[0].name}`);
  }

  // Has initialization/setup code - now with full text access
  const codeText = cst.text.toLowerCase();
  if (codeText.includes('init') || codeText.includes('setup') || codeText.includes('config')) {
    score += 15;
    indicators.push('has initialization');
  }

  // Multiple imports
  if (libraries.libraries.length >= 5) {
    score += 20;
    indicators.push(`${libraries.libraries.length} dependencies`);
  }

  // Complex structure - now with full text access
  const lineCount = cst.text.split('\n').length;
  if (lineCount > 100) {
    score += 15;
    indicators.push('complex structure');
  }

  const confidence = Math.min(score / 100, 1.0);
  return { isApplication: score > 55, confidence, indicators };
}

/**
 * Detect code type from CST
 * UPDATED: Now uses CSTNode instead of ASTNode for lossless analysis
 */
export function detectCodeType(
  cst: CSTNode,
  language: SupportedLanguage,
  libraries: LibraryAnalysisResult
): CodeTypeResult {
  // Detect test
  const testResult = detectTest(cst, language, libraries);
  if (testResult.isTest && testResult.confidence > 0.6) {
    const testType = detectTestType(cst, language);

    return {
      type: 'test',
      confidence: testResult.confidence,
      indicators: testResult.indicators,
      testType,
    };
  }

  // Detect entry points and exports
  const entryPoints = detectEntryPoints(cst, language);
  const { count: exportCount, exports } = countExports(cst, language);

  // Detect all types with scores
  const scriptResult = detectScript(entryPoints, exportCount, cst);
  const libraryResult = detectLibrary(entryPoints, exportCount, cst);
  const applicationResult = detectApplication(entryPoints, exportCount, libraries, cst);
  const configResult = detectConfiguration(cst, language);

  // Collect all results
  const results = [
    { type: 'script' as CodeType, ...scriptResult },
    { type: 'library' as CodeType, ...libraryResult },
    { type: 'application' as CodeType, ...applicationResult },
    { type: 'configuration' as CodeType, ...configResult },
  ].sort((a, b) => b.confidence - a.confidence);

  const best = results[0];
  const secondBest = results[1];

  // Determine if there's a significant secondary type
  let secondary: CodeTypeResult['secondary'] | undefined;
  if (secondBest.confidence >= 0.4 && secondBest.confidence >= best.confidence * 0.6) {
    secondary = {
      type: secondBest.type,
      confidence: secondBest.confidence
    };
  }

  // Execution analysis
  const executionIntent = detectExecutionIntent(cst, language, best.type, entryPoints);
  const executionContext = analyzeExecutionContext(cst, language, entryPoints, libraries);

  return {
    type: best.confidence > 0.5 ? best.type : 'unknown',
    confidence: best.confidence,
    indicators: best.indicators.slice(0, 3),
    secondary,
    entryPoints: entryPoints.length > 0 ? entryPoints : undefined,
    exports: exports.length > 0 ? exports : undefined,
    executionIntent,
    executionContext,
  };
}
function detectConfiguration(
  cst: CSTNode,
  language: SupportedLanguage
): { isConfiguration: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;
  const codeText = cst.text.toLowerCase();

  // Configuration keywords
  const configKeywords = [
    'config', 'settings', 'options', 'preferences',
    'webpack', 'vite', 'rollup', 'babel', 'tsconfig',
    'eslint', 'prettier', 'jest.config'
  ];

  for (const keyword of configKeywords) {
    if (codeText.includes(keyword)) {
      score += 20;
      indicators.push(`contains '${keyword}'`);
      break; // Only count once
    }
  }

  // Export patterns (config files usually export config objects)
  if (codeText.includes('export default {') || codeText.includes('module.exports = {')) {
    score += 15;
    indicators.push('exports configuration object');
  }

  // Large object literals
  const objectLiteralCount = (codeText.match(/\{[^}]{50,}\}/g) || []).length;
  if (objectLiteralCount >= 2) {
    score += 10;
    indicators.push('contains configuration objects');
  }

  // Few functions (config files are mostly data)
  const functionCount = (codeText.match(/function|=>|\bdef\b/g) || []).length;
  if (functionCount <= 2) {
    score += 10;
    indicators.push('minimal logic');
  }

  // TypeScript/JavaScript config file patterns
  if (language === 'typescript') {
    if (codeText.includes('defineconfig') || codeText.includes('configure')) {
      score += 15;
      indicators.push('configuration helper function');
    }
  }

  const confidence = Math.min(score / 100, 1.0);
  return {
    isConfiguration: score > 40,
    confidence,
    indicators: indicators.slice(0, 3)
  };
}
