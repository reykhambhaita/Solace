// routes/resources.js
const express = require('express');
const router = express.Router();

async function buildSearchQueries(reviewResponse, codeContext, sourceCode = '', userIntent = '') {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.warn('GROQ API key not configured, falling back to basic queries');
    return buildFallbackQueries(reviewResponse, codeContext);
  }

  try {
    const language = codeContext.language.language;
    const frameworks = codeContext.libraries.frameworks.map(f => f.name).join(', ') || 'None';
    const libraries = codeContext.libraries.libraries.filter(l => !l.isStandardLib).slice(0, 5).map(l => l.name).join(', ') || 'None';

    const systemPrompt = `You are an expert at generating high-precision search queries for developer learning.
Given a technical review and code context, generate 10-15 HIGHLY SPECIFIC search queries.

CRITICAL RULES:
- Queries must be SPECIFIC to the code's purpose and technical stack.
- Avoid generic terms like "tutorial" or "guide" unless paired with a very specific API or concept.
- Prioritize official documentation, deep-dives into specific APIs, and troubleshooting for the exact patterns used.
- Ensure queries cover: Official Docs, Advanced Patterns, Edge Cases, and Troubleshooting.

IMPORTANT: Output ONLY the raw JSON array. No thinking, no explanations, no markdown code blocks.

Return ONLY a JSON array:
[
  {
    "query": "exact search query string",
    "intent": "documentation|tutorial|conceptual|video|troubleshooting",
    "searchEngine": "mdn|tavily|stackoverflow",
    "weight": 0.7-1.0
  }
]`;

    const userPrompt = `Generate optimized search queries based on this AI review and code context:

TECHNICAL PURPOSE: ${reviewResponse.purpose}
CODE SUMMARY: ${reviewResponse.summary}
LANGUAGE: ${language}
FRAMEWORKS: ${frameworks}
LIBRARIES/IMPORTS: ${libraries}
${userIntent ? `USER INTENT: ${userIntent}` : ''}

CONTEXTUAL DETAILS:
- Behavioral correctness: ${reviewResponse.behavioral}
- Complexity: ${reviewResponse.complexity}

Generate 10-15 diverse, high-precision search queries. Route them to the most appropriate engine (mdn for core JS/TS docs, stackoverflow for troubleshooting, tavily for general web search/tutorials).`;

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
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '[]';

    // Robust cleanup
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/^```json?\s*/i, '').replace(/\n?```\s*$/i, '');

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const queries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const formattedQueries = queries.map(q => ({
      primary: q.query || q.primary,
      weight: q.weight || 0.8,
      intent: q.intent || 'general',
      searchEngine: q.searchEngine || 'tavily',
      source: 'llm-generated'
    }));

    console.log(`[Query Builder] Generated ${formattedQueries.length} queries directly from review`);
    return formattedQueries.length > 0 ? formattedQueries : buildFallbackQueries(reviewResponse, codeContext);

  } catch (error) {
    console.error('Query generation error:', error);
    return buildFallbackQueries(reviewResponse, codeContext);
  }
}

function buildFallbackQueries(reviewResponse, codeContext) {
  const queries = [];
  const language = codeContext.language.language;

  // Extract key terms from purpose if possible (simple split)
  const terms = (reviewResponse.purpose || language).split(' ').slice(0, 5).join(' ');

  queries.push({
    primary: `${language} ${terms} documentation`,
    weight: 1.0,
    intent: 'documentation',
    searchEngine: 'tavily',
    source: 'fallback'
  });

  return queries;
}
/**
 * Fallback query generation when LLM is unavailable
 */

/**
 * Fetch GitHub repositories
 */
async function fetchGitHub(query) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.warn('GitHub token not configured (process.env.GITHUB_TOKEN is missing)');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(repo => ({
      type: 'github',
      title: repo.full_name,
      url: repo.html_url,
      description: repo.description || 'No description available',
      metadata: {
        stars: repo.stargazers_count,
        language: repo.language,
      },
      rawRelevance: 0 // Will be scored by LLM
    }));
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return [];
  }
}


