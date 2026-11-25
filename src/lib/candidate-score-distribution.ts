export type CandidateScoreDistribution = {
  score1To3: number;
  score4To5: number;
  score6To7: number;
  score8To10: number;
};

export function candidateScoreDistribution(candidates: Iterable<{ qualificationScore: number | null }>): CandidateScoreDistribution {
  const counts = { score1To3: 0, score4To5: 0, score6To7: 0, score8To10: 0 };
  for (const { qualificationScore: score } of candidates) {
    if (score === null || !Number.isInteger(score) || score < 1 || score > 10) continue;
    if (score <= 3) counts.score1To3++;
    else if (score <= 5) counts.score4To5++;
    else if (score <= 7) counts.score6To7++;
    else counts.score8To10++;
  }
  return counts;
}
