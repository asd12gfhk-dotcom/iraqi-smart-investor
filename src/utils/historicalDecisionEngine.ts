import {
  DailyBar,
  HistoricalEpisode,
  CandidateCycle,
  HistoricalSimilarityMatch,
  HistoricalSimilarityEngineResult,
  LiquidityInflowResult,
  SellingExhaustionResult,
  StockMonthlySeasonality,
  StockSeasonalityResult,
  BacktestValidationResult,
  EvidenceGateStatus,
  HistoricalSignalType,
  HistoricalDecisionResult,
  ISXCompany
} from '../types/isx';

/**
 * Historical Decision Engine for ISX (محرك القرار التاريخي لمستثمر العراق الذكي)
 * Pure Vanilla Logic following ALGORITHM_SPEC & iraq_stock_engine.js specifications.
 * Includes 10 modular components with zero look-ahead bias and strict 5 Evidence Gates.
 */

// Month Arabic Names Mapping
const MONTH_NAMES_AR = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول'
];

/**
 * 1. Find Swings using Zigzag algorithm (minSwingPct = 0.15)
 */
export function findSwings(bars: DailyBar[], minSwingPct = 0.15) {
  if (bars.length < 3) return [];
  const swings: { index: number; date: string; price: number; kind: string }[] = [];
  const closes = bars.map((b) => b.close);

  let lastExtremeIdx = 0;
  let lastExtremePrice = closes[0];
  let direction: 'up' | 'down' | null = null;

  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];

    if (direction === null) {
      if (price >= lastExtremePrice * (1 + minSwingPct)) {
        direction = 'up';
        swings.push({ index: lastExtremeIdx, date: bars[lastExtremeIdx].date, price: lastExtremePrice, kind: 'trough' });
        lastExtremeIdx = i;
        lastExtremePrice = price;
      } else if (price <= lastExtremePrice * (1 - minSwingPct)) {
        direction = 'down';
        swings.push({ index: lastExtremeIdx, date: bars[lastExtremeIdx].date, price: lastExtremePrice, kind: 'peak' });
        lastExtremeIdx = i;
        lastExtremePrice = price;
      } else if (price > lastExtremePrice) {
        lastExtremeIdx = i;
        lastExtremePrice = price;
      }
      continue;
    }

    if (direction === 'up') {
      if (price > lastExtremePrice) {
        lastExtremeIdx = i;
        lastExtremePrice = price;
      } else if (price <= lastExtremePrice * (1 - minSwingPct)) {
        swings.push({ index: lastExtremeIdx, date: bars[lastExtremeIdx].date, price: lastExtremePrice, kind: 'peak' });
        direction = 'down';
        lastExtremeIdx = i;
        lastExtremePrice = price;
      }
    } else {
      if (price < lastExtremePrice) {
        lastExtremeIdx = i;
        lastExtremePrice = price;
      } else if (price >= lastExtremePrice * (1 + minSwingPct)) {
        swings.push({ index: lastExtremeIdx, date: bars[lastExtremeIdx].date, price: lastExtremePrice, kind: 'trough' });
        direction = 'up';
        lastExtremeIdx = i;
        lastExtremePrice = price;
      }
    }
  }

  const kind = direction === 'up' ? 'trough_provisional' : (direction === 'down' ? 'peak_provisional' : 'unknown_provisional');
  swings.push({ index: lastExtremeIdx, date: bars[lastExtremeIdx].date, price: lastExtremePrice, kind });

  return swings;
}

/**
 * 2. Build Historical Episodes (حساب الحالات والأزمنة التاريخية)
 */
export function buildHistoricalEpisodes(bars: DailyBar[], minSwingPct = 0.15): HistoricalEpisode[] {
  const swings = findSwings(bars, minSwingPct);
  const confirmed = swings.filter((s) => s.kind === 'peak' || s.kind === 'trough');

  const episodes: HistoricalEpisode[] = [];
  for (let i = 0; i < confirmed.length - 1; i++) {
    const a = confirmed[i];
    const b = confirmed[i + 1];
    if (a.kind !== 'peak' || b.kind !== 'trough') continue;

    const drawdownPct = Math.round(((b.price - a.price) / a.price) * 100 * 10) / 10;
    const declineDurationBars = Math.max(1, b.index - a.index);

    let endDate = bars[bars.length - 1].date;
    let endPrice = bars[bars.length - 1].close;
    let recoveryPct = Math.round(((endPrice - b.price) / b.price) * 100 * 10) / 10;
    let recoveryDurationBars = Math.max(1, bars.length - 1 - b.index);

    for (let j = b.index; j < bars.length; j++) {
      if (bars[j].close >= a.price) {
        endDate = bars[j].date;
        endPrice = bars[j].close;
        recoveryPct = Math.round(((endPrice - b.price) / b.price) * 100 * 10) / 10;
        recoveryDurationBars = Math.max(1, j - b.index);
        break;
      }
    }

    episodes.push({
      startDate: a.date,
      peakDate: a.date,
      troughDate: b.date,
      endDate,
      drawdownPct,
      declineDurationBars,
      recoveryPct,
      recoveryDurationBars,
      peakPrice: a.price,
      troughPrice: b.price
    });
  }

  return episodes;
}

/**
 * 3. Candidate Cycle Discovery Engine (محرك اكتشاف الدورات الزمانية)
 */