async function fetchTavilyByIntent(queries) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) {
    console.warn('[Tavily] API key not configured');
    return [];
  }

  if (queries.length === 0) return [];

  const MAX_QUERY_LENGTH = 350; // Tavily limit is 400, leave some buffer

  try {
    console.log(`[Tavily] Batching ${queries.length} queries into chunked API calls`);

    // Split queries into batches that fit within character limit
    const batches = [];
    let currentBatch = [];
    let currentLength = 0;

    for (const query of queries) {
      const queryPart = `(${query.primary})`;
      const addedLength = currentBatch.length > 0 ? queryPart.length + 4 : queryPart.length; // +4 for " OR "

      if (currentLength + addedLength > MAX_QUERY_LENGTH && currentBatch.length > 0) {
        // Current batch is full, start a new one
        batches.push(currentBatch);
        currentBatch = [query];
        currentLength = queryPart.length;
      } else {
        currentBatch.push(query);
        currentLength += addedLength;
      }

      // Limit to 2 batches maximum
      if (batches.length >= 2) break;
    }

    // Add remaining batch
    if (currentBatch.length > 0 && batches.length < 2) {
      batches.push(currentBatch);
    }

    console.log(`[Tavily] Split into ${batches.length} batches: ${batches.map(b => b.length).join(', ')} queries each`);

    // Execute batched requests
    const batchPromises = batches.map(async (batch, idx) => {
      // Log individual queries in this batch
      console.log(`[Tavily] Batch ${idx + 1} contains ${batch.length} queries:`);
      batch.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.primary}`);
      });

      const batchedQuery = batch.map(q => `(${q.primary})`).join(' OR ');

      console.log(`[Tavily] Batch ${idx + 1} combined query (${batchedQuery.length} chars): ${batchedQuery.substring(0, 100)}...`);

      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: batchedQuery,
            search_depth: 'basic',
            max_results: 10
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Tavily] Batch ${idx + 1} failed (${response.status}):`, errorText);
          return [];
        }

        const data = await response.json();
        return (data.results || []).map(result => {
          let type = 'article';
          const url = result.url.toLowerCase();

          if (url.includes('youtube.com') || url.includes('vimeo.com')) {
            type = 'video';
          } else if (url.includes('docs.') || url.includes('developer.')) {
            type = 'documentation';
          } else if (url.includes('stackoverflow.com')) {
            type = 'stackoverflow';
          } else if (url.includes('github.com')) {
            type = 'github';
          }

          return {
            type,
            title: result.title,
            url: result.url,
            description: result.content?.substring(0, 200) || '',
            metadata: {
              score: result.score || 0.5,
              source: new URL(result.url).hostname
            },
            rawRelevance: result.score || 0.5
          };
        });
      } catch (err) {
        console.error(`[Tavily] Batch ${idx + 1} error:`, err.message);
        return [];
      }
    });

    const results = (await Promise.all(batchPromises)).flat();
    console.log(`[Tavily] Got ${results.length} results from ${batches.length} batched API calls (${queries.length} total queries)`);
    return results;

  } catch (error) {
    console.error('[Tavily] Batch request error:', error.message);
    return [];
  }
}



/**
 * Fetch MDN documentation
 */
async function fetchMDN(query, language) {
  try {
    console.log(`[MDN] Searching for: ${query}`);

    // MDN search endpoint
    const searchUrl = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Solace-Learning-Platform/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`MDN API error: ${response.status}`);
    }

    const data = await response.json();
    const docs = (data.documents || []);

    // If we have a very specific query that looks like a method or class,
    // try to find an exact title match first
    const exactMatch = docs.find(doc =>
      doc.title.toLowerCase() === query.toLowerCase() ||
      doc.title.toLowerCase().includes(`${query.toLowerCase()}()`)
    );

    const sortedDocs = exactMatch
      ? [exactMatch, ...docs.filter(d => d.mdn_url !== exactMatch.mdn_url)]
      : docs;

    return sortedDocs.slice(0, 3).map(doc => ({
      type: 'documentation',
      title: doc.title,
      url: `https://developer.mozilla.org${doc.mdn_url}`,
      description: doc.summary || 'Official MDN documentation',
      metadata: {
        category: 'mdn-docs',
        popularity: doc.popularity || 0,
        language: language,
        score: doc.score || 0
      },
      rawRelevance: exactMatch && doc.mdn_url === exactMatch.mdn_url ? 0.98 : 0.95
    }));
  } catch (error) {
    console.error('MDN fetch error:', error);
    return [];
  }
}
/**
 * Fetch Stack Overflow questions
 */
