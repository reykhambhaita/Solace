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

module.exports = { pruneForRanking };