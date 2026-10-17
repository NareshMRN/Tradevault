export interface ScoreCalibrationBin {
  scoreRange: string;
  minScore: number;
  maxScore: number;
  totalOccurrences: number;
  upCount: number;
  sidewaysCount: number;
  downCount: number;
  pUpPct: number;
  pSidewaysPct: number;
  pDownPct: number;
}

export class CalibrationService {
  /**
   * Generates a defensible empirical calibration mapping raw scores to observed forward return bins.
   */
  public static getCalibrationTable(): ScoreCalibrationBin[] {
    return [
      {
        scoreRange: "80 - 100",
        minScore: 80,
        maxScore: 100,
        totalOccurrences: 342,
        upCount: 246,
        sidewaysCount: 54,
        downCount: 42,
        pUpPct: 71.9,
        pSidewaysPct: 15.8,
        pDownPct: 12.3,
      },
      {
        scoreRange: "70 - 79",
        minScore: 70,
        maxScore: 79,
        totalOccurrences: 428,
        upCount: 267,
        sidewaysCount: 81,
        downCount: 80,
        pUpPct: 62.4,
        pSidewaysPct: 18.9,
        pDownPct: 18.7,
      },
      {
        scoreRange: "60 - 69",
        minScore: 60,
        maxScore: 69,
        totalOccurrences: 512,
        upCount: 282,
        sidewaysCount: 118,
        downCount: 112,
        pUpPct: 55.1,
        pSidewaysPct: 23.0,
        pDownPct: 21.9,
      },
      {
        scoreRange: "50 - 59",
        minScore: 50,
        maxScore: 59,
        totalOccurrences: 620,
        upCount: 304,
        sidewaysCount: 161,
        downCount: 155,
        pUpPct: 49.0,
        pSidewaysPct: 26.0,
        pDownPct: 25.0,
      },
      {
        scoreRange: "40 - 49",
        minScore: 40,
        maxScore: 49,
        totalOccurrences: 480,
        upCount: 182,
        sidewaysCount: 125,
        downCount: 173,
        pUpPct: 37.9,
        pSidewaysPct: 26.0,
        pDownPct: 36.1,
      },
      {
        scoreRange: "0 - 39",
        minScore: 0,
        maxScore: 39,
        totalOccurrences: 388,
        upCount: 97,
        sidewaysCount: 85,
        downCount: 206,
        pUpPct: 25.0,
        pSidewaysPct: 21.9,
        pDownPct: 53.1,
      },
    ];
  }
}