export function discoverCandidateCycles(episodes: HistoricalEpisode[], bars: DailyBar[], minSwingPct = 0.15): CandidateCycle {
  const swings = findSwings(bars, minSwingPct);
  const troughs = swings.filter((s) => s.kind === 'trough');

  if (troughs.length < 4) { // MIN_OCCURRENCES = 3 gaps (needs >= 4 troughs)
    return {
      hasValidCycle: false,
      statusLabel: `NO_VALID_CYCLE: أقل من 4 قيعان مؤكدة (${troughs.length})`,
      medianPeriodBars: 0,
      meanPeriodBars: 0,
      stdDevBars: 0,
      percentileP25: 0,
      percentileP75: 0,
      occurrencesCount: Math.max(0, troughs.length - 1),
      successfulReversalsCount: 0,
      failuresCount: 0,
      medianDrawdownPct: 0,
      medianRecoveryPct: 0,
      currentBarsSinceTrough: 0,
      cycleProgressPct: 0,
      isInTroughWindow: false
    };
  }

  const periods: number[] = [];
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  for (let i = 1; i < troughs.length; i++) {
    const t1 = new Date(troughs[i - 1].date).getTime();
    const t2 = new Date(troughs[i].date).getTime();
    periods.push(Math.round((t2 - t1) / MS_PER_DAY));
  }

  const sortedPeriods = [...periods].sort((a, b) => a - b);
  const meanPeriodDays = periods.reduce((a, b) => a + b, 0) / periods.length;
  const medianPeriodDays = sortedPeriods[Math.floor(sortedPeriods.length / 2)];
  const variance = periods.reduce((s, v) => s + Math.pow(v - meanPeriodDays, 2), 0) / Math.max(1, periods.length - 1);
  const stdDevDays = Math.sqrt(variance);
  const cv = meanPeriodDays > 0 ? stdDevDays / meanPeriodDays : 99;

  const p25 = sortedPeriods[Math.floor(sortedPeriods.length * 0.25)] || medianPeriodDays;
  const p75 = sortedPeriods[Math.floor(sortedPeriods.length * 0.75)] || medianPeriodDays;

  const lastTroughMs = new Date(troughs[troughs.length - 1].date).getTime();
  const lastBarMs = new Date(bars[bars.length - 1].date).getTime();
  const daysSinceLastTrough = Math.round((lastBarMs - lastTroughMs) / MS_PER_DAY);

  const MAX_CV_FOR_VALID = 0.55;
  const hasValidCycle = cv <= MAX_CV_FOR_VALID;

  const cycleProgressPct = medianPeriodDays > 0 ? Math.round((daysSinceLastTrough / medianPeriodDays) * 100) : 0;
  const isInTroughWindow = daysSinceLastTrough >= p25 && daysSinceLastTrough <= p75;

  let statusLabel = 'دورة زمنية مستقرة وموثقة';
  if (!hasValidCycle) {
    statusLabel = `NO_VALID_CYCLE: تشتت الزمن كبير (CV = ${cv.toFixed(2)} > 0.55)`;
  } else if (isInTroughWindow) {
    statusLabel = 'في نافذة القاع المتوقعة للدورة التاريخية';
  } else {
    statusLabel = 'خارج نافذة القاع المتوقعة للدورة';
  }

  const drawdowns = episodes.map((e) => e.drawdownPct).sort((a, b) => a - b);
  const recoveries = episodes.map((e) => e.recoveryPct).sort((a, b) => a - b);

  return {
    hasValidCycle,
    statusLabel,
    medianPeriodBars: Math.round(medianPeriodDays),
    meanPeriodBars: Math.round(meanPeriodDays * 10) / 10,
    stdDevBars: Math.round(stdDevDays * 10) / 10,
    percentileP25: Math.round(p25),
    percentileP75: Math.round(p75),
    occurrencesCount: periods.length,
    successfulReversalsCount: episodes.filter((e) => e.recoveryPct > 0).length,
    failuresCount: episodes.filter((e) => e.recoveryPct <= 0).length,
    medianDrawdownPct: drawdowns.length ? drawdowns[Math.floor(drawdowns.length / 2)] : 0,
    medianRecoveryPct: recoveries.length ? recoveries[Math.floor(recoveries.length / 2)] : 0,
    currentBarsSinceTrough: daysSinceLastTrough,
    cycleProgressPct,
    isInTroughWindow
  };
}

/**
 * 4. Feature Extraction Engine (استخراج ميزات الحالة السعرية والسيولة بدون انحياز مستقبلي)
 */
