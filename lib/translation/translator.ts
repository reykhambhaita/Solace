// lib/translation/translator.ts

import type { ReviewIR } from '../analyzer/context-detector';
import type { SupportedLanguage } from '../analyzer/language-detector';
import { PythonAdapter } from './adapters/python';
import { TypeScriptAdapter } from './adapters/typescript';
import { CrossLanguageMap } from './cross-language-map';
import type { LanguageAdapter } from './types';

const ADAPTERS: Record<string, LanguageAdapter> = {
  typescript: TypeScriptAdapter,
  python: PythonAdapter,
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

  const systemPrompt = `You are a code translator specializing in ${sourceLanguage} to ${targetLanguage} conversion.

CRITICAL CONSTRAINTS (from ReviewIR):
- MUST preserve determinism: ${reviewIR.behavior.isDeterministic ? 'Code is deterministic' : 'Code has non-deterministic elements'}
- MUST maintain execution model: ${reviewIR.behavior.executionModel}
- MUST preserve state lifetime: ${reviewIR.state.lifetime}
- MUST maintain function count: ${reviewIR.structure.functions} functions
- MUST preserve decision points: approximately ${reviewIR.elements.decisionRules.length} decision points
- MUST maintain complexity: control flow complexity ${reviewIR.quality.controlFlowComplexity}

TARGET LANGUAGE SYNTAX (${targetLanguage}):

Function Declaration:
${targetAdapter.syntax.declarations.function}

Control Flow:
- If statement: ${targetAdapter.syntax.controlFlow.if}
- For loop: ${targetAdapter.syntax.controlFlow.for}
${targetAdapter.syntax.controlFlow.while ? `- While loop: ${targetAdapter.syntax.controlFlow.while}` : ''}

Error Handling:
${targetAdapter.syntax.errorHandling?.throw ? `- Throw: ${targetAdapter.syntax.errorHandling.throw}` : ''}
${targetAdapter.syntax.errorHandling?.catch ? `- Catch: ${targetAdapter.syntax.errorHandling.catch}` : ''}

Type Mappings:
${Object.entries(targetAdapter.types.primitives)
      .map(([k, v]) => `- ${k} → ${v}`)
      .join('\n')}

Standard Library:
${Object.entries(targetAdapter.stdlib.commonFunctions)
      .slice(0, 10)
      .map(([k, v]) => `- ${k} → ${v.name}${v.notes ? ` (${v.notes})` : ''}`)
      .join('\n')}

Naming Conventions:
- Variables: ${targetAdapter.naming.variables}
- Functions: ${targetAdapter.naming.functions}
${targetAdapter.naming.classes ? `- Classes: ${targetAdapter.naming.classes}` : ''}
${targetAdapter.naming.constants ? `- Constants: ${targetAdapter.naming.constants}` : ''}

PATTERN EQUIVALENTS:
${relevantPatterns}

SEMANTIC GUIDANCE:
${semanticGuidance}

OUTPUT REQUIREMENTS:
1. Generate valid ${targetLanguage} code ONLY - no explanations outside comments
2. Preserve all logic and behavior from the source
3. Use idiomatic ${targetLanguage} patterns where appropriate
4. Add brief comments explaining non-obvious translations
5. Maintain the same structure and flow where possible`;

  const userPrompt = `Translate this ${sourceLanguage} code to ${targetLanguage}:

\`\`\`${sourceLanguage}
${sourceCode}
\`\`\`

Remember:
- Preserve ${reviewIR.structure.functions} function(s)
- Maintain determinism: ${reviewIR.behavior.isDeterministic}
- Keep execution model: ${reviewIR.behavior.executionModel}
- Preserve complexity level

Output ONLY the translated ${targetLanguage} code.`;

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
    if (asyncPattern) {
      patterns.push(`Async/Await: ${asyncPattern.to[sourceLanguage]} → ${asyncPattern.to[targetLanguage]}`);
      if (asyncPattern.notes) patterns.push(`  Note: ${asyncPattern.notes}`);
    }
  }

  // Check for array operations (if we detect map/filter usage)
  if (reviewIR.intent.primary.includes('transformation')) {
    const mapPattern = CrossLanguageMap.patterns['array-transformation'];
    if (mapPattern) {
      patterns.push(`Array Transform: ${mapPattern.to[sourceLanguage]} → ${mapPattern.to[targetLanguage]}`);
      if (mapPattern.notes) patterns.push(`  Note: ${mapPattern.notes}`);
    }
  }

  // Error handling
  const errorPattern = CrossLanguageMap.patterns['error-handling'];
  if (errorPattern) {
    patterns.push(`Error Handling: ${errorPattern.to[sourceLanguage]} → ${errorPattern.to[targetLanguage]}`);
  }

  // Null checking
  const nullPattern = CrossLanguageMap.patterns['null-checking'];
  if (nullPattern) {
    patterns.push(`Null Check: ${nullPattern.to[sourceLanguage]} → ${nullPattern.to[targetLanguage]}`);
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
      max_tokens: 3000,
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
    confidence: 0.85, // We'll implement validation later
    warnings: extractWarnings(request.sourceLanguage, request.targetLanguage),
    explanations: [`Translated from ${request.sourceLanguage} to ${request.targetLanguage}`],
  };
}

function extractWarnings(sourceLanguage: string, targetLanguage: string): string[] {
  return CrossLanguageMap.translationWarnings
    .filter((w) => w.from === sourceLanguage && w.to === targetLanguage)
    .map((w) => w.warning)
    .slice(0, 3);
}