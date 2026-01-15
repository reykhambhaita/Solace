// lib/translation/validator.ts

import type { ReviewIR } from '../analyzer/context-detector';
import { analyzeCodeContext } from '../analyzer/context-detector';
import type { CSTNode } from '../analyzer/semantic-ir';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  critical: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  comparisonReport: ComparisonReport;
}

export interface ValidationIssue {
  type: 'critical' | 'warning' | 'info';
  category: 'structure' | 'behavior' | 'quality' | 'elements';
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface ComparisonReport {
  structure: {
    functions: { expected: number; actual: number; match: boolean };
    classes: { expected: number; actual: number; match: boolean };
    linesOfCode: { expected: number; actual: number; acceptable: boolean };
  };
  behavior: {
    determinism: { expected: boolean; actual: boolean; match: boolean };
    executionModel: { expected: string; actual: string; acceptable: boolean };
    sideEffects: { expected: string; actual: string; match: boolean };
  };
  quality: {
    testability: { expected: number; actual: number; delta: number };
    complexity: { expected: number; actual: number; delta: number };
  };
  elements: {
    decisionPoints: { expected: number; actual: number; acceptable: boolean };
    magicValues: { expected: number; actual: number; preserved: number };
  };
}

/**
 * Validate translation by comparing source and target ReviewIRs
 */
export async function validateTranslation(
  sourceCode: string,
  translatedCode: string,
  sourceIR: ReviewIR,
  targetLanguage: string,
  targetCST?: CSTNode
): Promise<ValidationResult> {
  const critical: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  // Analyze translated code to get its ReviewIR
  let translatedContext;

  if (targetCST) {
    // Use provided CST
    translatedContext = analyzeCodeContext(translatedCode, targetCST);
  } else {
    // Parse the translated code (requires tree-sitter in backend)
    translatedContext = analyzeCodeContext(translatedCode);
  }

  if (!translatedContext || !translatedContext.reviewIR) {
    critical.push({
      type: 'critical',
      category: 'structure',
      message: 'Failed to analyze translated code',
    });

    return {
      isValid: false,
      score: 0,
      critical,
      warnings,
      info,
      comparisonReport: createEmptyReport(),
    };
  }

  const translatedIR = translatedContext.reviewIR;

  // === CRITICAL VALIDATIONS (must match) ===

  // 1. Determinism
  const determinismMatch = sourceIR.behavior.isDeterministic === translatedIR.behavior.isDeterministic;
  if (!determinismMatch) {
    critical.push({
      type: 'critical',
      category: 'behavior',
      message: 'Determinism not preserved',
      expected: String(sourceIR.behavior.isDeterministic),
      actual: String(translatedIR.behavior.isDeterministic),
    });
  }

  // 2. Function count (exact match)
  const functionCountMatch = sourceIR.structure.functions === translatedIR.structure.functions;
  if (!functionCountMatch) {
    critical.push({
      type: 'critical',
      category: 'structure',
      message: 'Function count mismatch',
      expected: sourceIR.structure.functions,
      actual: translatedIR.structure.functions,
    });
  }

  // 3. Class count (exact match)
  const classCountMatch = sourceIR.structure.classes === translatedIR.structure.classes;
  if (!classCountMatch) {
    critical.push({
      type: 'critical',
      category: 'structure',
      message: 'Class count mismatch',
      expected: sourceIR.structure.classes,
      actual: translatedIR.structure.classes,
    });
  }

  // 4. Decision points (±1 acceptable)
  const decisionPointDelta = Math.abs(
    sourceIR.elements.decisionRules.length - translatedIR.elements.decisionRules.length
  );
  const decisionPointsAcceptable = decisionPointDelta <= 1;
  if (!decisionPointsAcceptable) {
    critical.push({
      type: 'critical',
      category: 'elements',
      message: 'Decision points significantly changed',
      expected: sourceIR.elements.decisionRules.length,
      actual: translatedIR.elements.decisionRules.length,
    });
  }

  // === IMPORTANT VALIDATIONS (warnings if not matched) ===

  // 5. Execution model (acceptable degradations)
  const executionModelAcceptable = isExecutionModelAcceptable(
    sourceIR.behavior.executionModel,
    translatedIR.behavior.executionModel
  );
  if (!executionModelAcceptable) {
    warnings.push({
      type: 'warning',
      category: 'behavior',
      message: 'Execution model changed',
      expected: sourceIR.behavior.executionModel,
      actual: translatedIR.behavior.executionModel,
    });
  }

  // 6. State lifetime
  const stateLifetimeMatch = sourceIR.state.lifetime === translatedIR.state.lifetime;
  if (!stateLifetimeMatch) {
    warnings.push({
      type: 'warning',
      category: 'behavior',
      message: 'State lifetime changed',
      expected: sourceIR.state.lifetime,
      actual: translatedIR.state.lifetime,
    });
  }

  // 7. Complexity (±2 acceptable)
  const complexityDelta = Math.abs(
    sourceIR.quality.controlFlowComplexity - translatedIR.quality.controlFlowComplexity
  );
  const complexityAcceptable = complexityDelta <= 2;
  if (!complexityAcceptable) {
    warnings.push({
      type: 'warning',
      category: 'quality',
      message: 'Control flow complexity changed significantly',
      expected: sourceIR.quality.controlFlowComplexity,
      actual: translatedIR.quality.controlFlowComplexity,
    });
  }

  // 8. Magic values preservation
  const magicValuesPreserved = countPreservedMagicValues(
    sourceIR.elements.magicValues,
    translatedIR.elements.magicValues
  );
  if (magicValuesPreserved < sourceIR.elements.magicValues.length * 0.8) {
    warnings.push({
      type: 'warning',
      category: 'elements',
      message: 'Some magic values not preserved',
      expected: sourceIR.elements.magicValues.length,
      actual: magicValuesPreserved,
    });
  }

  // === INFORMATIONAL VALIDATIONS ===

  // 9. Lines of code (expected to vary)
  const locDelta = Math.abs(sourceIR.structure.linesOfCode - translatedIR.structure.linesOfCode);
  const locAcceptable = locDelta < sourceIR.structure.linesOfCode * 0.5; // 50% variance OK
  if (!locAcceptable) {
    info.push({
      type: 'info',
      category: 'structure',
      message: 'Code length changed significantly',
      expected: sourceIR.structure.linesOfCode,
      actual: translatedIR.structure.linesOfCode,
    });
  }

  // 10. Testability
  const testabilityDelta = Math.abs(
    sourceIR.quality.testability - translatedIR.quality.testability
  );
  if (testabilityDelta > 20) {
    info.push({
      type: 'info',
      category: 'quality',
      message: 'Testability score changed',
      expected: sourceIR.quality.testability,
      actual: translatedIR.quality.testability,
    });
  }

  // Calculate overall score
  const criticalWeight = 0.6;
  const warningWeight = 0.3;
  const infoWeight = 0.1;

  const criticalScore = critical.length === 0 ? 1.0 : 0.0;
  const warningScore = Math.max(0, 1.0 - warnings.length * 0.15);
  const infoScore = Math.max(0, 1.0 - info.length * 0.1);

  const score = criticalScore * criticalWeight + warningScore * warningWeight + infoScore * infoWeight;

  // Build comparison report
  const comparisonReport: ComparisonReport = {
    structure: {
      functions: {
        expected: sourceIR.structure.functions,
        actual: translatedIR.structure.functions,
        match: functionCountMatch,
      },
      classes: {
        expected: sourceIR.structure.classes,
        actual: translatedIR.structure.classes,
        match: classCountMatch,
      },
      linesOfCode: {
        expected: sourceIR.structure.linesOfCode,
        actual: translatedIR.structure.linesOfCode,
        acceptable: locAcceptable,
      },
    },
    behavior: {
      determinism: {
        expected: sourceIR.behavior.isDeterministic,
        actual: translatedIR.behavior.isDeterministic,
        match: determinismMatch,
      },
      executionModel: {
        expected: sourceIR.behavior.executionModel,
        actual: translatedIR.behavior.executionModel,
        acceptable: executionModelAcceptable,
      },
      sideEffects: {
        expected: sourceIR.behavior.sideEffects,
        actual: translatedIR.behavior.sideEffects,
        match: sourceIR.behavior.sideEffects === translatedIR.behavior.sideEffects,
      },
    },
    quality: {
      testability: {
        expected: sourceIR.quality.testability,
        actual: translatedIR.quality.testability,
        delta: testabilityDelta,
      },
      complexity: {
        expected: sourceIR.quality.controlFlowComplexity,
        actual: translatedIR.quality.controlFlowComplexity,
        delta: complexityDelta,
      },
    },
    elements: {
      decisionPoints: {
        expected: sourceIR.elements.decisionRules.length,
        actual: translatedIR.elements.decisionRules.length,
        acceptable: decisionPointsAcceptable,
      },
      magicValues: {
        expected: sourceIR.elements.magicValues.length,
        actual: translatedIR.elements.magicValues.length,
        preserved: magicValuesPreserved,
      },
    },
  };

  return {
    isValid: critical.length === 0 && score >= 0.7,
    score,
    critical,
    warnings,
    info,
    comparisonReport,
  };
}

function isExecutionModelAcceptable(source: string, target: string): boolean {
  // Acceptable degradations
  const acceptable: Record<string, string[]> = {
    asynchronous: ['asynchronous', 'synchronous', 'mixed'],
    synchronous: ['synchronous', 'mixed'],
    'event-driven': ['event-driven', 'asynchronous', 'mixed'],
    concurrent: ['concurrent', 'asynchronous', 'mixed'],
    mixed: ['mixed'],
  };

  return acceptable[source]?.includes(target) ?? false;
}

function countPreservedMagicValues(
  source: Array<{ value: string | number; role?: string }>,
  target: Array<{ value: string | number; role?: string }>
): number {
  const targetValues = new Set(target.map((v) => String(v.value)));
  return source.filter((v) => targetValues.has(String(v.value))).length;
}

function createEmptyReport(): ComparisonReport {
  return {
    structure: {
      functions: { expected: 0, actual: 0, match: false },
      classes: { expected: 0, actual: 0, match: false },
      linesOfCode: { expected: 0, actual: 0, acceptable: false },
    },
    behavior: {
      determinism: { expected: false, actual: false, match: false },
      executionModel: { expected: '', actual: '', acceptable: false },
      sideEffects: { expected: '', actual: '', match: false },
    },
    quality: {
      testability: { expected: 0, actual: 0, delta: 0 },
      complexity: { expected: 0, actual: 0, delta: 0 },
    },
    elements: {
      decisionPoints: { expected: 0, actual: 0, acceptable: false },
      magicValues: { expected: 0, actual: 0, preserved: 0 },
    },
  };
}