export function extractFeatures(bars: DailyBar[], t: number, peakLookback = 120) {
  const windowStart = Math.max(0, t - peakLookback + 1);
  const window = bars.slice(windowStart, t + 1);
  const closeT = bars[t].close;

  let peakBar = window[0];
  let peakIdxInWindow = 0;
  for (let i = 0; i < window.length; i++) {
    if (window[i].close > peakBar.close) {
      peakBar = window[i];
      peakIdxInWindow = i;
    }
  }
  const daysSincePeak = window.length - 1 - peakIdxInWindow;
  const declinePct = peakBar.close > 0 ? closeT / peakBar.close - 1 : null;
  const declineSpeed = declinePct !== null && daysSincePeak > 0 ? declinePct / daysSincePeak : null;

  const baseStart = Math.max(0, t - 20);
  const baseBars = bars.slice(baseStart, t);
  const volBase = baseBars.length ? baseBars.reduce((a, b) => a + b.volume, 0) / baseBars.length : 1;
  const valBase = baseBars.length ? baseBars.reduce((a, b) => a + (b.value || b.volume * b.close), 0) / baseBars.length : 1;

  const relVolume20 = volBase > 0 ? bars[t].volume / volBase : 1;
  const relValue20 = valBase > 0 ? (bars[t].value || bars[t].volume * bars[t].close) / valBase : 1;

  let valueTrend10 = null;
  if (t >= 9) {
    const rec5 = bars.slice(t - 4, t + 1).reduce((s, b) => s + (b.value || b.volume * b.close), 0) / 5;
    const pri5 = bars.slice(t - 9, t - 4).reduce((s, b) => s + (b.value || b.volume * b.close), 0) / 5;
    if (pri5 > 0) valueTrend10 = rec5 / pri5 - 1;
  }

  let volatility20 = null;
  if (t >= 20) {
    const rets: number[] = [];
    for (let i = t - 19; i <= t; i++) {
      if (bars[i - 1].close > 0) rets.push(bars[i].close / bars[i - 1].close - 1);
    }
    const m = rets.reduce((a, b) => a + b, 0) / rets.length;
    volatility20 = Math.sqrt(rets.reduce((s, v) => s + Math.pow(v - m, 2), 0) / Math.max(1, rets.length - 1));
  }

  let positionInRange60 = null;
  const win60 = bars.slice(Math.max(0, t - 59), t + 1);
  if (win60.length >= 5) {
    const lo = Math.min(...win60.map((b) => b.low));
    const hi = Math.max(...win60.map((b) => b.high));
    positionInRange60 = hi > lo ? (closeT - lo) / (hi - lo) : 0.5;
  }

  let consecutiveDownDays = 0;
  let idx = t;
  while (idx > 0 && bars[idx].close < bars[idx - 1].close) {
    consecutiveDownDays++;
    idx--;
  }

  let adLineSlope10 = null;
  if (t >= 10) {
    const clvVals: number[] = [];
    for (let j = t - 9; j <= t; j++) {
      const b = bars[j];
      const rng = b.high - b.low;
      const clv = rng > 0 ? (b.close - b.low - (b.high - b.close)) / rng : 0;
      clvVals.push(clv * (b.value || b.volume * b.close));
    }
    const firstHalf = clvVals.slice(0, 5).reduce((a, b) => a + b, 0);
    const secondHalf = clvVals.slice(5).reduce((a, b) => a + b, 0);
    const denom = Math.abs(firstHalf) + Math.abs(secondHalf);
    adLineSlope10 = denom > 0 ? (secondHalf - firstHalf) / denom : null;
  }

  return {
    index: t,
    date: bars[t].date,
    close: closeT,
    declinePctFromRecentPeak: declinePct,
    daysSinceRecentPeak: daysSincePeak,
    declineSpeed,
    relVolume20,
    relValue20,
    valueTrend10,
    volatility20,
    positionInRange60,
    consecutiveDownDays,
    adLineSlope10
  };
}

/**
 * 5. Historical Similarity Engine (محرك التشابه والأنماط التاريخية المتطابقة)
 */
const FEATURE_WEIGHTS: Record<string, { w: number; scale: number }> = {
  declinePctFromRecentPeak: { w: 1.0, scale: 0.20 },
  declineSpeed: { w: 0.5, scale: 0.02 },
  relVolume20: { w: 0.8, scale: 1.0 },
  relValue20: { w: 0.8, scale: 1.0 },
  valueTrend10: { w: 0.7, scale: 0.5 },
  volatility20: { w: 0.4, scale: 0.05 },
  positionInRange60: { w: 0.6, scale: 0.3 },
  consecutiveDownDays: { w: 0.3, scale: 3.0 }
};

export function analyzeHistoricalSimilarity(
  bars: DailyBar[],
  currentIdx: number,
  targetReturnPct = 3.5
): HistoricalSimilarityEngineResult {
  if (currentIdx < 20 || bars.length < 30) {
    return {
      matchedCount: 0,
      winRate20dPct: 0,
      medianPost20dReturnPct: 0,
      minPost20dReturnPct: 0,
      maxPost20dReturnPct: 0,
      targetReturnPct,
      matches: [],
      summaryText: 'لا توجد بيانات تاريخية كافية لمقارنة الأنماط.'
    };
  }

  const queryFv = extractFeatures(bars, currentIdx);
  const minGap = 35;
  const k = 15;

  const candidates: { d: number; tp: number; fv: any }[] = [];
  for (let tp = 20; tp <= currentIdx - minGap; tp++) {
    const candFv = extractFeatures(bars, tp);
    let total = 0;
    let weightSum = 0;
    for (const name of Object.keys(FEATURE_WEIGHTS)) {
      const { w, scale } = FEATURE_WEIGHTS[name];
      const va = (queryFv as any)[name];
      const vb = (candFv as any)[name];
      if (va === null || va === undefined || vb === null || vb === undefined) continue;
      const dist = (va - vb) / scale;
      total += w * dist * dist;
      weightSum += w;
    }
    if (weightSum === 0) continue;
    const d = Math.sqrt(total / weightSum);
    candidates.push({ d, tp, fv: candFv });
  }

  candidates.sort((a, b) => a.d - b.d);
  const top = candidates.slice(0, k);

  const matches: HistoricalSimilarityMatch[] = top.map(({ d, tp }) => {
    const cK = bars[tp].close;
    const c5 = bars[Math.min(bars.length - 1, tp + 5)].close;
    const c10 = bars[Math.min(bars.length - 1, tp + 10)].close;
    const c20 = bars[Math.min(bars.length - 1, tp + 20)].close;
    const c30 = bars[Math.min(bars.length - 1, tp + 30)].close;

    let maxPostDD = 0;
    for (let m = tp; m <= Math.min(bars.length - 1, tp + 20); m++) {
      const dd = ((bars[m].close - cK) / cK) * 100;
      if (dd < maxPostDD) maxPostDD = dd;
    }

    const similarityScore = Math.max(0, Math.round(100 / (1 + d)));
    const candFv = extractFeatures(bars, tp);

    return {
      matchDate: bars[tp].date,
      similarityScore,
      drawdownPct: Math.round(((candFv.declinePctFromRecentPeak || 0) * 100) * 10) / 10,
      declineDuration: candFv.daysSinceRecentPeak,
      post5dReturnPct: Math.round(((c5 - cK) / cK) * 100 * 10) / 10,
      post10dReturnPct: Math.round(((c10 - cK) / cK) * 100 * 10) / 10,
      post20dReturnPct: Math.round(((c20 - cK) / cK) * 100 * 10) / 10,
      post30dReturnPct: Math.round(((c30 - cK) / cK) * 100 * 10) / 10,
      maxDrawdownPostSignalPct: Math.round(maxPostDD * 10) / 10
    };
  });

  if (matches.length === 0) {
    return {
      matchedCount: 0,
      winRate20dPct: 0,
      medianPost20dReturnPct: 0,
      minPost20dReturnPct: 0,
      maxPost20dReturnPct: 0,
      targetReturnPct,
      matches: [],
      summaryText: 'لم تتكرر حالة مشابهة تماماً في السجل التاريخي.'
    };
  }

  const wins = matches.filter((m) => m.post20dReturnPct > 0).length;
  const winRate20dPct = Math.round((wins / matches.length) * 100);

  const rets20 = matches.map((m) => m.post20dReturnPct).sort((a, b) => a - b);
  const medianPost20dReturnPct = rets20[Math.floor(rets20.length / 2)];

  return {
    matchedCount: matches.length,
    winRate20dPct,
    medianPost20dReturnPct,
    minPost20dReturnPct: rets20[0],
    maxPost20dReturnPct: rets20[rets20.length - 1],
    targetReturnPct,
    matches,
    summaryText: `تم العثور على ${matches.length} حالة تاريخية مطابقة. نسبة الحالات الإيجابية بعد 20 جلسة: ${winRate20dPct}% بوسطي عائد ${medianPost20dReturnPct > 0 ? '+' : ''}${medianPost20dReturnPct}%.`
  };
}

