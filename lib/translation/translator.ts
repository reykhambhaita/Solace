// lib/translation/translator.ts

import type { ReviewIR } from '../analyzer/context-detector';
import type { SupportedLanguage } from '../analyzer/language-detector';
import { CAdapter } from './adapters/c';
import { CppAdapter } from './adapters/cpp';
import { GoAdapter } from './adapters/go';
import { JavaAdapter } from './adapters/java';
import { JavaScriptAdapter } from './adapters/javascript';
import { PhpAdapter } from './adapters/php';
import { PythonAdapter } from './adapters/python';
import { RubyAdapter } from './adapters/ruby';
import { RustAdapter } from './adapters/rust';
import { TypeScriptAdapter } from './adapters/typescript';
import { CrossLanguageMap } from './cross-language-map';
import type { LanguageAdapter } from './types';

const ADAPTERS: Record<string, LanguageAdapter> = {
  typescript: TypeScriptAdapter,
  python: PythonAdapter,
  go: GoAdapter,
  rust: RustAdapter,
  java: JavaAdapter,
  cpp: CppAdapter,
  c: CAdapter,
  ruby: RubyAdapter,
  php: PhpAdapter,
  javascript: JavaScriptAdapter,
};

interface TranslationRequest {
  sourceCode: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  reviewIR: ReviewIR;
}

interface TranslationResult {
  translatedCode: string;
  confidence: number;
  warnings: string[];
  explanations: string[];
}

/**
 * Build the LLM prompt for code translation
 */
