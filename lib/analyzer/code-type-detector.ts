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
  type: CodeType;
  confidence: number;
  indicators: string[];
  entryPoints?: string[];
  exports?: string[];
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
    return {
      type: 'test',
      confidence: testResult.confidence,
      indicators: testResult.indicators,
    };
  }

  // Detect entry points and exports
  const entryPoints = detectEntryPoints(cst, language);
  const { count: exportCount, exports } = countExports(cst, language);

  // Detect script
  const scriptResult = detectScript(entryPoints, exportCount, cst);

  // Detect library
  const libraryResult = detectLibrary(entryPoints, exportCount, cst);

  // Detect application
  const applicationResult = detectApplication(entryPoints, exportCount, libraries, cst);

  // Choose the most confident type
  const results = [
    { type: 'script' as CodeType, ...scriptResult },
    { type: 'library' as CodeType, ...libraryResult },
    { type: 'application' as CodeType, ...applicationResult },
  ].sort((a, b) => b.confidence - a.confidence);

  const best = results[0];

  return {
    type: best.confidence > 0.5 ? best.type : 'unknown',
    confidence: best.confidence,
    indicators: best.indicators.slice(0, 3),
    entryPoints: entryPoints.length > 0 ? entryPoints : undefined,
    exports: exports.length > 0 ? exports : undefined,
  };
}