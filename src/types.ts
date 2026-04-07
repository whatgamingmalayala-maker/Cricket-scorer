export type BallType = 'legal' | 'wide' | 'noball' | 'wicket';

export type BallResult = {
  type: BallType;
  runs: number;
  isExtra: boolean;
  display: string;
};

export type MatchState = {
  team1Name: string;
  team2Name: string;
  totalOvers: number;
  totalWickets: number;
  innings: 1 | 2;
  firstInningsScore: number | null;
  runs: number;
  wickets: number;
  balls: number; // total legal balls
  history: BallResult[];
};