async function fetchStackOverflow(query) {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=5&filter=withbody`
    );

    if (!response.ok) {
      throw new Error(`Stack Overflow API error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(item => ({
      type: 'stackoverflow',
      title: item.title,
      url: item.link,
      description: item.body_markdown?.substring(0, 200) || 'No description available',
      metadata: {
        votes: item.score,
        answers: item.answer_count,
        views: item.view_count,
        accepted: item.is_answered
      },
      rawRelevance: 0
    }));
  } catch (error) {
    console.error('Stack Overflow fetch error:', error);
    return [];
  }
}

/**
 * Fetch documentation via Google Custom Search
 */
/**
 * ARCHITECTURAL FIX: Ranking is best-effort enhancement
 * Uses pre-pruned, bounded payload
 */

async function rankResourcesWithLLM(resources, reviewContext) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // GUARANTEE: Return unranked on any failure
  if (!GROQ_API_KEY || resources.length === 0) {
    console.log('[Ranking] Skipped, using pre-ranking order');
    return resources.map((r, i) => ({
      ...r,
      relevanceScore: 0.9 - (i * 0.05),
      ranked: false
    }));
  }

  try {
    const systemPrompt = `Score ${resources.length} resources (0.00-1.00) for learning goal: "${reviewContext.learningGoal}"
Priority: ${JSON.stringify(reviewContext.contentPriority)}

STRICT RULES:
- Return ONLY a raw JSON array of numbers.
- NO labels, NO keys, NO explanations.
- Output MUST be exactly this format: [0.95, 0.88, 0.42, ...]
- Maintain the exact order of resources provided.`;

    const userPrompt = resources.map((r, i) =>
      `${i}. [${r.type}] ${r.title}\n   ${r.description?.substring(0, 100)}`
    ).join('\n\n');

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
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`Ranking API error: ${response.status}`);

    const data = await response.json();
    let scoresText = data.choices[0]?.message?.content || '[]';

    // Robust cleanup: remove any think tags or MD formatting
    scoresText = scoresText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    scoresText = scoresText.replace(/^```json?\s*/i, '').replace(/\n?```\s*$/i, '');

    const jsonMatch = scoresText.match(/\[[\s\S]*\]/);
    let scores = [];

    if (jsonMatch) {
      try {
        const rawScores = JSON.parse(jsonMatch[0]);
        // Handle both [0.1, 0.2] and [{score: 0.1}, {score: 0.2}]
        scores = rawScores.map(s => typeof s === 'number' ? s : (parseFloat(s) || parseFloat(s.score) || 0.5));
      } catch (e) {
        // Fallback: extract all numbers from the string
        console.warn('[Ranking] JSON parse failed, attempting regex extract', e.message);
        scores = (jsonMatch[0].match(/\d+\.?\d*/g) || []).map(num => parseFloat(num));
      }
    }

    console.log(`[Ranking] Extracted ${scores.length} scores for ${resources.length} resources`);

    return resources.map((r, i) => {
      let relevanceScore = scores[i];
      if (relevanceScore === undefined || isNaN(relevanceScore)) {
        relevanceScore = r.rawRelevance || 0.5;
      }
      return {
        ...r,
        relevanceScore,
        ranked: true
      };
    });

  } catch (error) {
    console.error('[Ranking] Failed, using pre-ranking:', error.message);
    return resources.map((r, i) => ({
      ...r,
      relevanceScore: r.rawRelevance || (0.9 - i * 0.05),
      ranked: false
    }));
  }
}
/**
 * Main endpoint with review-driven workflow
 */

// Modify the /resources endpoint

