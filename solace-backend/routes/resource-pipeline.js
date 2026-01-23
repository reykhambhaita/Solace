/**
 * ARCHITECTURAL FIX: Deterministic anchor extraction
 * Guarantees concrete query seeds from code context
 */
const { extractReviewAnchors } = require('./review-anchor-reducer');
function extractAnchors(codeContext, sourceCode, reviewResponse) {
  const anchors = {
    mandatory: [],
    optional: [],
    metadata: {}
  };

  const language = codeContext.language.language;
  const reviewIR = codeContext.reviewIR;

  // STEP 1: Extract review-specific anchors (CONCRETE SYMBOLS)
  const reviewAnchors = extractReviewAnchors(reviewIR, codeContext, reviewResponse);

  // SHORT-CIRCUIT: If trivial code detected
  if (reviewAnchors.metadata.shortCircuit) {
    console.log('[Anchors] Short-circuit activated:', reviewAnchors.metadata.reason);
    anchors.mandatory = reviewAnchors.concrete.map(a => ({
      type: 'official-docs',
      target: a.context,
      reason: a.source,
      weight: a.weight
    }));

    anchors.metadata = {
      totalAnchors: anchors.mandatory.length,
      mandatoryCount: anchors.mandatory.length,
      shortCircuit: true,
      reviewQuality: reviewAnchors.metadata.reviewQuality
    };

    return anchors;
  }

  // STEP 2: Prioritize concrete symbols over generic docs
  if (reviewAnchors.metadata.hasConcreteSymbols) {
    reviewAnchors.concrete.forEach(anchor => {
      anchors.mandatory.push({
        type: anchor.type.includes('api') ? 'library-docs' : 'conceptual',
        target: anchor.context,
        reason: anchor.source,
        weight: anchor.weight,
        retrievalReady: anchor.retrievalReady
      });
    });
  } else {
    // Fallback to language-level docs only if no concrete symbols
    anchors.mandatory.push({
      type: 'official-docs',
      target: `${language} official documentation`,
      reason: 'language-runtime',
      weight: 1.0
    });
  }

  // STEP 3: Add framework anchors
  codeContext.libraries.frameworks.forEach(fw => {
    anchors.mandatory.push({
      type: 'framework-docs',
      target: `${fw.name} ${language} documentation`,
      reason: `detected-framework:${fw.name}`,
      weight: 0.95
    });
  });

  // STEP 4: Add conceptual anchors (from review) as OPTIONAL
  reviewAnchors.conceptual.forEach(anchor => {
    anchors.optional.push({
      type: 'conceptual',
      target: anchor.context,
      reason: anchor.source,
      weight: anchor.weight
    });
  });

  // Existing optional anchors (error handling, side effects, etc.)
  const execModel = codeContext.paradigm.executionModel;
  if (execModel.primary === 'asynchronous' || execModel.asyncPatterns > 0) {
    anchors.mandatory.push({
      type: 'conceptual',
      target: `${language} asynchronous programming guide`,
      reason: 'async-detected',
      weight: 0.9
    });
  }

  const errorStrategy = codeContext.libraries.errorHandling;
  if (!errorStrategy.hasErrorHandling || errorStrategy.approach === 'silent') {
    anchors.optional.push({
      type: 'troubleshooting',
      target: `${language} error handling best practices`,
      reason: 'error-handling-gap',
      weight: 0.75
    });
  }

  anchors.metadata = {
    totalAnchors: anchors.mandatory.length + anchors.optional.length,
    mandatoryCount: anchors.mandatory.length,
    detectedImports: codeContext.libraries.libraries.filter(l => !l.isStandardLib).length,
    language,
    determinismClass: codeContext.libraries.externalInteractions.determinismReasoning.classification.class,
    hasConcreteSymbols: reviewAnchors.metadata.hasConcreteSymbols,
    reviewQuality: reviewAnchors.metadata.reviewQuality
  };

  console.log('[Anchors] Extracted:', {
    mandatory: anchors.mandatory.length,
    optional: anchors.optional.length,
    concreteSymbols: reviewAnchors.metadata.hasConcreteSymbols,
    reviewQuality: reviewAnchors.metadata.reviewQuality
  });

  return anchors;
}



/**
 * ARCHITECTURAL FIX: Baseline queries (never fails silently)
 * Transforms anchors → guaranteed queries
 */