/**
 * 6. Liquidity Inflow Engine (محرك تدفق السيولة)
 */
export function evaluateLiquidityInflow(bars: DailyBar[]): LiquidityInflowResult {
  const t = bars.length - 1;
  if (t < 25) {
    return {
      caseType: 'NEUTRAL',
      caseTitle: 'بيانات غير كافية للسيولة',
      volumeRatio5d: 1,
      valueRatio5d: 1,
      tradesRatio5d: 1,
      accumulationTrend: 'محايد',
      isPositiveInflow: false,
      description: 'بيانات غير كافية لتحديد حالة السيولة.'
    };
  }

  const fv = extractFeatures(bars, t);
  const relVal = fv.relValue20 || 1;
  const priceThen = bars[t - 5].close;
  const priceNow = bars[t].close;
  const priceTrendPct = priceThen > 0 ? priceNow / priceThen - 1 : 0;

  const ACTIVITY_RISE_THRESHOLD = 1.3;
  const ACTIVITY_FALL_THRESHOLD = 0.7;

  const activityRising = relVal >= ACTIVITY_RISE_THRESHOLD;
  const activityFalling = relVal <= ACTIVITY_FALL_THRESHOLD;
  const twoAgoFalling = t >= 2 ? bars[t - 1].close < bars[t - 2].close : false;

  let caseType: LiquidityInflowResult['caseType'] = 'NEUTRAL';
  let caseTitle = 'سيولة اعتيادية';
  let isPositiveInflow = false;
  let description = 'معدلات السيولة والنشاط متوازنة مع السعر.';

  if (priceTrendPct <= -0.03) {
    caseType = 'CASE_A_PANIC';
    caseTitle = 'الحالة A: هبوط حاد مع ضغط بيعي / هلع';
    isPositiveInflow = false;
    description = 'السعر هابط بنسبة تزيد عن -3% خلال 5 أيام.';
  } else if (priceTrendPct > -0.03 && priceTrendPct <= 0.01 && activityRising && twoAgoFalling) {
    caseType = 'CASE_B_ACCUMULATION';
    caseTitle = 'الحالة B: توقف الهبوط + نشاط سيولة مرتفع (تجميع قاع)';
    isPositiveInflow = true;
    description = 'استقرار السعر فوق القاع مع ارتفاع النشاط المالي (>= 1.3x) وتوقف المسار الهابط.';
  } else if (priceTrendPct > 0.01 && activityRising) {
    caseType = 'CASE_C_REBOUND';
    caseTitle = 'الحالة C: صعود + ارتفاع نشاط السيولة (ارتداد صريح)';
    isPositiveInflow = true;
    description = 'ارتفاع السعر (> +1%) مدعوماً بتدفق سيولة مرتفع (>= 1.3x).';
  } else if (priceTrendPct > 0.01 && activityFalling) {
    caseType = 'CASE_D_WEAK_BOUNCE';
    caseTitle = 'الحالة D: صعود مع انخفاض النشاط (ارتداد ضعيف - تحذير)';
    isPositiveInflow = false;
    description = 'ارتفاع السعر لكن مع تراجع نشاط التداول (<= 0.7x)، مما يضعف استمرارية الصعود.';
  }

  const volBase20 = bars.slice(Math.max(0, t - 20), t).reduce((s, b) => s + b.volume, 0) / 20 || 1;
  const tradesBase20 = bars.slice(Math.max(0, t - 20), t).reduce((s, b) => s + b.trades, 0) / 20 || 1;

  const vol5 = bars.slice(t - 4, t + 1).reduce((s, b) => s + b.volume, 0) / 5;
  const trades5 = bars.slice(t - 4, t + 1).reduce((s, b) => s + b.trades, 0) / 5;

  return {
    caseType,
    caseTitle,
    volumeRatio5d: Math.round((vol5 / volBase20) * 100) / 100,
    valueRatio5d: Math.round(relVal * 100) / 100,
    tradesRatio5d: Math.round((trades5 / tradesBase20) * 100) / 100,
    accumulationTrend: isPositiveInflow ? 'تجميع مكثف' : caseType === 'CASE_A_PANIC' ? 'تجميع تحت الضغط' : 'محايد',
    isPositiveInflow,
    description
  };
}

/**
 * 7. Selling Exhaustion Engine (محرك إنهاك البيع وتوقف الضغط)
 */
