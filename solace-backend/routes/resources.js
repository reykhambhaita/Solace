// routes/resources.js
const express = require('express');
const router = express.Router();



/**
 * Build search queries from code context
 */
function buildSearchQueries(reviewIR, codeContext) {
  const queries = [];

  // Primary query based on intent
  const intentQuery = `${reviewIR.language} ${reviewIR.intent.primary} ${reviewIR.intent.description}`;
  queries.push({
    primary: intentQuery,
    weight: 1.0,
    type: 'intent'
  });

  // Paradigm-specific query
  if (reviewIR.structure.paradigm) {
    queries.push({
      primary: `${reviewIR.language} ${reviewIR.structure.paradigm} programming examples`,
      weight: 0.8,
      type: 'paradigm'
    });
  }

  // Framework-specific queries
  if (codeContext.libraries?.frameworks?.length > 0) {
    const framework = codeContext.libraries.frameworks[0].name;
    queries.push({
      primary: `${framework} ${reviewIR.intent.primary} tutorial`,
      weight: 0.9,
      type: 'framework'
    });
  }

  // Complexity-specific query
  if (reviewIR.quality.controlFlowComplexity > 5) {
    queries.push({
      primary: `${reviewIR.language} reduce complexity refactoring`,
      weight: 0.7,
      type: 'quality'
    });
  }

  // Error handling specific
  if (reviewIR.quality.errorHandling !== 'unknown') {
    queries.push({
      primary: `${reviewIR.language} ${reviewIR.quality.errorHandling} error handling best practices`,
      weight: 0.7,
      type: 'error-handling'
    });
  }

  // Library-specific queries
  const topLibraries = codeContext.libraries?.libraries
    ?.filter(lib => !lib.isStandardLib)
    ?.slice(0, 2) || [];

  topLibraries.forEach(lib => {
    queries.push({
      primary: `${lib.name} ${reviewIR.language} documentation examples`,
      weight: 0.6,
      type: 'library'
    });
  });

  return queries;
}

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
async function fetchDocumentation(query, language) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.warn('Google API credentials not configured (GOOGLE_API_KEY or GOOGLE_CSE_ID missing)');
    return [];
  }

  try {
    // Add documentation-specific terms
    const docQuery = `${query} ${language} documentation tutorial guide`;

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(docQuery)}&num=5`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) return [];

    return data.items
      .filter(item => {
        const url = item.link.toLowerCase();
        // Filter for known documentation sites
        return url.includes('docs.') ||
          url.includes('documentation') ||
          url.includes('.readthedocs.') ||
          url.includes('developer.mozilla.org') ||
          url.includes('github.com') && url.includes('/wiki');
      })
      .map(item => ({
        type: 'documentation',
        title: item.title,
        url: item.link,
        description: item.snippet || 'No description available',
        metadata: {},
        rawRelevance: 0
      }));
  } catch (error) {
    console.error('Documentation fetch error:', error);
    return [];
  }
}

/**
 * Fetch YouTube videos
 */
async function fetchYouTube(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured (YOUTUBE_API_KEY missing)');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(query)}&type=video&part=snippet&maxResults=5&order=relevance`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) return [];

    return data.items.map(item => ({
      type: 'video',
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.videoId.videoId}`,
      description: item.snippet.description || 'No description available',
      metadata: {},
      rawRelevance: 0
    }));
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return [];
  }
}

/**
 * Use LLM to rank resources by relevance
 */
async function rankResourcesWithLLM(resources, reviewIR, queries) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.warn('GROQ API key not configured (GROQ_API_KEY missing), using basic scoring');
    return resources.map((r, i) => ({ ...r, relevanceScore: 0.5 - (i * 0.02) }));
  }

  try {
    const systemPrompt = `You are an expert at evaluating learning resources for programmers.
Given code context and a list of resources, score each resource's relevance on a scale of 0.0 to 1.0.

Code Context:
- Language: ${reviewIR.language}
- Intent: ${reviewIR.intent.description}
- Paradigm: ${reviewIR.structure.paradigm}
- Complexity: ${reviewIR.quality.controlFlowComplexity}
- Functions: ${reviewIR.structure.functions}
- Deterministic: ${reviewIR.behavior.isDeterministic}

Search Queries Used:
${queries.map(q => `- ${q.primary} (${q.type})`).join('\n')}

Score each resource based on:
1. Direct relevance to the code's intent
2. Appropriate complexity level
3. Language/framework match
4. Resource quality (GitHub stars, Stack Overflow votes, etc.)
5. Freshness and maintenance

Return ONLY a JSON array of scores in the same order as the resources, no other text:
[0.95, 0.87, 0.65, ...]`;

    const userPrompt = `Resources to score:\n${resources.map((r, i) =>
      `${i}. [${r.type}] ${r.title}\n   ${r.description}\n   ${JSON.stringify(r.metadata)}`
    ).join('\n\n')}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const scoresText = data.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = scoresText.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Apply scores
    return resources.map((resource, i) => ({
      ...resource,
      relevanceScore: scores[i] || 0.5
    }));

  } catch (error) {
    console.error('LLM ranking error:', error);
    // Fallback: basic scoring based on metadata
    return resources.map((r, i) => {
      let score = 0.5;

      // Boost based on metadata
      if (r.metadata.stars > 1000) score += 0.15;
      else if (r.metadata.stars > 100) score += 0.1;

      if (r.metadata.votes > 10) score += 0.1;
      if (r.metadata.accepted) score += 0.15;

      // Slight penalty for position
      score -= i * 0.02;

      return { ...r, relevanceScore: Math.max(0, Math.min(1, score)) };
    });
  }
}

/**
 * Main endpoint
 */
router.post('/resources', async (req, res) => {
  try {
    const { reviewIR, codeContext } = req.body;

    if (!reviewIR || !codeContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing reviewIR or codeContext'
      });
    }

    // Build search queries from code context
    const queries = buildSearchQueries(reviewIR, codeContext);
    console.log('Generated queries:', queries.map(q => q.primary));

    // Fetch from all sources in parallel
    const allResources = await Promise.all([
      ...queries.slice(0, 3).map(q => fetchGitHub(q.primary)),
      ...queries.slice(0, 3).map(q => fetchStackOverflow(q.primary)),
      fetchDocumentation(queries[0].primary, reviewIR.language),
      fetchYouTube(queries[0].primary)
    ]);

    // Flatten and deduplicate
    const flatResources = allResources.flat();
    const uniqueResources = Array.from(
      new Map(flatResources.map(r => [r.url, r])).values()
    );

    console.log(`Fetched ${uniqueResources.length} unique resources`);

    // Rank with LLM
    const rankedResources = await rankResourcesWithLLM(uniqueResources, reviewIR, queries);

    // Sort by relevance and take top 20
    const topResources = rankedResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    console.log(`Returning ${topResources.length} ranked resources`);

    res.json({
      success: true,
      resources: topResources,
      metadata: {
        totalFetched: uniqueResources.length,
        totalReturned: topResources.length,
        queries: queries.map(q => q.primary),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resources endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch resources'
    });
  }
});

module.exports = router;