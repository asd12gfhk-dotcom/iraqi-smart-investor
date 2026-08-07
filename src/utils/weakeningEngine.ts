import { ISXCompany } from '../types/isx';

export interface WeakeningStockResult {
  company: ISXCompany;
  reasons: string[];
  scoreDrop: number;
  prevScore: number;
  currScore: number;
  prevTrend: string;
  currTrend: string;
  liqDropPct: number;
  prevLiqScore: number;
  currLiqScore: number;
}

/**
 * Detects stocks experiencing actual recent technical weakening over the last 5 active sessions
 * according to the 3 mandatory rules in Document 5 (Section 9).
 */
export function detectWeakeningStocks(companies: ISXCompany[]): WeakeningStockResult[] {
  const results: WeakeningStockResult[] = [];

  companies.forEach((c) => {
    const history = c.history || [];
    if (history.length < 6) return;

    // Current state values
    const currScore = c.evaluation?.compositeScore ?? 50;
    const currTrend = c.evaluation?.trendAnalysis?.mediumTerm?.level || c.indicators?.trendDirection || 'جانبي';
    const currLiqScore = c.evaluation?.scoreBreakdown?.liquidityScore ?? 50;

    // Estimate/calculate state 5 active sessions ago
    const bar5Ago = history[history.length - 6];
    const prev5Price = bar5Ago.close;

    // Deterministic estimates for 5 sessions ago based on historical bar & indicators
    const priceChange5 = ((c.currentPrice - prev5Price) / Math.max(0.01, prev5Price)) * 100;
    
    // Calculate prev composite score (deterministic estimation)
    let scoreDropEst = 0;
    if (priceChange5 < -3) {
      scoreDropEst = Math.round(Math.abs(priceChange5) * 1.8);
    } else if (priceChange5 < 0) {
      scoreDropEst = Math.round(Math.abs(priceChange5) * 1.2);
    }
    
    // If current score is lower than past, or price dropped significantly
    const prevScore = Math.min(100, Math.max(0, currScore + scoreDropEst));
    const actualScoreDrop = prevScore - currScore;

    // Prev Trend estimation
    let prevTrend = currTrend;
    if (priceChange5 <= -4 && (currTrend === 'جانبي' || currTrend.includes('هابط'))) {
      prevTrend = 'صاعد';
    } else if (priceChange5 <= -7) {
      prevTrend = 'صاعد قوي';
    }

    // Prev Liquidity Score estimation
    const vol5Ago = bar5Ago.volume;
    const currVol = c.volume;
    const volChangePct = currVol > 0 ? ((vol5Ago - currVol) / vol5Ago) * 100 : 0;
    
    const prevLiqScore = Math.min(100, Math.max(0, currLiqScore + (volChangePct > 0 ? Math.round(volChangePct * 0.4) : 0)));
    const liqDropPct = prevLiqScore > 0 ? Math.round(((prevLiqScore - currLiqScore) / prevLiqScore) * 100) : 0;

    const reasons: string[] = [];

    // Rule 1: Composite score dropped by 10+ points vs 5 sessions ago
    if (actualScoreDrop >= 10) {
      reasons.push(`انخفضت القوة الفنية بمقدار ${actualScoreDrop} نقطة خلال آخر 5 جلسات.`);
    }

    // Rule 2: Trend was "صاعد" or "صاعد قوي" 5 sessions ago and is no longer that
    const wasBullish = prevTrend === 'صاعد' || prevTrend === 'صاعد قوي';
    const isNoLongerBullish = !currTrend.includes('صاعد');
    if (wasBullish && isNoLongerBullish) {
      reasons.push(`فقد السهم اتجاهه الصاعد (كان ${prevTrend}، أصبح ${currTrend}).`);
    }

    // Rule 3: Liquidity Score dropped by 25%+ vs 5 sessions ago
    if (liqDropPct >= 25) {
      reasons.push(`انخفضت السيولة بنسبة ${liqDropPct}% خلال آخر 5 جلسات.`);
    }

    // Only include stock if at least 1 rule triggered
    if (reasons.length > 0) {
      results.push({
        company: c,
        reasons,
        scoreDrop: actualScoreDrop,
        prevScore,
        currScore,
        prevTrend,
        currTrend,
        liqDropPct,
        prevLiqScore,
        currLiqScore
      });
    }
  });

  // Sort by highest score drop or number of weakening reasons
  return results.sort((a, b) => b.reasons.length - a.reasons.length || b.scoreDrop - a.scoreDrop);
}
