/* RecoLens recommendation engine. MovieLens-derived scores, not observed accuracy.
 * No ratings leave the browser. Candidate pool remains the complete 1,800-film set.
 */
(() => {
  "use strict";
  const DATA = window.RECOLENS_DATA, MOVIES = DATA.movies, FEATURES = DATA.features, CF = DATA.cf;
  const RECOMMENDATION_COUNT = 6;
  const ALGORITHM_KEYS = Object.freeze(["popularity", "content", "collaborative", "biasAware"]);
  const clamp = (v,a,b) => Math.min(b, Math.max(a,v));
  const mean = arr => arr.length ? arr.reduce((a,b) => a+b,0)/arr.length : 0;
  function dotSparse(a, b) {
    let i = 0;
    let j = 0;
    let sum = 0;
    while (i < a.length && j < b.length) {
      const ai = a[i][0];
      const bj = b[j][0];
      if (ai === bj) {
        sum += a[i][1] * b[j][1];
        i += 1;
        j += 1;
      } else if (ai < bj) {
        i += 1;
      } else {
        j += 1;
      }
    }
    return sum;
  }

  function buildUserProfile(entries) {
    const map = new Map();
    for (const [index, rating] of entries) {
      const weight = rating - 3;
      if (!weight) continue;
      for (const [feature, value] of FEATURES[index]) {
        map.set(feature, (map.get(feature) || 0) + weight * value);
      }
    }
    const norm = Math.sqrt([...map.values()].reduce((sum, value) => sum + value * value, 0));
    if (!norm) return [];
    return [...map.entries()].map(([feature, value]) => [feature, value / norm]).sort((a, b) => a[0] - b[0]);
  }

  function normalizeArray(values, excluded) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i += 1) {
      if (excluded.has(i) || !Number.isFinite(values[i])) continue;
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    const output = new Float64Array(values.length);
    if (!Number.isFinite(min) || max - min < 1e-9) return output;
    for (let i = 0; i < values.length; i += 1) {
      output[i] = excluded.has(i) ? 0 : clamp((values[i] - min) / (max - min), 0, 1);
    }
    return output;
  }

  function topIndices(scores, excluded, count, minimum = -Infinity) {
    const indices = [];
    for (let i = 0; i < scores.length; i += 1) {
      if (!excluded.has(i) && Number.isFinite(scores[i]) && scores[i] > minimum) indices.push(i);
    }
    indices.sort((a, b) => scores[b] - scores[a] || MOVIES[b].count - MOVIES[a].count || a - b);
    return indices.slice(0, count);
  }

  function genreDistributionFromRatings(entries) {
    const counts = new Map(DATA.genres.map((genre) => [genre, 0]));
    for (const [index, rating] of entries) {
      if (rating < 4) continue;
      const movie = MOVIES[index];
      const weight = rating - 2.5;
      const split = weight / Math.max(movie.genres.length, 1);
      for (const genre of movie.genres) counts.set(genre, (counts.get(genre) || 0) + split);
    }
    return normalizeDistribution([...counts.values()]);
  }

  function genreDistributionFromList(list) {
    const counts = new Map(DATA.genres.map((genre) => [genre, 0]));
    for (const index of list) {
      const movie = MOVIES[index];
      const split = 1 / Math.max(movie.genres.length, 1);
      for (const genre of movie.genres) counts.set(genre, (counts.get(genre) || 0) + split);
    }
    return normalizeDistribution([...counts.values()]);
  }

  function normalizeDistribution(values) {
    const sum = values.reduce((total, value) => total + value, 0);
    if (!sum) return values.map(() => 0);
    return values.map((value) => value / sum);
  }

  function jsDivergence(p, q) {
    let value = 0;
    for (let i = 0; i < p.length; i += 1) {
      const m = (p[i] + q[i]) / 2;
      if (p[i] > 0 && m > 0) value += 0.5 * p[i] * Math.log2(p[i] / m);
      if (q[i] > 0 && m > 0) value += 0.5 * q[i] * Math.log2(q[i] / m);
    }
    return clamp(value, 0, 1);
  }

  function calibrationScore(userDistribution, list) {
    const userHasProfile = userDistribution.some((value) => value > 0);
    if (!userHasProfile || !list.length) return 0.5;
    return 1 - jsDivergence(userDistribution, genreDistributionFromList(list));
  }

  function computeRecommendations(ratings, lambda = 0.67) {
    if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) throw new Error("올바른 영화 평점을 입력해 주세요.");
    const entries = Object.entries(ratings).map(([index, value]) => [Number(index), Number(value)]);
    if (entries.length < 1 || entries.some(([i,r]) => !Number.isInteger(i) || !MOVIES[i] || !Number.isInteger(r) || r < 1 || r > 5)) throw new Error("올바른 영화 평점을 입력해 주세요.");
    const neutralOnly = entries.every(([,r]) => r === 3);
    if (!Number.isFinite(lambda)) lambda = 0.67;
    lambda = clamp(lambda, 0.55, 0.85);
    const excluded = new Set(entries.map(([index]) => index));
    const profile = buildUserProfile(entries);
    const n = MOVIES.length;

    const contentRaw = new Float64Array(n);
    for (let i = 0; i < n; i += 1) contentRaw[i] = dotSparse(profile, FEATURES[i]);
    const content = normalizeArray(contentRaw, excluded);

    const cfNumerator = new Float64Array(n);
    // Sum of liked-item evidence, divided by the same total input weight for every
    // candidate. The previous per-candidate weighted average collapsed to a
    // constant whenever all selected films received the same positive rating.
    const totalPreference = entries.reduce((sum, [,r]) => sum + Math.abs(r - 3), 0);
    const cfSupport = new Uint16Array(n);
    for (const [ratedIndex, rating] of entries) {
      const preference = rating - 3;
      if (!preference) continue;
      for (const [candidateIndex, similarity] of CF[ratedIndex]) {
        if (excluded.has(candidateIndex)) continue;
        if (!Number.isFinite(similarity) || similarity <= 0) continue;
        cfNumerator[candidateIndex] += similarity * preference;
        cfSupport[candidateIndex] += 1;
      }
    }
    const cfRaw = new Float64Array(n);
    for (let i = 0; i < n; i += 1) cfRaw[i] = totalPreference ? cfNumerator[i] / totalPreference : 0;
    const cf = normalizeArray(cfRaw, excluded);

    const popularity = new Float64Array(n);
    const collaborativeScore = new Float64Array(n);
    const contentScore = new Float64Array(n);
    const hybrid = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      popularity[i] = MOVIES[i].popScore;
      contentScore[i] = 0.96 * content[i] + 0.04 * popularity[i];
      collaborativeScore[i] = 0.84 * cf[i] + 0.12 * content[i] + 0.04 * popularity[i];
      hybrid[i] = 0.5 * content[i] + 0.5 * cf[i];
    }

    const popularityList = topIndices(popularity, excluded, RECOMMENDATION_COUNT);
    const contentList = topIndices(contentScore, excluded, RECOMMENDATION_COUNT);
    const collaborativeList = topIndices(collaborativeScore, excluded, RECOMMENDATION_COUNT);
    const userGenres = genreDistributionFromRatings(entries);
    const biasAwareList = rerankBiasAware(hybrid, excluded, userGenres, lambda, RECOMMENDATION_COUNT);

    const lists = {
      popularity: popularityList,
      content: contentList,
      collaborative: collaborativeList,
      biasAware: biasAwareList,
    };
    const metrics = Object.fromEntries(ALGORITHM_KEYS.map((key) => [key, calculateMetrics(lists[key], hybrid, userGenres)]));

    return {
      version: "7.0.0",
      neutralOnly,
      ratings: Object.fromEntries(entries),
      count: RECOMMENDATION_COUNT,
      createdAt: new Date().toISOString(),
      lists,
      metrics,
      userGenres,
      analysis: { content, cf, hybrid, contentRaw, cfRaw, cfSupport },
      // Full candidate scores are retained only in memory for explicit feedback fusion.
      rankingScores: { popularity, content: contentScore, collaborative: collaborativeScore },
      lambda,
    };
  }

  function rerankBiasAware(hybrid, excluded, userGenres, lambda, count) {
    const pool = topIndices(hybrid, excluded, 90);
    const selected = [];
    const selectedSet = new Set();
    // Cache each candidate's maximum overlap with the selected prefix. Extending
    // a prefix needs one new dot product per candidate, not a full rescan.
    // This changes computation cost, not the objective or recommendation order.
    const maxOverlap = new Float64Array(pool.length);

    while (selected.length < count && selected.length < pool.length) {
      let bestIndex = -1;
      let bestScore = -Infinity;
      for (let slot = 0; slot < pool.length; slot += 1) {
        const index = pool[slot];
        if (selectedSet.has(index)) continue;
        const relevance = hybrid[index];
        const diversity = 1 - maxOverlap[slot];
        const novelty = 1 - MOVIES[index].pop;
        const calibration = calibrationScore(userGenres, [...selected, index]);
        const balance = 0.5 * diversity + 0.3 * novelty + 0.2 * calibration;
        const score = lambda * relevance + (1 - lambda) * balance;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
      if (bestIndex < 0) break;
      selected.push(bestIndex);
      selectedSet.add(bestIndex);
      for (let slot = 0; slot < pool.length; slot += 1) {
        if (!selectedSet.has(pool[slot])) maxOverlap[slot] = Math.max(
          maxOverlap[slot], clamp(dotSparse(FEATURES[pool[slot]], FEATURES[bestIndex]), 0, 1)
        );
      }
    }
    return selected;
  }

  function listDiversity(list) {
    if (list.length < 2) return 0;
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        total += 1 - clamp(dotSparse(FEATURES[list[i]], FEATURES[list[j]]), 0, 1);
        pairs += 1;
      }
    }
    return pairs ? total / pairs : 0;
  }

  function genreEntropy(list) {
    const distribution = genreDistributionFromList(list).filter((value) => value > 0);
    if (distribution.length <= 1) return 0;
    const entropy = -distribution.reduce((sum, value) => sum + value * Math.log2(value), 0);
    return clamp(entropy / Math.log2(DATA.genres.length), 0, 1);
  }

  function calculateMetrics(list, hybrid, userGenres) {
    return {
      relevance: mean(list.map((index) => hybrid[index])),
      diversity: listDiversity(list),
      genreEntropy: genreEntropy(list),
      novelty: mean(list.map((index) => 1 - MOVIES[index].pop)),
      popularity: mean(list.map((index) => MOVIES[index].pop)),
      longTail: mean(list.map((index) => MOVIES[index].head ? 0 : 1)),
      calibration: calibrationScore(userGenres, list),
    };
  }


  /**
   * List feedback is a preference over ranking methods, NOT a rating for every
   * movie in a slate. The four original lists are frozen for a fair comparison.
   * New recommendations use smoothed, bounded list-preference weights and
   * weighted reciprocal-rank fusion over the top 60 of each method.
   * This is a transparent local heuristic, not retraining MovieLens or a
   * statistically validated improvement in recommendation accuracy.
   */
  function feedbackWeights(listRatings) {
    if (!listRatings || typeof listRatings !== "object" || Array.isArray(listRatings)) {
      throw new Error("네 추천 목록에 모두 1~5점을 남겨 주세요.");
    }
    const values = ALGORITHM_KEYS.map(key => listRatings[key]);
    if (values.some(value => !Number.isInteger(value) || value < 1 || value > 5)) {
      throw new Error("네 추천 목록에 모두 1~5점을 남겨 주세요.");
    }
    const exps = values.map(value => Math.exp(0.7 * (value - 3)));
    const total = exps.reduce((sum, value) => sum + value, 0);
    return Object.fromEntries(ALGORITHM_KEYS.map((key, i) => [key, 0.10 + 0.60 * exps[i] / total]));
  }

  function adaptRecommendations(base, listRatings) {
    const weights = feedbackWeights(listRatings);
    if (!base?.rankingScores || !base.ratings || base.version !== "7.0.0") {
      throw new Error("영화 점수로 먼저 추천 목록을 만들어 주세요.");
    }
    const excluded = new Set(Object.keys(base.ratings).map(Number));
    const depth = 60;
    // Memoize rankings on this base only. Changing a movie rating creates a new
    // base and therefore cannot reuse stale feedback candidates.
    if (!base.feedbackRankings) {
      base.feedbackRankings = {
        popularity: topIndices(base.rankingScores.popularity, excluded, depth),
        content: topIndices(base.rankingScores.content, excluded, depth),
        collaborative: topIndices(base.rankingScores.collaborative, excluded, depth),
        biasAware: rerankBiasAware(base.analysis.hybrid, excluded, base.userGenres, base.lambda, depth),
      };
    }
    const scores = new Float64Array(MOVIES.length);
    const contributions = Object.fromEntries(ALGORITHM_KEYS.map(key => [key, new Float64Array(MOVIES.length)]));
    const offset = 10;
    for (const key of ALGORITHM_KEYS) {
      base.feedbackRankings[key].forEach((index, rank) => {
        const value = weights[key] / (offset + rank + 1);
        contributions[key][index] = value;
        scores[index] += value;
      });
    }
    const list = topIndices(scores, excluded, RECOMMENDATION_COUNT, 0);
    return {
      version: "7.0.0", list, weights, listRatings: {...listRatings}, scores,
      contributions, depth, offset,
      neutralOnly: base.neutralOnly,
      metrics: calculateMetrics(list, base.analysis.hybrid, base.userGenres),
      createdAt: new Date().toISOString(),
    };
  }

  window.RecoEngine = Object.freeze({
    compute: computeRecommendations, adapt: adaptRecommendations,
    feedbackWeights, methods: ALGORITHM_KEYS, similarity: dotSparse,
  });
})();
