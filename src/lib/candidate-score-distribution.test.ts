import assert from "node:assert/strict";
import test from "node:test";
import { candidateScoreDistribution } from "./candidate-score-distribution";

const scored = (scores: (number | null)[]) => scores.map(qualificationScore => ({ qualificationScore }));

test("score ranges include each boundary exactly once and ignore missing or invalid scores", () => {
  assert.deepEqual(candidateScoreDistribution(scored([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null, 0, 11, 8.5, NaN])), {
    score1To3: 3, score4To5: 2, score6To7: 2, score8To10: 3,
  });
});

test("counts follow the displayed selection and reflect changed scores without retaining old totals", () => {
  const candidates = scored([8, 8, 9, 10, 9, 10]);
  assert.equal(candidateScoreDistribution(candidates).score8To10, 6);
  assert.equal(candidateScoreDistribution(candidates.slice(0, 4)).score8To10, 4);
  candidates[4].qualificationScore = 6;
  candidates[5].qualificationScore = null;
  assert.equal(candidateScoreDistribution(candidates).score8To10, 4);
  assert.deepEqual(candidateScoreDistribution([]), { score1To3: 0, score4To5: 0, score6To7: 0, score8To10: 0 });
});