function buildBaselineQueries(anchors) {
  const queries = [];

  // HARD LIMIT: Disable expansion if insufficient anchors
  if (anchors.mandatory.length === 0) {
    throw new Error('CRITICAL: No mandatory anchors extracted');
  }

  if (anchors.mandatory.length === 1 && !anchors.metadata.hasConcreteSymbols) {
    console.warn('[Baseline] Single generic anchor - expansion disabled');
    anchors.metadata.expansionDisabled = true;
  }

  // Build queries with explicit intent
  anchors.mandatory.forEach(anchor => {
    const intent = classifyIntent(anchor);
    queries.push({
      primary: anchor.target,
      intent: intent.type,
      weight: anchor.weight,
      source: 'baseline',
      reason: anchor.reason,
      contentType: intent.contentType,
      searchEngine: intent.searchEngine // NEW: Explicit routing
    });
  });

  anchors.optional.slice(0, 15 - queries.length).forEach(anchor => {
    const intent = classifyIntent(anchor);
    queries.push({
      primary: anchor.target,
      intent: intent.type,
      weight: anchor.weight,
      source: 'baseline',
      reason: anchor.reason,
      contentType: intent.contentType,
      searchEngine: intent.searchEngine
    });
  });

  console.log('[Baseline] Generated', queries.length, 'guaranteed queries');

  return queries;
}



function classifyIntent(anchor) {
  const intentMap = {
    'official-docs': { type: 'documentation', contentType: 'docs', searchEngine: 'mdn' },
    'framework-docs': { type: 'documentation', contentType: 'docs', searchEngine: 'tavily' },
    'library-docs': { type: 'documentation', contentType: 'docs', searchEngine: 'tavily' },
    'conceptual': { type: 'tutorial', contentType: 'article', searchEngine: 'tavily' },
    'troubleshooting': { type: 'troubleshooting', contentType: 'article', searchEngine: 'stackoverflow' }
  };

  return intentMap[anchor.type] || { type: 'general', contentType: 'article', searchEngine: 'tavily' };
}


/**
 * ARCHITECTURAL FIX: LLM expansion is optional enhancement
 * Cannot fail the pipeline
 */

async function expandQueries(baselineQueries, reviewContext, codeContext, anchors) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // HARD DISABLE: If anchors metadata says expansion is disabled
  if (anchors.metadata.expansionDisabled) {
    console.log('[Expansion] Disabled (insufficient concrete anchors)');
    return baselineQueries;
  }

  if (!GROQ_API_KEY) {
    console.log('[Expansion] Skipped (no API key)');
    return baselineQueries;
  }

  // Only expand if we have concrete symbols
  if (!anchors.metadata.hasConcreteSymbols) {
    console.log('[Expansion] Skipped (no concrete symbols to refine)');
    return baselineQueries;
  }

  try {
    const language = codeContext.language.language;

    // MODIFIED PROMPT: Refine concrete symbols, don't invent
    const systemPrompt = `Generate 2-3 REFINEMENT queries for existing concrete symbols.

STRICT RULES:
- ONLY refine symbols already in baseline queries
- NO new APIs, libraries, or frameworks
- Focus on: tutorials, troubleshooting, comparisons
- Max 3 queries

Baseline symbols: ${baselineQueries.map(q => q.primary).join(', ')}

Return JSON: [{"query": "...", "intent": "...", "weight": 0.6-0.8}]`;

    const userPrompt = `BASELINE QUERIES:
${baselineQueries.map(q => `- ${q.primary}`).join('\n')}

Generate 2-3 refinement queries (tutorials, troubleshooting).`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for less invention
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`Expansion API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const expansions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const expandedQueries = expansions.slice(0, 3).map(exp => ({
      primary: exp.query,
      intent: exp.intent || 'tutorial',
      weight: exp.weight || 0.65,
      source: 'expansion',
      reason: 'llm-refinement',
      contentType: 'article',
      searchEngine: 'tavily'
    }));

    console.log('[Expansion] Added', expandedQueries.length, 'refinement queries');
    return [...baselineQueries, ...expandedQueries];

  } catch (error) {
    console.error('[Expansion] Failed, using baseline only:', error.message);
    return baselineQueries;
  }
}
/**
 * ARCHITECTURAL FIX: Prune before ranking
 * Guarantees ranking payload < 15 resources
 */

function pruneForRanking(resources, maxResources = 15) {
  // Deduplicate by URL
  const uniqueByUrl = Array.from(
    new Map(resources.map(r => [r.url, r])).values()
  );

  // Priority ranking (pre-ranking)
  const prioritized = uniqueByUrl.sort((a, b) => {
    // Official docs > everything
    if (a.type === 'documentation' && b.type !== 'documentation') return -1;
    if (b.type === 'documentation' && a.type !== 'documentation') return 1;

    // Then by raw relevance
    return (b.rawRelevance || 0) - (a.rawRelevance || 0);
  });

  const pruned = prioritized.slice(0, maxResources);

  console.log(`[Pruning] ${resources.length} → ${pruned.length} (pre-ranking)`);

  return pruned;
}

module.exports = { extractAnchors, buildBaselineQueries, expandQueries, pruneForRanking };