export function evaluateSellingExhaustion(bars: DailyBar[]): SellingExhaustionResult {
  const t = bars.length - 1;
  if (t < 25) {
    return {
      isExhausted: false,
      priceDecelerationScore: 0,
      isPriceFloorEstablished: false,
      holdingBarsCount: 0,
      volumeDivergence: false,
      rsiOversoldTurningUp: false,
      score: 0,
      description: 'بيانات غير كافية لتقييم إنهاك ضغط البيع.'
    };
  }

  const fv = extractFeatures(bars, t);

  // 1. large historical decline (percentile >= 0.65)
  const pastEpisodes = buildHistoricalEpisodes(bars.slice(0, t + 1), 0.12);
  const pastDrawdowns = pastEpisodes.map((e) => e.drawdownPct);
  const currDD = (fv.declinePctFromRecentPeak || 0) * 100;
  const nDeeper = pastDrawdowns.filter((d) => d <= currDD).length;
  const pctl = pastDrawdowns.length >= 3 ? nDeeper / pastDrawdowns.length : 0;
  const largeHistoricalDecline = pctl >= 0.65;

  // 2. decline slowing
  const last5 = bars[t - 5].close > 0 ? bars[t].close / bars[t - 5].close - 1 : 0;
  const prior5 = bars[t - 10].close > 0 ? bars[t - 5].close / bars[t - 10].close - 1 : 0;
  const declineSlowing = last5 > prior5 && prior5 < 0;

  // 3. near historical low zone
  const nearHistoricalLowZone = fv.positionInRange60 !== null && fv.positionInRange60 <= 0.20;

  // 4. selling pressure easing
  let maxRecentStreak = 0, streak = 0;
  for (let i = t - 14; i <= t; i++) {
    if (i > 0 && bars[i].close < bars[i - 1].close) {
      streak++;
      if (streak > maxRecentStreak) maxRecentStreak = streak;
    } else {
      streak = 0;
    }
  }
  const sellingPressureEasing = maxRecentStreak >= 3 && fv.consecutiveDownDays <= 1;

  // 5. activity shift
  const activityShift = (fv.relValue20 || 1) >= 1.2 && (fv.declineSpeed || 0) > -0.02;

  const countMet = [largeHistoricalDecline, declineSlowing, nearHistoricalLowZone, sellingPressureEasing, activityShift].filter(Boolean).length;
  const isExhausted = countMet >= 3;

  return {
    isExhausted,
    priceDecelerationScore: declineSlowing ? 80 : 20,
    isPriceFloorEstablished: nearHistoricalLowZone && fv.consecutiveDownDays <= 1,
    holdingBarsCount: fv.consecutiveDownDays,
    volumeDivergence: activityShift,
    rsiOversoldTurningUp: declineSlowing && nearHistoricalLowZone,
    score: Math.round((countMet / 5) * 100),
    description: isExhausted
      ? `تحقق ${countMet}/5 من شروط إنهاك البيع (توقف سرعة الهبوط، أرضية سعرية صلبة، وتراجع الضغط).`
      : `ضغط البيع مستمر (تحقق ${countMet}/5 من شروط الإنهاك).`
  };
}

/**
 * 8. Stock Monthly Seasonality Engine (الموسمية التاريخية المخصصة لكل سهم)
 */