function buildTranslationPrompt(request: TranslationRequest): {
  system: string;
  user: string;
} {
  const { sourceLanguage, targetLanguage, reviewIR, sourceCode } = request;

  const sourceAdapter = ADAPTERS[sourceLanguage];
  const targetAdapter = ADAPTERS[targetLanguage];

  if (!sourceAdapter || !targetAdapter) {
    throw new Error(`Unsupported language pair: ${sourceLanguage} → ${targetLanguage}`);
  }

  // Extract relevant pattern mappings
  const relevantPatterns = extractRelevantPatterns(reviewIR, sourceLanguage, targetLanguage);

  // Extract semantic guidance
  const semanticGuidance = extractSemanticGuidance(sourceLanguage, targetLanguage);

  // Get language-specific rules
  const targetRules = targetAdapter.specialRules
    ?.map((r, i) => `${i + 1}. ${r.rule}${r.example ? `\n   Example: ${r.example}` : ''}`)
    .join('\n') || 'No special rules';

  const systemPrompt = `You are an expert code translator specializing in ${sourceLanguage} to ${targetLanguage} conversion.

CRITICAL CONSTRAINTS (from ReviewIR):
- MUST preserve determinism: ${reviewIR.behavior.isDeterministic ? 'Code is deterministic' : 'Code has non-deterministic elements'}
- MUST maintain execution model: ${reviewIR.behavior.executionModel}
- MUST preserve state lifetime: ${reviewIR.state.lifetime}
- MUST maintain function count: ${reviewIR.structure.functions} functions
- MUST preserve decision points: approximately ${reviewIR.elements.decisionRules.length} decision points
- MUST maintain complexity: control flow complexity ${reviewIR.quality.controlFlowComplexity}

TARGET LANGUAGE: ${targetLanguage.toUpperCase()}

Language Metadata:
- Paradigm: ${targetAdapter.metadata.paradigm.join(', ')}
- Typing: ${targetAdapter.metadata.typing}
- Execution Model: ${targetAdapter.metadata.executionModel}
- Error Handling: ${targetAdapter.metadata.errorHandling}

SYNTAX REFERENCE:

Function Declaration:
${targetAdapter.syntax.declarations.function}
${targetAdapter.syntax.declarations.lambda ? `Lambda: ${targetAdapter.syntax.declarations.lambda}` : ''}
${targetAdapter.syntax.declarations.class ? `Class: ${targetAdapter.syntax.declarations.class}` : ''}

Control Flow:
- If: ${targetAdapter.syntax.controlFlow.if}
- For: ${targetAdapter.syntax.controlFlow.for}
${targetAdapter.syntax.controlFlow.while ? `- While: ${targetAdapter.syntax.controlFlow.while}` : ''}
${targetAdapter.syntax.controlFlow.switch ? `- Switch: ${targetAdapter.syntax.controlFlow.switch}` : ''}
${targetAdapter.syntax.controlFlow.tryCatch ? `- Try-Catch: ${targetAdapter.syntax.controlFlow.tryCatch}` : ''}

Error Handling:
${targetAdapter.syntax.errorHandling?.throw ? `- Throw: ${targetAdapter.syntax.errorHandling.throw}` : ''}
${targetAdapter.syntax.errorHandling?.catch ? `- Catch: ${targetAdapter.syntax.errorHandling.catch}` : ''}
${targetAdapter.syntax.errorHandling?.returnError ? `- Return Error: ${targetAdapter.syntax.errorHandling.returnError}` : ''}

Type Mappings:
Primitives:
${Object.entries(targetAdapter.types.primitives)
      .map(([k, v]) => `  ${k} → ${v}`)
      .join('\n')}

Collections:
${Object.entries(targetAdapter.types.collections)
      .map(([k, v]) => `  ${k} → ${v}`)
      .join('\n')}

Standard Library Functions:
${Object.entries(targetAdapter.stdlib.commonFunctions)
      .slice(0, 12)
      .map(([k, v]) => `- ${k} → ${v.name}${v.notes ? ` (${v.notes})` : ''}`)
      .join('\n')}

Naming Conventions:
- Variables: ${targetAdapter.naming.variables}
- Functions: ${targetAdapter.naming.functions}
${targetAdapter.naming.classes ? `- Classes: ${targetAdapter.naming.classes}` : ''}
${targetAdapter.naming.constants ? `- Constants: ${targetAdapter.naming.constants}` : ''}

LANGUAGE-SPECIFIC RULES:
${targetRules}

PATTERN EQUIVALENTS:
${relevantPatterns}

SEMANTIC GUIDANCE & WARNINGS:
${semanticGuidance}

OUTPUT REQUIREMENTS:
1. Generate ONLY valid ${targetLanguage} code - no markdown, no explanations
2. Preserve ALL logic and behavior from the source
3. Use idiomatic ${targetLanguage} patterns where appropriate
4. Add brief inline comments for non-obvious translations
5. Maintain the same structure and flow where possible
6. Ensure all ${reviewIR.structure.functions} function(s) are translated
7. Keep approximately ${reviewIR.elements.decisionRules.length} decision point(s)`;

  const userPrompt = `Translate this ${sourceLanguage} code to ${targetLanguage}:

\`\`\`${sourceLanguage}
${sourceCode}
\`\`\`

Code Intent: ${reviewIR.intent.description}
Paradigm: ${reviewIR.structure.paradigm}

Remember:
- Preserve ${reviewIR.structure.functions} function(s)
- Maintain determinism: ${reviewIR.behavior.isDeterministic}
- Keep execution model: ${reviewIR.behavior.executionModel}
- Preserve decision logic
- Match complexity level

Output ONLY the translated ${targetLanguage} code with no markdown formatting.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Extract relevant pattern mappings based on what's detected in the code
 */
function extractRelevantPatterns(
  reviewIR: ReviewIR,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const patterns: string[] = [];

  // Check for async patterns
  if (reviewIR.behavior.executionModel.includes('async')) {
    const asyncPattern = CrossLanguageMap.patterns['async-await'];
    if (asyncPattern && asyncPattern.to[targetLanguage]) {
      patterns.push(`Async/Await: ${asyncPattern.to[sourceLanguage] || 'async operations'} → ${asyncPattern.to[targetLanguage]}`);
      if (asyncPattern.notes) patterns.push(`  Note: ${asyncPattern.notes}`);
    }
  }

  // Check for array operations
  if (reviewIR.intent.primary.includes('transformation') || reviewIR.intent.primary.includes('aggregation')) {
    const mapPattern = CrossLanguageMap.patterns['array-transformation'];
    if (mapPattern && mapPattern.to[targetLanguage]) {
      patterns.push(`Array Transform: ${mapPattern.to[sourceLanguage] || 'transformations'} → ${mapPattern.to[targetLanguage]}`);
    }

    const filterPattern = CrossLanguageMap.patterns['array-filtering'];
    if (filterPattern && filterPattern.to[targetLanguage]) {
      patterns.push(`Array Filter: ${filterPattern.to[sourceLanguage] || 'filtering'} → ${filterPattern.to[targetLanguage]}`);
    }
  }

  // Error handling
  const errorPattern = CrossLanguageMap.patterns['error-handling'];
  if (errorPattern && errorPattern.to[targetLanguage]) {
    patterns.push(`Error Handling: ${errorPattern.to[sourceLanguage] || 'error handling'} → ${errorPattern.to[targetLanguage]}`);
    if (errorPattern.notes) patterns.push(`  Note: ${errorPattern.notes}`);
  }

  // Null checking (if we have many magic values or validation)
  if (reviewIR.intent.primary === 'validation' || reviewIR.elements.magicValues.length > 0) {
    const nullPattern = CrossLanguageMap.patterns['null-checking'];
    if (nullPattern && nullPattern.to[targetLanguage]) {
      patterns.push(`Null Check: ${nullPattern.to[sourceLanguage] || 'null check'} → ${nullPattern.to[targetLanguage]}`);
    }
  }

  // Loops (if we have procedural paradigm)
  if (reviewIR.structure.paradigm.includes('procedural')) {
    const loopPattern = CrossLanguageMap.patterns['for-loop-index'];
    if (loopPattern && loopPattern.to[targetLanguage]) {
      patterns.push(`For Loop: ${loopPattern.to[sourceLanguage] || 'for loop'} → ${loopPattern.to[targetLanguage]}`);
    }
  }

  // String interpolation (common in most code)
  const stringPattern = CrossLanguageMap.patterns['string-interpolation'];
  if (stringPattern && stringPattern.to[targetLanguage]) {
    patterns.push(`String Interpolation: ${stringPattern.to[sourceLanguage] || 'string interpolation'} → ${stringPattern.to[targetLanguage]}`);
  }

  return patterns.join('\n') || 'No special pattern conversions needed';
}

/**
 * Extract semantic guidance for this language pair
 */
function extractSemanticGuidance(sourceLanguage: string, targetLanguage: string): string {
  const warnings = CrossLanguageMap.translationWarnings
    .filter((w) => w.from === sourceLanguage && w.to === targetLanguage)
    .map((w) => `⚠ ${w.warning}\n  → ${w.suggestion}`)
    .slice(0, 5);

  return warnings.join('\n\n') || 'No special warnings for this language pair';
}

/**
 * Main translation function
 */
export async function translateCode(
  request: TranslationRequest
): Promise<TranslationResult> {
  const { system, user } = buildTranslationPrompt(request);

  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 4000,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const translatedCode = data.choices[0]?.message?.content || '';

  // Clean up code blocks if present
  const cleanedCode = translatedCode
    .replace(/```[\w]*\n/g, '')
    .replace(/```$/g, '')
    .trim();

  return {
    translatedCode: cleanedCode,
    confidence: 0.85, // Base confidence, will be refined by validation
    warnings: extractWarnings(request.sourceLanguage, request.targetLanguage),
    explanations: [
      `Translated from ${request.sourceLanguage} to ${request.targetLanguage}`,
      `Preserved ${request.reviewIR.structure.functions} function(s)`,
      `Maintained ${request.reviewIR.behavior.executionModel} execution model`,
    ],
  };
}

function extractWarnings(sourceLanguage: string, targetLanguage: string): string[] {
  return CrossLanguageMap.translationWarnings
    .filter((w) => w.from === sourceLanguage && w.to === targetLanguage)
    .map((w) => w.warning)
    .slice(0, 3);
}