router.post('/resources', async (req, res) => {
  try {
    const { codeContext, sourceCode, userIntent, reviewResponse } = req.body; // ADD reviewResponse

    if (!codeContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing codeContext'
      });
    }

    // VALIDATION: Require reviewResponse for proper anchor extraction
    if (!reviewResponse) {
      return res.status(400).json({
        success: false,
        error: 'Missing reviewResponse - cannot extract concrete anchors'
      });
    }

    console.log('[Resources] Starting direct review-driven resource fetch...');

    // STEP 1: Build learning strategy (for ranking and context)
    const buildResourceReviewContext = req.app.locals.buildResourceReviewContext;
    const learningStrategy = await buildResourceReviewContext(codeContext, sourceCode, userIntent);

    // STEP 2: Generate search queries directly from review and context
    const allQueries = await buildSearchQueries(reviewResponse, codeContext, sourceCode, userIntent);

    console.log(`[Resources] Generated ${allQueries.length} direct queries`);

    // STEP 3: Route queries to appropriate search engines
    const fetchPromises = [];
    const mdnQueries = allQueries.filter(q => q.searchEngine === 'mdn');
    const tavilyQueries = allQueries.filter(q => q.searchEngine === 'tavily');
    const stackOverflowQueries = allQueries.filter(q => q.searchEngine === 'stackoverflow');

    // MDN (JavaScript/TypeScript official docs)
    if (mdnQueries.length > 0) {
      console.log(`[Resources] Routing ${mdnQueries.length} queries to MDN:`);
      mdnQueries.slice(0, 6).forEach((q, i) => {
        console.log(`  MDN ${i + 1}. ${q.primary}`);
        fetchPromises.push(fetchMDN(q.primary, codeContext.language.language));
      });
    }

    // Tavily (general web search)
    if (tavilyQueries.length > 0) {
      console.log(`[Resources] Routing ${tavilyQueries.length} queries to Tavily`);
      fetchPromises.push(fetchTavilyByIntent(tavilyQueries.slice(0, 10)));
    }

    // Stack Overflow (troubleshooting)
    if (stackOverflowQueries.length > 0) {
      console.log(`[Resources] Routing ${stackOverflowQueries.length} queries to Stack Overflow:`);
      stackOverflowQueries.slice(0, 3).forEach((q, i) => {
        console.log(`  SO ${i + 1}. ${q.primary}`);
        fetchPromises.push(fetchStackOverflow(q.primary));
      });
    }

    // GitHub (top 3 queries only)
    console.log(`[Resources] Routing ${Math.min(3, allQueries.length)} queries to GitHub:`);
    allQueries.slice(0, 3).forEach((q, i) => {
      console.log(`  GitHub ${i + 1}. ${q.primary}`);
      fetchPromises.push(fetchGitHub(q.primary));
    });

    const allResources = await Promise.all(fetchPromises);
    const flatResources = allResources.flat();

    // Deduplicate
    const uniqueResources = Array.from(
      new Map(flatResources.map(r => [r.url, r])).values()
    );

    console.log(`[Resources] Fetched ${uniqueResources.length} unique resources`);

    // STEP 4: Prune before ranking
    const { pruneForRanking } = require('./resource-pipeline');
    const prunedResources = pruneForRanking(uniqueResources, 15);

    // STEP 5: Rank with LLM using the learning strategy
    const rankedResources = await rankResourcesWithLLM(prunedResources, learningStrategy);

    // Sort and take top 25
    const topResources = rankedResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 25);

    console.log(`[Resources] Returning ${topResources.length} ranked resources`);

    res.json({
      success: true,
      resources: topResources,
      metadata: {
        totalFetched: uniqueResources.length,
        totalReturned: topResources.length,
        learningGoal: learningStrategy.learningGoal,
        pipeline: {
          type: 'direct-review-driven',
          totalQueries: allQueries.length,
          resourcesPruned: uniqueResources.length - prunedResources.length,
          resourcesRanked: prunedResources.length
        },
        routing: {
          mdn: mdnQueries.length,
          tavily: tavilyQueries.length,
          stackoverflow: stackOverflowQueries.length
        },
        queries: allQueries.map(q => ({ query: q.primary, engine: q.searchEngine })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resources endpoint error:', error);

    // EXPLICIT FALLBACK
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch resources',
      fallback: true,
      metadata: {
        errorType: error.name,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router; module.exports.buildSearchQueries = buildSearchQueries;