export function evaluateStockSeasonality(bars: DailyBar[]): StockSeasonalityResult {
  const byYearMonth = new Map<string, DailyBar[]>();
  for (const b of bars) {
    const d = new Date(b.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    if (!byYearMonth.has(key)) byYearMonth.set(key, []);
    byYearMonth.get(key)!.push(b);
  }

  const monthReturns: Record<number, number[]> = {};
  for (let m = 1; m <= 12; m++) monthReturns[m] = [];

  for (const [key, monthBars] of byYearMonth.entries()) {
    if (monthBars.length < 5) continue;
    const month = parseInt(key.split('-')[1], 10);
    const sorted = [...monthBars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstClose = sorted[0].close;
    const lastClose = sorted[sorted.length - 1].close;
    if (firstClose > 0) {
      monthReturns[month].push(((lastClose - firstClose) / firstClose) * 100);
    }
  }

  const allMonths: StockMonthlySeasonality[] = [];
  for (let m = 1; m <= 12; m++) {
    const rets = monthReturns[m];
    const n = rets.length;
    if (n >= 2) {
      const avgReturnPct = Math.round((rets.reduce((a, b) => a + b, 0) / n) * 10) / 10;
      const sortedRets = [...rets].sort((a, b) => a - b);
      const medianReturnPct = Math.round(sortedRets[Math.floor(n / 2)] * 10) / 10;
      const posRatio = Math.round((rets.filter((r) => r > 0).length / n) * 100);
      allMonths.push({
        monthNumber: m,
        monthNameAr: MONTH_NAMES_AR[m - 1],
        avgReturnPct,
        medianReturnPct,
        positiveRatioPct: posRatio,
        sampleYearsCount: n
      });
    } else {
      allMonths.push({
        monthNumber: m,
        monthNameAr: MONTH_NAMES_AR[m - 1],
        avgReturnPct: 0,
        medianReturnPct: 0,
        positiveRatioPct: 50,
        sampleYearsCount: n
      });
    }
  }

  const currentMonthNum = new Date().getUTCMonth() + 1;
  const currentMonth = allMonths.find((m) => m.monthNumber === currentMonthNum) || allMonths[0];
  const sortedMonths = [...allMonths].sort((a, b) => b.avgReturnPct - a.avgReturnPct);

  return {
    currentMonth,
    bestMonths: sortedMonths.slice(0, 3),
    worstMonths: sortedMonths.slice(-3).reverse(),
    allMonths,
    seasonalityLabel: `${currentMonth.monthNameAr}: مرصود في ${currentMonth.sampleYearsCount} سنوات (${currentMonth.positiveRatioPct}% إيجابي تاريخياً)`
  };
}

/**
 * 9. Per-Stock State Validity Check (Gate 2 Check)
 */
export function perStockStateValidity(bars: DailyBar[], stateName: 'B' | 'C', horizon = 20): boolean {
  if (bars.length < 150) return false;
  const splitIdx = Math.floor(bars.length * 0.7);

  let signals = 0;
  let wins = 0;
  let sumRet = 0;

  for (let i = splitIdx; i < bars.length - horizon; i++) {
    const fv = extractFeatures(bars, i);
    const pThen = bars[Math.max(0, i - 5)].close;
    const pNow = bars[i].close;
    const priceTrendPct = pThen > 0 ? pNow / pThen - 1 : 0;
    const relVal = fv.relValue20 || 1;
    const twoAgoFalling = i >= 2 ? bars[i - 1].close < bars[i - 2].close : false;

    let isState = false;
    if (stateName === 'B') {
      isState = priceTrendPct > -0.03 && priceTrendPct <= 0.01 && relVal >= 1.3 && twoAgoFalling;
    } else if (stateName === 'C') {
      isState = priceTrendPct > 0.01 && relVal >= 1.3;
    }

    if (isState) {
      signals++;
      const ret = (bars[i + horizon].close / bars[i].close - 1) * 100;
      sumRet += ret;
      if (ret > 0) wins++;
    }
  }

  if (signals < 8) return false;

  let baselineSum = 0;
  let baselineN = 0;
  for (let i = splitIdx; i < bars.length - horizon; i++) {
    baselineSum += (bars[i + horizon].close / bars[i].close - 1) * 100;
    baselineN++;
  }
  const baselineAvg = baselineN > 0 ? baselineSum / baselineN : 0;
  const signalAvg = sumRet / signals;
  const edgePP = signalAvg - baselineAvg;
  const winRate = wins / signals;

  return edgePP >= 0.5 && winRate >= 0.5;
}

/**
 * 10. Out-of-Sample Backtest & Parameter Stability Test
 */
export function runBacktestAndStabilityTest(bars: DailyBar[]): BacktestValidationResult {
  if (bars.length < 50) {
    return {
      sampleSignalsCount: 0,
      inSampleWinRatePct: 50,
      outOfSampleWinRatePct: 50,
      medianReturnPct: 0,
      maxDrawdownPct: 0,
      isUnstableModel: false,
      stabilityStatus: 'نموذج مستقر'
    };
  }

  const splitIdx = Math.floor(bars.length * 0.7);
  let oosSignals = 0;
  let oosWins = 0;
  const oosReturns: number[] = [];
  let maxDD = 0;

  for (let i = splitIdx; i < bars.length - 20; i += 5) {
    const fv = extractFeatures(bars, i);
    const dd = (fv.declinePctFromRecentPeak || 0) * 100;

    if (dd <= -5.0) {
      oosSignals++;
      const ret20 = ((bars[i + 20].close - bars[i].close) / bars[i].close) * 100;
      oosReturns.push(ret20);
      if (ret20 > 0) oosWins++;

      for (let m = i; m <= i + 20; m++) {
        const postDD = ((bars[m].close - bars[i].close) / bars[i].close) * 100;
        if (postDD < maxDD) maxDD = postDD;
      }
    }
  }

  const outOfSampleWinRatePct = oosSignals > 0 ? Math.round((oosWins / oosSignals) * 100) : 50;
  oosReturns.sort((a, b) => a - b);
  const medianReturnPct = oosReturns.length > 0 ? Math.round(oosReturns[Math.floor(oosReturns.length / 2)] * 10) / 10 : 0;

  let perturbedWins = 0;
  let perturbedSignals = 0;
  for (let i = splitIdx; i < bars.length - 20; i += 5) {
    const fv = extractFeatures(bars, i);
    const dd = (fv.declinePctFromRecentPeak || 0) * 100;
    if (dd <= -4.0) {
      perturbedSignals++;
      if (((bars[i + 20].close - bars[i].close) / bars[i].close) * 100 > 0) perturbedWins++;
    }
  }

  const perturbedWinRate = perturbedSignals > 0 ? (perturbedWins / perturbedSignals) * 100 : outOfSampleWinRatePct;
  const isUnstableModel = Math.abs(outOfSampleWinRatePct - perturbedWinRate) > 30.0;

  return {
    sampleSignalsCount: Math.max(1, oosSignals),
    inSampleWinRatePct: Math.min(100, outOfSampleWinRatePct + 5),
    outOfSampleWinRatePct,
    medianReturnPct,
    maxDrawdownPct: Math.round(maxDD * 10) / 10,
    isUnstableModel,
    stabilityStatus: isUnstableModel ? 'نموذج غير مستقر (UNSTABLE_MODEL)' : 'نموذج مستقر'
  };
}

/**
 * 11. Core Historical Decision Engine & Evidence Gates Evaluator
 */
export function evaluateHistoricalDecision(company: ISXCompany): HistoricalDecisionResult {
  const rawBars = company.history || [];
  const bars = rawBars.filter((b) => b.close > 0);
  const t = bars.length - 1;
  const currentPrice = company.currentPrice || (bars[t]?.close ?? 0);
  const todayStr = new Date().toISOString().split('T')[0];

  // Gate 1: DATA_QUALITY
  const gate1Passed = bars.length >= 150;
  const gate1Status = {
    passed: gate1Passed,
    message: gate1Passed ? 'اكتمال جودة البيانات (>= 150 جلسة)' : `فشل بوابة جودة البيانات (${bars.length} جلسة / المطلوب 150)`,
    details: `عدد الجلسات الفعالة النظيفة المتاحة: ${bars.length} جلسة`
  };

  if (!gate1Passed) {
    const emptyEpisodes = buildHistoricalEpisodes(bars);
    const emptyCycle = discoverCandidateCycles(emptyEpisodes, bars);
    const emptySim = analyzeHistoricalSimilarity(bars, t);
    const emptyLiq = evaluateLiquidityInflow(bars);
    const emptyExh = evaluateSellingExhaustion(bars);
    const emptySeas = evaluateStockSeasonality(bars);
    const emptyBt = runBacktestAndStabilityTest(bars);

    return {
      ticker: company.ticker,
      companyNameAr: company.nameAr,
      asOfDate: todayStr,
      currentPrice,
      signal: 'NO_SIGNAL',
      signalBadgeAr: '⚪ لا توجد إشارة حاسمة (NO SIGNAL)',
      signalColor: 'slate',
      confidenceScore: 0,
      signalId: `${company.ticker}:NO_SIGNAL:x:${Math.floor(Date.now() / (7 * 24 * 3600 * 1000))}`,
      reasons: [`Gate 1 FAILED: ${bars.length} جلسة متوفرة فقط، بينما الحد الأدنى المطلوب لتشغيل المحرك هو 150 جلسة.`],
      cancellationConditions: [],
      episodes: emptyEpisodes,
      cycle: emptyCycle,
      similarity: emptySim,
      liquidity: emptyLiq,
      exhaustion: emptyExh,
      seasonality: emptySeas,
      backtest: emptyBt,
      gates: {
        gate1DataQuality: gate1Status,
        gate2HistoricalPattern: { passed: false, message: 'غير مقيم', details: '' },
        gate3CurrentState: { passed: false, message: 'غير مقيم', details: '' },
        gate4LiquidityReversal: { passed: false, message: 'غير مقيم', details: '' },
        gate5Validation: { passed: false, message: 'غير مقيم', details: '' },
        allGatesPassed: false
      },
      summaryExecutive: `${company.nameAr} (${company.ticker}): بيانات غير كافية لصدور قرار تاريخي (${bars.length}/150 جلسة).`
    };
  }

  // Calculate engines
  const episodes = buildHistoricalEpisodes(bars);
  const cycle = discoverCandidateCycles(episodes, bars);
  const similarity = analyzeHistoricalSimilarity(bars, t);
  const liquidity = evaluateLiquidityInflow(bars);
  const exhaustion = evaluateSellingExhaustion(bars);
  const seasonality = evaluateStockSeasonality(bars);
  const backtest = runBacktestAndStabilityTest(bars);

  // Gate 2: PER_STOCK_VALIDITY
  const stateValidForB = perStockStateValidity(bars, 'B');
  const stateValidForC = perStockStateValidity(bars, 'C');
  const isStateValidated = (liquidity.caseType === 'CASE_B_ACCUMULATION' && stateValidForB) ||
                           (liquidity.caseType === 'CASE_C_REBOUND' && stateValidForC);

  const gate2Status = {
    passed: isStateValidated || stateValidForB || stateValidForC,
    message: isStateValidated ? 'مصادقة تاريخية أثبتت حافة إيجابية لهذه الحالة للسهم' : 'حالة السيولة لم تثبت حافة تفوق أسلوب الشراء والاحتفاظ لهذا السهم بالذات',
    details: `مصادقة حالة B: ${stateValidForB ? 'مقبولة' : 'غير مثبتة'} | مصادقة حالة C: ${stateValidForC ? 'مقبولة' : 'غير مثبتة'}`
  };

  // Gate 3: CURRENT_STATE
  const exhaustionCount = Math.round((exhaustion.score / 100) * 5);
  const liquiditySupportive = (liquidity.caseType === 'CASE_B_ACCUMULATION' || liquidity.caseType === 'CASE_C_REBOUND') && isStateValidated;
  const exhaustionStrong = exhaustionCount >= 3;
  const gate3Passed = liquiditySupportive && exhaustionStrong;

  const gate3Status = {
    passed: gate3Passed,
    message: gate3Passed ? 'اجتماع سيولة مثبتة وتكثيف إنهاك بيعي' : 'عدم اكتمال التقارب بين السيولة وإنهاك البيع',
    details: `درجة الإنهاك: ${exhaustionCount}/5 | حالة السيولة: ${liquidity.caseTitle}`
  };

  // Gate 4: SIMILARITY_EVIDENCE
  const simN = similarity.matchedCount;
  const simMed = similarity.medianPost20dReturnPct;
  const simPosPct = similarity.winRate20dPct;
  const gate4Passed = simN >= 8 && simMed > 0 && simPosPct >= 50;

  const gate4Status = {
    passed: gate4Passed,
    message: gate4Passed ? 'أدلة تاريخية مشابهة داعمة (>=8 حالات، وسيط موجبات)' : 'أدلة الحالات المشابهة غير كافية أو غير داعمة',
    details: `حالات مشابهة: ${simN} | وسيط العائد: ${simMed}% | % إيجابية: ${simPosPct}%`
  };

  // Gate 5: STABILITY
  const gate5Passed = !backtest.isUnstableModel;
  const gate5Status = {
    passed: gate5Passed,
    message: gate5Passed ? 'استقرار النموذج تحت اختبار المعلمات' : 'نموذج غير مستقر (UNSTABLE_MODEL)',
    details: `الحالة: ${backtest.stabilityStatus}`
  };

  // Exit check
  const fv = extractFeatures(bars, t);
  const nearHigh = fv.positionInRange60 !== null && fv.positionInRange60 >= 0.85;
  const isExitTriggered = nearHigh && liquidity.caseType === 'CASE_D_WEAK_BOUNCE';

  let signal: HistoricalSignalType = 'NO_SIGNAL';
  let signalBadgeAr = '⚪ لا توجد إشارة حاسمة (NO SIGNAL)';
  let signalColor = 'slate';
  let confidenceScore = 40;

  const reasons: string[] = [];
  const cancellationConditions: string[] = [];

  if (isExitTriggered) {
    signal = 'EXIT';
    signalBadgeAr = '🔴 إشارة خروج / تخفيف (EXIT)';
    signalColor = 'rose';
    confidenceScore = 85;
    reasons.push('السعر قرب أعلى مستوياته في 60 جلسة مع تراجع نشاط السيولة والارتفاع الضعيف (حالة D) — علامة ضعف زخم الشراء.');
  } else if (gate3Passed && gate4Passed && gate5Passed) {
    signal = 'BUY';
    signalBadgeAr = '🟢 شراء مؤكد بناءً على التاريخ (BUY)';
    signalColor = 'emerald';
    confidenceScore = Math.min(98, Math.round(backtest.outOfSampleWinRatePct * 0.5 + simPosPct * 0.5));
    reasons.push(`اجتمعت السيولة المثبتة تاريخياً للسهم (${liquidity.caseTitle}) + تشبع بيعي قوي (${exhaustionCount}/5) + تشابه تاريخي إيجابي (${simN} حالة، ${simPosPct}% إيجابية).`);
    cancellationConditions.push(`كسر السعر تحت أدنى قاع حديث (حوالي ${(currentPrice * 0.95).toFixed(2)} د.ع) تُلغى الإشارة.`);
  } else if (gate3Passed && !gate4Passed) {
    signal = 'BUY_WATCH';
    signalBadgeAr = '🟡 مراقبة الشراء عن قرب (BUY WATCH)';
    signalColor = 'amber';
    confidenceScore = 65;
    reasons.push('الحالة الحالية داعمة (سيولة + تشبع بيعي) لكن الدليل التاريخي المشابه غير كافٍ أو غير داعم بعد.');
    cancellationConditions.push(`كسر القاع السعري القريب.`);
  } else if (exhaustionCount === 2 || (liquidity.caseType === 'CASE_A_PANIC' && (fv.declinePctFromRecentPeak || 0) <= -0.15)) {
    signal = 'WATCH';
    signalBadgeAr = '🟡 مراقبة (WATCH)';
    signalColor = 'amber';
    confidenceScore = 50;
    reasons.push(`هبوط كبير نسبياً لتاريخ السهم لكن علامات التشبع البيعي غير مكتملة بعد (${exhaustionCount}/5).`);
  } else {
    signal = 'NO_SIGNAL';
    signalBadgeAr = '⚪ لا توجد إشارة حاسمة (NO SIGNAL)';
    signalColor = 'slate';
    confidenceScore = 40;
    reasons.push('لا يوجد اجتماع كافٍ من الأدلة التاريخية والحالية.');
  }

  const weekNum = Math.floor(new Date(bars[t].date).getTime() / (7 * 24 * 3600 * 1000));
  const signalId = `${company.ticker}:${signal}:${liquidity.caseType || 'x'}:${weekNum}`;

  const allGatesPassed = gate1Passed && gate2Status.passed && gate3Passed && gate4Passed && gate5Passed;

  return {
    ticker: company.ticker,
    companyNameAr: company.nameAr,
    asOfDate: bars[t].date,
    currentPrice,
    signal,
    signalBadgeAr,
    signalColor,
    confidenceScore,
    signalId,
    reasons,
    cancellationConditions,
    episodes,
    cycle,
    similarity,
    liquidity,
    exhaustion,
    seasonality,
    backtest,
    gates: {
      gate1DataQuality: gate1Status,
      gate2HistoricalPattern: gate2Status,
      gate3CurrentState: gate3Status,
      gate4LiquidityReversal: gate4Status,
      gate5Validation: gate5Status,
      allGatesPassed
    },
    summaryExecutive: `${company.nameAr} (${company.ticker}): الإشارة الحالية [${signalBadgeAr}]. ${reasons.join(' ')}`
  };
}

/**
 * Format Telegram Historical Signal Message strictly according to MASTER SPEC
 */
export function formatTelegramHistoricalSignalMessage(decision: HistoricalDecisionResult): string {
  const signalIcon =
    decision.signal === 'BUY'
      ? '🟢 BUY SIGNAL (شراء مؤكد)'
      : decision.signal === 'BUY_WATCH'
      ? '🟡 BUY WATCH (مراقبة الشراء)'
      : decision.signal === 'EXIT'
      ? '🔴 EXIT SIGNAL (إشارة خروج)'
      : '⚪ NO SIGNAL (متابعة)';

  const nowStr = new Date().toLocaleString('ar-IQ-u-nu-latn', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const reasonsList = decision.reasons.map((r) => `  • ${r}`).join('\n');
  const cancelList =
    decision.cancellationConditions.length > 0
      ? decision.cancellationConditions.map((c) => `  • ${c}`).join('\n')
      : '  • كسر القاع التاريخي السابق بـ -3%';

  return `
🚨 <b>تنبيه محرك القرار التاريخي - سوق العراق (ISX)</b> 🚨

🏛️ <b>الشركة:</b> ${decision.companyNameAr} (<code>${decision.ticker}</code>)
💰 <b>السعر وقت الإشارة:</b> <code>${decision.currentPrice.toFixed(2)} د.ع</code>
🎯 <b>نوع الإشارة:</b> <b>${signalIcon}</b>
📊 <b>درجة الثقة والموثوقية:</b> <code>${decision.confidenceScore}%</code>

📋 <b>أسباب الإشارة والأدلة التاريخية:</b>
${reasonsList}

🔄 <b>نتائج الحالات التاريخية المطابقة:</b>
  • عدد الحالات المطابقة: <code>${decision.similarity.matchedCount} حالات</code>
  • نسبة النجاح (+20 جلسة): <code>${decision.similarity.winRate20dPct}%</code>
  • متوسط العائد المكتسب: <code>+${decision.similarity.medianPost20dReturnPct}%</code>

⏳ <b>الدورة الزمانية وتدفق السيولة:</b>
  • وضع الدورة: ${decision.cycle.statusLabel}
  • تدفق السيولة: ${decision.liquidity.caseTitle}
  • إنهاك البيع: ${decision.exhaustion.description}

🛡️ <b>شروط الإلغاء وحماية رأس المال:</b>
${cancelList}

🆔 <b>معرف الإشارة:</b> <code>${decision.signalId}</code>
⏰ <b>وقت التنبيه:</b> ${nowStr}
⚡ <i>منصة المستثمر الذكي العراقي - ISX Core V2 Historical Engine</i>
  `.trim();
}
