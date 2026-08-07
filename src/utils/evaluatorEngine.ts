import {
  DailyBar,
  DynamicWeights,
  NonIraqiTradingData,
  RatingTier,
  ScoreBreakdown,
  StockEvaluation,
  SupportResistanceLevel,
  TechnicalIndicators,
  TrendAnalysis,
  TrendLevel,
  TrendLevelDetails,
  ConfirmedMajorMove,
  MajorMovesStats,
  ConfidenceScore,
  ExecutiveSummaryContent,
  IndicatorExplanation,
  TechnicalReportData,
  CoreV22Systems,
  convertScoreToStars
} from '../types/isx';

/**
 * Deterministic Evaluator Engine (Core V2 - Document 3 Part 2)
 * Handles Trend Engine, Support/Resistance Discovery, ZigZag Major Moves,
 * Subcomponents Scoring, Dynamic Weights Composite Score, and Star Ratings.
 */

/**
 * Deterministic Trend Level Classification
 * Evaluates price difference from SMA and SMA 5-session slope, rounded to 4 decimal places.
 */
export function classifyTrendLevel(price: number, sma: number, prevSMA5: number): TrendLevelDetails {
  if (!sma || sma === 0) {
    return { level: 'جانبي', priceDiffPct: 0, slopePct: 0 };
  }

  const priceDiffPct = Math.round(((price - sma) / sma) * 100 * 10000) / 10000;
  const slopePct = prevSMA5 > 0 ? Math.round(((sma - prevSMA5) / prevSMA5) * 100 * 10000) / 10000 : 0;

  let level: TrendLevel = 'هابط';

  // Strict Evaluation Order per Document 3 Part 2:
  if (Math.abs(priceDiffPct) <= 0.5 && Math.abs(slopePct) <= 0.5) {
    level = 'جانبي';
  } else if (priceDiffPct > 3.0 && slopePct > 1.0) {
    level = 'صاعد قوي';
  } else if (priceDiffPct > 0.5) {
    level = 'صاعد';
  } else if (priceDiffPct < -3.0 && slopePct < -1.0) {
    level = 'هابط قوي';
  } else {
    level = 'هابط';
  }

  return { level, priceDiffPct, slopePct };
}

/**
 * Support & Resistance Discovery Algorithm
 */
export function discoverSupportResistance(
  bars: DailyBar[],
  currentPrice: number,
  indicators: TechnicalIndicators
): { supports: SupportResistanceLevel[]; resistances: SupportResistanceLevel[] } {
  const activeBars = bars.filter((b) => (b.volume > 0 || b.trades > 0) && b.close > 0);
  if (activeBars.length < 5 || currentPrice <= 0) {
    return { supports: [], resistances: [] };
  }

  // Focus scan on recent 250 trading bars (approx 1 year) if available
  const recentWindow = activeBars.length > 30 ? activeBars.slice(-250) : activeBars;

  const avgVol20 =
    recentWindow.slice(-20).reduce((a, b) => a + b.volume, 0) / Math.min(20, recentWindow.length);

  // Step 1: Detect Local Peaks and Troughs (window = 2 bars each side)
  const peaksAndTroughs: { price: number; volume: number }[] = [];
  for (let i = 2; i < recentWindow.length - 2; i++) {
    const p = recentWindow[i].close;
    const isPeak =
      p >= recentWindow[i - 1].close &&
      p >= recentWindow[i - 2].close &&
      p >= recentWindow[i + 1].close &&
      p >= recentWindow[i + 2].close;

    const isTrough =
      p <= recentWindow[i - 1].close &&
      p <= recentWindow[i - 2].close &&
      p <= recentWindow[i + 1].close &&
      p <= recentWindow[i + 2].close;

    if (isPeak || isTrough) {
      peaksAndTroughs.push({ price: p, volume: recentWindow[i].volume });
    }
  }

  // Step 2: Cluster nearby levels (within 1.5%)
  peaksAndTroughs.sort((a, b) => a.price - b.price);
  const clusters: { prices: number[]; volumes: number[] }[] = [];

  for (const pt of peaksAndTroughs) {
    let added = false;
    for (const cluster of clusters) {
      const basePrice = cluster.prices[0];
      if (Math.abs(pt.price - basePrice) / basePrice <= 0.015) {
        cluster.prices.push(pt.price);
        cluster.volumes.push(pt.volume);
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ prices: [pt.price], volumes: [pt.volume] });
    }
  }

  // Step 3: Score levels and determine strength
  const fib = indicators.fibonacci;
  const fibLevels = [fib.fib236, fib.fib382, fib.fib500, fib.fib618, fib.fib786];
  const smaLevels = [indicators.sma20, indicators.sma50, indicators.sma200];

  const levels: SupportResistanceLevel[] = clusters.map((cluster) => {
    const avgPrice = Number((cluster.prices.reduce((a, b) => a + b, 0) / cluster.prices.length).toFixed(2));
    const bounceCount = cluster.prices.length;

    let score = 0;
    if (bounceCount >= 3) score += 2;
    else if (bounceCount === 2) score += 1;

    const nearSMA = smaLevels.some((s) => s > 0 && Math.abs(avgPrice - s) / s <= 0.015);
    if (nearSMA) score += 1;

    const nearFibonacci = fibLevels.some((f) => f > 0 && Math.abs(avgPrice - f) / f <= 0.015);
    if (nearFibonacci) score += 1;

    const highVolume = cluster.volumes.some((v) => avgVol20 > 0 && v >= avgVol20 * 1.3);
    if (highVolume) score += 1;

    let strengthLabel: SupportResistanceLevel['strengthLabel'] = 'ضعيف';
    if (score >= 4) strengthLabel = 'قوي جداً';
    else if (score === 3) strengthLabel = 'قوي';
    else if (score >= 1) strengthLabel = 'متوسط';

    const type: 'دعم' | 'مقاومة' = avgPrice < currentPrice ? 'دعم' : 'مقاومة';

    return {
      price: avgPrice,
      type,
      bounceCount,
      score,
      strengthLabel,
      nearSMA,
      nearFibonacci,
      highVolume
    };
  });

  // Extract raw supports (< currentPrice) and resistances (> currentPrice)
  let rawSupports = levels.filter((l) => l.price < currentPrice - 0.001);
  let rawResistances = levels.filter((l) => l.price > currentPrice + 0.001);

  // Sort supports descending (highest price below currentPrice comes first)
  rawSupports.sort((a, b) => b.price - a.price);

  // Sort resistances ascending (lowest price above currentPrice comes first)
  rawResistances.sort((a, b) => a.price - b.price);

  // Eliminate duplicates that are too close
  const uniqueSupports: SupportResistanceLevel[] = [];
  for (const s of rawSupports) {
    if (!uniqueSupports.some((existing) => Math.abs(existing.price - s.price) < 0.005)) {
      uniqueSupports.push(s);
    }
  }

  const uniqueResistances: SupportResistanceLevel[] = [];
  for (const r of rawResistances) {
    if (!uniqueResistances.some((existing) => Math.abs(existing.price - r.price) < 0.005)) {
      uniqueResistances.push(r);
    }
  }

  // Fallback using Pivots & Fibs if insufficient supports (<3)
  const pivot = indicators.pivots;
  if (uniqueSupports.length < 3 && pivot) {
    const candidates = [pivot.s1, pivot.s2, pivot.s3, fib.fib382, fib.fib500, fib.fib618]
      .filter((p) => p > 0 && p < currentPrice - 0.001)
      .map((p) => Number(p.toFixed(2)));
    for (const p of candidates) {
      if (p < currentPrice - 0.001 && !uniqueSupports.some((s) => Math.abs(s.price - p) < 0.005)) {
        uniqueSupports.push({
          price: p,
          type: 'دعم',
          bounceCount: 2,
          score: 2,
          strengthLabel: 'متوسط',
          nearSMA: false,
          nearFibonacci: true,
          highVolume: false
        });
      }
    }
  }

  // Guarantee at least 3 valid supports below currentPrice
  const defaultSupOffsets = [0.95, 0.90, 0.85];
  let supIdx = 0;
  while (uniqueSupports.length < 3) {
    const calcP = Number((currentPrice * defaultSupOffsets[supIdx % 3]).toFixed(2));
    if (calcP < currentPrice - 0.001 && !uniqueSupports.some((s) => Math.abs(s.price - calcP) < 0.005)) {
      uniqueSupports.push({
        price: calcP,
        type: 'دعم',
        bounceCount: 2,
        score: 1,
        strengthLabel: 'متوسط',
        nearSMA: false,
        nearFibonacci: false,
        highVolume: false
      });
    }
    supIdx++;
    if (supIdx > 10) break;
  }
  uniqueSupports.sort((a, b) => b.price - a.price);

  // Fallback using Pivots & Fibs if insufficient resistances (<3)
  if (uniqueResistances.length < 3 && pivot) {
    const candidates = [pivot.r1, pivot.r2, pivot.r3, fib.ext127, fib.ext161]
      .filter((p) => p > currentPrice + 0.001)
      .map((p) => Number(p.toFixed(2)));
    for (const p of candidates) {
      if (p > currentPrice + 0.001 && !uniqueResistances.some((r) => Math.abs(r.price - p) < 0.005)) {
        uniqueResistances.push({
          price: p,
          type: 'مقاومة',
          bounceCount: 2,
          score: 2,
          strengthLabel: 'متوسط',
          nearSMA: false,
          nearFibonacci: true,
          highVolume: false
        });
      }
    }
  }

  // Guarantee at least 3 valid resistances above currentPrice
  const defaultResOffsets = [1.05, 1.10, 1.15];
  let resIdx = 0;
  while (uniqueResistances.length < 3) {
    const calcP = Number((currentPrice * defaultResOffsets[resIdx % 3]).toFixed(2));
    if (calcP > currentPrice + 0.001 && !uniqueResistances.some((r) => Math.abs(r.price - calcP) < 0.005)) {
      uniqueResistances.push({
        price: calcP,
        type: 'مقاومة',
        bounceCount: 2,
        score: 1,
        strengthLabel: 'متوسط',
        nearSMA: false,
        nearFibonacci: false,
        highVolume: false
      });
    }
    resIdx++;
    if (resIdx > 10) break;
  }
  uniqueResistances.sort((a, b) => a.price - b.price);

  const supports = uniqueSupports.slice(0, 3);
  const resistances = uniqueResistances.slice(0, 3);

  return { supports, resistances };
}

/**
 * Confirmed Major Moves Algorithm (ZigZag 8% Threshold for ISX)
 */
export function calculateMajorMoves(bars: DailyBar[]): {
  moves: ConfirmedMajorMove[];
  stats: MajorMovesStats;
} {
  const activeBars = [...bars]
    .filter((b) => (b.volume > 0 || b.trades > 0) && b.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeBars.length < 5) {
    return {
      moves: [],
      stats: { avgBullishPct: 0, avgBearishPct: 0, avgBearishActiveDays: 0 }
    };
  }

  const moves: ConfirmedMajorMove[] = [];
  let trackingDir: 'صعود' | 'هبوط' | 'none' = 'none';

  let startBar = activeBars[0];
  let tempPeakBar = activeBars[0];
  let tempTroughBar = activeBars[0];
  let startIndex = 0;

  for (let i = 1; i < activeBars.length; i++) {
    const bar = activeBars[i];
    const changeFromStart = (bar.close - startBar.close) / startBar.close;

    if (trackingDir === 'none') {
      if (changeFromStart >= 0.08) {
        trackingDir = 'صعود';
        tempPeakBar = bar;
      } else if (changeFromStart <= -0.08) {
        trackingDir = 'هبوط';
        tempTroughBar = bar;
      }
    } else if (trackingDir === 'صعود') {
      if (bar.close > tempPeakBar.close) {
        tempPeakBar = bar;
      } else if (bar.close <= tempPeakBar.close * 0.92) {
        // Confirmed reversal
        moves.push({
          type: 'صعود',
          startDate: startBar.date,
          startPrice: startBar.close,
          endDate: tempPeakBar.date,
          endPrice: tempPeakBar.close,
          changePct: ((tempPeakBar.close - startBar.close) / startBar.close) * 100,
          activeTradingDays: Math.max(1, i - startIndex)
        });
        startBar = tempPeakBar;
        startIndex = i;
        tempTroughBar = bar;
        trackingDir = 'هبوط';
      }
    } else if (trackingDir === 'هبوط') {
      if (bar.close < tempTroughBar.close) {
        tempTroughBar = bar;
      } else if (bar.close >= tempTroughBar.close * 1.08) {
        // Confirmed reversal
        moves.push({
          type: 'هبوط',
          startDate: startBar.date,
          startPrice: startBar.close,
          endDate: tempTroughBar.date,
          endPrice: tempTroughBar.close,
          changePct: ((tempTroughBar.close - startBar.close) / startBar.close) * 100,
          activeTradingDays: Math.max(1, i - startIndex)
        });
        startBar = tempTroughBar;
        startIndex = i;
        tempPeakBar = bar;
        trackingDir = 'صعود';
      }
    }
  }

  const bullishMoves = moves.filter((m) => m.type === 'صعود');
  const bearishMoves = moves.filter((m) => m.type === 'هبوط');

  const avgBullishPct =
    bullishMoves.length > 0
      ? bullishMoves.reduce((s, m) => s + m.changePct, 0) / bullishMoves.length
      : 0;

  const avgBearishPct =
    bearishMoves.length > 0
      ? bearishMoves.reduce((s, m) => s + Math.abs(m.changePct), 0) / bearishMoves.length
      : 0;

  const avgBearishActiveDays =
    bearishMoves.length > 0
      ? bearishMoves.reduce((s, m) => s + m.activeTradingDays, 0) / bearishMoves.length
      : 0;

  return {
    moves: moves.reverse().slice(0, 5), // Newest 5
    stats: {
      avgBullishPct,
      avgBearishPct,
      avgBearishActiveDays
    }
  };
}

/**
 * Core Evaluator Engine: Returns complete StockEvaluation object
 */
export function evaluateStock(
  currentPrice: number,
  indicators: TechnicalIndicators,
  nonIraqi: NonIraqiTradingData,
  history: DailyBar[] = []
): StockEvaluation {
  const activeBars = history.filter((b) => b.volume > 0 || b.trades > 0);

  // 1. Trend Analysis Engine
  const lastSMA20 = indicators.sma20;
  const lastSMA50 = indicators.sma50;
  const lastSMA200 = indicators.sma200;

  const prev5SMA20 = activeBars.length >= 5 ? activeBars[activeBars.length - 5].close : lastSMA20;
  const prev5SMA50 = activeBars.length >= 5 ? activeBars[activeBars.length - 5].close : lastSMA50;
  const prev5SMA200 = activeBars.length >= 5 ? activeBars[activeBars.length - 5].close : lastSMA200;

  const shortTerm = classifyTrendLevel(currentPrice, lastSMA20, prev5SMA20);
  const mediumTerm = classifyTrendLevel(currentPrice, lastSMA50, prev5SMA50);
  const longTerm = classifyTrendLevel(currentPrice, lastSMA200, prev5SMA200);

  let alignment: TrendAnalysis['alignment'] = 'مرحلة انتقالية / تباين';
  if (
    shortTerm.level.includes('صاعد') &&
    mediumTerm.level.includes('صاعد') &&
    longTerm.level.includes('صاعد')
  ) {
    alignment = 'توافق صاعد تام';
  } else if (
    shortTerm.level.includes('هابط') &&
    mediumTerm.level.includes('هابط') &&
    longTerm.level.includes('هابط')
  ) {
    alignment = 'توافق هابط تام';
  }

  // Trend Strength Score
  const slopeScore = Math.min(100, (Math.abs(mediumTerm.slopePct) / 10) * 100);
  const adxScore = Math.min(100, Math.max(0, indicators.adx14));
  const volScore = Math.min(100, (indicators.volumeRatio20 / 2) * 100);

  const last20ValueAvg =
    activeBars.slice(-20).reduce((s, b) => s + b.value, 0) / Math.max(1, Math.min(20, activeBars.length));
  const last20TradesAvg =
    activeBars.slice(-20).reduce((s, b) => s + b.trades, 0) / Math.max(1, Math.min(20, activeBars.length));

  const liquidityValNorm = Math.min(100, (last20ValueAvg / 100_000_000) * 100);
  const liquidityTradesNorm = Math.min(100, (last20TradesAvg / 100) * 100);
  const liquidityScore = Math.min(100, liquidityValNorm * 0.6 + liquidityTradesNorm * 0.4);

  let consecutiveDays = 0;
  if (activeBars.length > 1) {
    const isUp = activeBars[activeBars.length - 1].close >= activeBars[activeBars.length - 2].close;
    for (let i = activeBars.length - 1; i >= 1; i--) {
      const up = activeBars[i].close >= activeBars[i - 1].close;
      if (up === isUp) consecutiveDays++;
      else break;
    }
  }
  const continuationScore = Math.min(100, (consecutiveDays / 10) * 100);

  const trendStrengthScore = Math.round(
    slopeScore * 0.3 + adxScore * 0.3 + volScore * 0.2 + liquidityScore * 0.1 + continuationScore * 0.1
  );

  const trendAnalysis: TrendAnalysis = {
    shortTerm,
    mediumTerm,
    longTerm,
    strengthScore: trendStrengthScore,
    alignment
  };

  // 2. Support & Resistance & Major Moves
  const { supports, resistances } = discoverSupportResistance(history, currentPrice, indicators);
  const { moves: recentMajorMoves, stats: majorMovesStats } = calculateMajorMoves(history);

  // 3. Subcomponents Scoring (0-100 each)
  let maCount = 0;
  if (currentPrice > lastSMA20) maCount++;
  if (currentPrice > lastSMA50) maCount++;
  if (currentPrice > lastSMA200) maCount++;

  const trendSubScore = Math.min(
    100,
    Math.round((maCount / 3) * 60 + Math.min(40, Math.max(0, ((mediumTerm.slopePct + 10) / 20) * 40)))
  );

  const macdHistPct = currentPrice > 0 ? (indicators.macdHist / currentPrice) * 100 : 0;
  const macdNorm = Math.min(100, Math.max(0, ((macdHistPct + 2) / 4) * 100));
  const momentumSubScore = Math.min(
    100,
    Math.round(indicators.rsi14 * 0.4 + indicators.stochasticRSI * 0.3 + macdNorm * 0.3)
  );

  const volRatioNorm = Math.min(100, (indicators.volumeRatio20 / 3) * 100);
  const obvBonus = indicators.obv > 0 ? 30 : 0;
  const volumeSubScore = Math.min(100, Math.round(volRatioNorm * 0.7 + obvBonus));

  let patternSubScore = 50; // Default neutral
  if (indicators.detectedPattern === 'اختراق مستوى مقاومة' || indicators.detectedPattern === 'قاع مزدوج صاعد') {
    patternSubScore = 80;
  } else if (indicators.detectedPattern === 'كسر مستوى دعم' || indicators.detectedPattern === 'قمة مزدوجة هابطة') {
    patternSubScore = 20;
  } else if (indicators.detectedPattern === 'نموذج علم صاعد') {
    patternSubScore = 75;
  }

  // Foreign investor trading subscore
  const hasForeignData = nonIraqi.buyValue + nonIraqi.sellValue > 0;
  let foreignSubScore = 50;
  if (hasForeignData) {
    const netVal = nonIraqi.netValue;
    const totalVal = nonIraqi.buyValue + nonIraqi.sellValue;
    foreignSubScore = Math.min(100, Math.max(0, Math.round(50 + (netVal / totalVal) * 50)));
  }

  // 4. Dynamic Market State & Weight Distribution
  let marketState: StockEvaluation['marketState'] = 'عادية';
  if (indicators.adx14 < 20) {
    marketState = 'سوق جانبي';
  } else if (indicators.adx14 >= 25 && Math.abs(mediumTerm.slopePct) >= 3.0) {
    marketState = 'اتجاه قوي';
  }

  let weights: DynamicWeights = {
    trend: 0.28,
    momentum: 0.18,
    volume: 0.14,
    liquidity: 0.14,
    pattern: 0.08,
    foreign: 0.18
  };

  if (marketState === 'سوق جانبي') {
    weights.trend = 0.22;
    weights.liquidity = 0.2;
  } else if (marketState === 'اتجاه قوي') {
    weights.momentum = 0.12;
    weights.trend = 0.34;
  }

  // Redistribution if foreign data is absent
  if (!hasForeignData) {
    const foreignW = weights.foreign;
    weights.foreign = 0;
    const remainingSum = weights.trend + weights.momentum + weights.volume + weights.liquidity + weights.pattern;

    if (remainingSum > 0) {
      weights.trend += foreignW * (weights.trend / remainingSum);
      weights.momentum += foreignW * (weights.momentum / remainingSum);
      weights.volume += foreignW * (weights.volume / remainingSum);
      weights.liquidity += foreignW * (weights.liquidity / remainingSum);
      weights.pattern += foreignW * (weights.pattern / remainingSum);
    }
  }

  // Composite Score
  const compositeScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        trendSubScore * weights.trend +
          momentumSubScore * weights.momentum +
          volumeSubScore * weights.volume +
          liquidityScore * weights.liquidity +
          patternSubScore * weights.pattern +
          foreignSubScore * weights.foreign
      )
    )
  );

  const scoreBreakdown: ScoreBreakdown = {
    trendScore: trendSubScore,
    momentumScore: momentumSubScore,
    volumeScore: volumeSubScore,
    liquidityScore: Math.round(liquidityScore),
    patternScore: patternSubScore,
    foreignScore: foreignSubScore,
    total: compositeScore
  };

  // 5. Star Rating & Interpretation
  let stars = 3;
  let compositeInterpretation = 'محايد مائل للإيجابية';

  if (compositeScore >= 90) {
    stars = 5;
    compositeInterpretation = 'قوة فنية استثنائية';
  } else if (compositeScore >= 75) {
    stars = 4;
    compositeInterpretation = 'قوة مرتفعة';
  } else if (compositeScore >= 60) {
    stars = 3;
    compositeInterpretation = 'إيجابي';
  } else if (compositeScore >= 40) {
    stars = 2;
    compositeInterpretation = 'محايد مائل للإيجابية';
  } else if (compositeScore >= 35) {
    stars = 1;
    compositeInterpretation = 'ضعيف';
  } else {
    stars = 1;
    compositeInterpretation = 'ضعيف جداً';
  }

  // Rating Tier & Colors
  let tier: RatingTier = 'محايد';
  let badgeBg = 'bg-zinc-200 border-zinc-300';
  let badgeTextColor = 'text-zinc-800';

  if (compositeScore >= 80) {
    tier = 'ممتاز';
    badgeBg = 'bg-emerald-100 border-emerald-300';
    badgeTextColor = 'text-emerald-800';
  } else if (compositeScore >= 75) {
    tier = 'جيد جداً';
    badgeBg = 'bg-teal-100 border-teal-300';
    badgeTextColor = 'text-teal-800';
  } else if (compositeScore >= 60) {
    tier = 'جيد';
    badgeBg = 'bg-blue-100 border-blue-300';
    badgeTextColor = 'text-blue-800';
  } else if (compositeScore >= 40) {
    tier = 'محايد';
    badgeBg = 'bg-zinc-200 border-zinc-300';
    badgeTextColor = 'text-zinc-800';
  } else if (compositeScore >= 35) {
    tier = 'ضعيف';
    badgeBg = 'bg-amber-100 border-amber-300';
    badgeTextColor = 'text-amber-800';
  } else {
    tier = 'ضعيف جداً';
    badgeBg = 'bg-rose-100 border-rose-300';
    badgeTextColor = 'text-rose-800';
  }

  // Confidence Score
  let confidenceScore: ConfidenceScore = 'جيد';
  if (activeBars.length >= 60 && hasForeignData && indicators.indicatorStatuses.rsi14 === 'صالح') {
    confidenceScore = 'مرتفع';
  } else if (activeBars.length < 20) {
    confidenceScore = 'منخفض';
  } else if (activeBars.length < 40 || !hasForeignData) {
    confidenceScore = 'متوسط';
  }

  // Objective technical action note (Strictly avoiding buy/sell financial recommendations)
  let actionRecommendation = 'استقرار السعر داخل نطاق أفقي محايد؛ يُنصح بانتظار اختراق تأكيدي لمستويات الدعم والمقاومة.';
  if (compositeScore >= 75) {
    actionRecommendation = 'مؤشرات فنية إيجابية قوية تظهر ثبات السعر أعلى المستويات المحورية بدعم من أحجام التداول.';
  } else if (compositeScore < 40) {
    actionRecommendation = 'تراجع في المؤشرات الفنية وكسر لبعض المستويات المحورية يُوجب الحذر ومتابعة مستويات وقف الخسارة الفنية.';
  }

  // --- Document 4 Engine Deterministic Text Generator ---

  // 1. General Status Sentence
  let generalStatusSentence = '';
  if (compositeScore >= 80 && (mediumTerm.level === 'صاعد' || mediumTerm.level === 'صاعد قوي')) {
    generalStatusSentence = `السهم في وضع فني قوي، مدعوم باتجاه ${mediumTerm.level}.`;
  } else if (compositeScore >= 65) {
    generalStatusSentence = `السهم في وضع فني إيجابي عموماً، مع اتجاه ${mediumTerm.level}.`;
  } else if (compositeScore >= 50) {
    generalStatusSentence = `السهم في وضع فني محايد، مع ميل طفيف نحو ${mediumTerm.level}.`;
  } else if (compositeScore >= 35) {
    generalStatusSentence = `السهم في وضع فني ضعيف، مع اتجاه ${mediumTerm.level}.`;
  } else {
    generalStatusSentence = `السهم في وضع فني ضعيف جداً، مع اتجاه ${mediumTerm.level} واضح.`;
  }

  // 2. Composite Score Explanation List
  const compositeExplanations: string[] = [];
  if (trendSubScore >= 75) {
    compositeExplanations.push('قوة فنية مرتفعة');
  } else if (trendSubScore >= 60) {
    compositeExplanations.push('الاتجاه مستقر');
  } else if (trendSubScore < 40) {
    compositeExplanations.push('الاتجاه ضعيف');
  }

  if (volumeSubScore >= 65) {
    compositeExplanations.push('الحجم داعم');
  } else if (volumeSubScore < 40) {
    compositeExplanations.push('الحجم لا يدعم الحركة الحالية');
  }

  if (liquidityScore >= 65) {
    compositeExplanations.push('السيولة جيدة');
  } else if (liquidityScore < 40) {
    compositeExplanations.push('السيولة ضعيفة');
  }

  // 3. Confidence Score Explanation
  let confidenceExplanation: string | undefined = undefined;
  if (confidenceScore === 'منخفض' || confidenceScore === 'متوسط') {
    confidenceExplanation = 'يعكس جودة واكتمال البيانات المتاحة للتحليل وليس جودة السهم الذاتية.';
  }

  // 4. Trend Alignment Sentence
  let trendAlignmentSentence = '';
  const isAllMatched = shortTerm.level === mediumTerm.level && mediumTerm.level === longTerm.level;
  if (isAllMatched) {
    if (shortTerm.level === 'جانبي') {
      trendAlignmentSentence = 'الاتجاهات الثلاثة متوافقة على حالة جانبية، والسهم يمر بمرحلة تذبذب واضحة.';
    } else if (shortTerm.level.includes('صاعد')) {
      trendAlignmentSentence = 'الاتجاهات الثلاثة متوافقة مما يزيد موثوقية الحركة الصاعدة الحالية.';
    } else {
      trendAlignmentSentence = 'الاتجاهات الثلاثة متوافقة مما يزيد موثوقية الحركة الهابطة الحالية.';
    }
  } else {
    trendAlignmentSentence = 'الاتجاهات غير متوافقة عبر الفترات الثلاث، وهذا يشير إلى مرحلة انتقالية غير حاسمة.';
  }

  // 5. Executive Summary Content (Document 4 Part 2 Rules)
  let techStrengthTierText = 'محايدة';
  if (compositeScore >= 90) techStrengthTierText = 'استثنائية';
  else if (compositeScore >= 80) techStrengthTierText = 'مرتفعة';
  else if (compositeScore >= 65) techStrengthTierText = 'إيجابية';
  else if (compositeScore >= 50) techStrengthTierText = 'محايدة';
  else if (compositeScore >= 35) techStrengthTierText = 'ضعيفة';
  else techStrengthTierText = 'ضعيفة جداً';

  const lastBarVol = activeBars.length > 0 ? activeBars[activeBars.length - 1].volume : 0;
  const avgVol20 = activeBars.slice(-20).reduce((s, b) => s + b.volume, 0) / Math.max(1, Math.min(20, activeBars.length));
  const volDiffPct = avgVol20 > 0 ? ((lastBarVol - avgVol20) / avgVol20) * 100 : 0;

  let volSummaryText = 'طبيعي';
  if (volDiffPct >= 20) volSummaryText = 'يدعم الاتجاه';
  else if (volDiffPct <= -20) volSummaryText = 'لا يدعم الاتجاه حالياً';

  let liqSummaryText = 'متوسطة';
  if (liquidityScore >= 75) liqSummaryText = 'مرتفعة';
  else if (liquidityScore < 50) liqSummaryText = 'ضعيفة';

  const nearestSup = supports.length > 0 ? `${supports[0].price.toFixed(3)} د.ع` : 'غير محدد';
  const nearestRes = resistances.length > 0 ? `${resistances[0].price.toFixed(3)} د.ع` : 'غير محدد';

  const netVal = nonIraqi.netValue;
  const foreignSummaryText = netVal > 0 ? 'صافي شراء' : netVal < 0 ? 'صافي بيع' : 'توازن';

  const executiveSummary: ExecutiveSummaryContent = {
    technicalStrengthText: `${techStrengthTierText} (${compositeScore}/100)`,
    trendText: mediumTerm.level,
    volumeText: volSummaryText,
    liquidityText: liqSummaryText,
    hasForeignData,
    foreignText: hasForeignData ? foreignSummaryText : undefined,
    nearestSupportText: nearestSup,
    nearestResistanceText: nearestRes,
    confidenceText: confidenceScore
  };

  // 6. Indicators Table & Explanations (Deterministic Mapping)
  let rsiStatus = 'محايد';
  if (indicators.rsi14 >= 70) rsiStatus = 'تشبع شرائي';
  else if (indicators.rsi14 >= 55) rsiStatus = 'إيجابي';
  else if (indicators.rsi14 >= 45) rsiStatus = 'محايد';
  else if (indicators.rsi14 >= 30) rsiStatus = 'سلبي';
  else rsiStatus = 'تشبع بيعي';

  let macdStatus = 'محايد';
  if (indicators.macdSignalType === 'تقاطع إيجابي صاعد') macdStatus = 'تقاطع صاعد';
  else if (indicators.macdSignalType === 'تقاطع سلبي هابط') macdStatus = 'تقاطع هابط';
  else if (indicators.macdLine > indicators.macdSignal) macdStatus = 'إيجابي';
  else macdStatus = 'سلبي';

  const emaStatus = currentPrice > indicators.ema12 ? 'أعلى السعر' : 'أدنى السعر';

  let adxStatus = 'اتجاه ضعيف';
  if (indicators.adx14 >= 25) adxStatus = 'اتجاه قوي';
  else if (indicators.adx14 >= 20) adxStatus = 'اتجاه متوسط';

  const atrPct = currentPrice > 0 ? (indicators.atr14 / currentPrice) * 100 : 0;
  let atrStatus = 'تذبذب طبيعي';
  if (atrPct >= 4.0) atrStatus = 'تذبذب مرتفع';
  else if (atrPct < 1.5) atrStatus = 'تذبذب منخفض';

  const indicatorStatusesTable = {
    rsi: rsiStatus,
    macd: macdStatus,
    ema: emaStatus,
    adx: adxStatus,
    atr: atrStatus
  };

  // Indicator Explanations Deterministic Table
  const indicatorExplanations: IndicatorExplanation[] = [
    {
      name: 'RSI (مؤشر القوة النسبية)',
      status: rsiStatus,
      reason: rsiStatus === 'إيجابي'
        ? 'لا يوجد تشبع شراء أو بيع.'
        : rsiStatus === 'تشبع شرائي'
        ? 'السهم دخل منطقة تشبع شرائي.'
        : rsiStatus === 'تشبع بيعي'
        ? 'السهم دخل منطقة تشبع بيعي.'
        : rsiStatus === 'سلبي'
        ? 'RSI يقترب من منطقة التشبع البيعي.'
        : 'لا يوجد ميل واضح بقراءة RSI الحالية.',
      impact: rsiStatus === 'إيجابي'
        ? 'داعم للاتجاه.'
        : rsiStatus === 'تشبع شرائي'
        ? 'قد يشير لاحتمال تصحيح قريب.'
        : rsiStatus === 'تشبع بيعي'
        ? 'قد يشير لاحتمال ارتداد قريب.'
        : rsiStatus === 'سلبي'
        ? 'يضعف الثقة بالزخم الحالي.'
        : 'محايد التأثير.'
    },
    {
      name: 'MACD (تقاطع المتوسطات)',
      status: macdStatus,
      reason: macdStatus === 'تقاطع صاعد'
        ? 'خط MACD تجاوز خط الإشارة صعوداً.'
        : macdStatus === 'تقاطع هابط'
        ? 'خط MACD تجاوز خط الإشارة هبوطاً.'
        : macdStatus === 'إيجابي'
        ? 'خط MACD أعلى من خط الإشارة.'
        : 'خط MACD أدنى من خط الإشارة.',
      impact: macdStatus === 'تقاطع صاعد'
        ? 'إشارة دعم لبداية زخم صاعد.'
        : macdStatus === 'تقاطع هابط'
        ? 'إشارة تحذير من ضعف الزخم.'
        : macdStatus === 'إيجابي'
        ? 'داعم للاتجاه.'
        : 'غير داعم للاتجاه.'
    },
    {
      name: 'ADX (قوة الاتجاه)',
      status: adxStatus,
      reason: adxStatus === 'اتجاه قوي'
        ? 'قوة الاتجاه الحالي مرتفعة رياضياً.'
        : adxStatus === 'اتجاه متوسط'
        ? 'قوة الاتجاه الحالي متوسطة.'
        : 'لا يوجد اتجاه واضح المعالم حالياً.',
      impact: adxStatus === 'اتجاه قوي'
        ? 'يزيد موثوقية استمرار الاتجاه.'
        : adxStatus === 'اتجاه متوسط'
        ? 'موثوقية معتدلة لاستمرار الاتجاه.'
        : 'يقلل من موثوقية أي إشارة اتجاهية.'
    },
    {
      name: 'EMA 12 (المتوسط المتحرك)',
      status: emaStatus,
      reason: emaStatus === 'أعلى السعر'
        ? 'السعر يتداول أعلى المتوسط المتحرك الأسّي.'
        : 'السعر يتداول أدنى المتوسط المتحرك الأسّي.',
      impact: emaStatus === 'أعلى السعر'
        ? 'يدعم المسار الصاعد.'
        : 'يدعم المسار الهابط.'
    },
    {
      name: 'ATR (مقياس التذبذب)',
      status: atrStatus,
      reason: atrStatus === 'تذبذب مرتفع'
        ? 'النطاق السعري اليومي واسع مقارنة بالمتوسط.'
        : atrStatus === 'تذبذب منخفض'
        ? 'النطاق السعري ضيق ومستقر.'
        : 'معدل التذبذب ضمن الحدود الطبيعية.',
      impact: atrStatus === 'تذبذب مرتفع'
        ? 'يزيد المخاطر الفنية والمجال الحركي.'
        : atrStatus === 'تذبذب منخفض'
        ? 'يشير لاستقرار الحركة وتحضير لحركة جديدة.'
        : 'محايد على الحركة السعرية.'
    }
  ];

  // 7. Trend Detailed Explanation Paragraph (Doc 4 Part 2)
  const lastMove = recentMajorMoves.length > 0 ? recentMajorMoves[0] : null;
  const moveActiveDays = lastMove ? lastMove.activeTradingDays : 10;
  const moveStartDate = lastMove ? lastMove.startDate : (activeBars[0]?.date || 'سابقاً');

  const sentence1 = `بدأ الاتجاه الحالي منذ ${moveActiveDays} جلسة تداول فعلية (بتاريخ ${moveStartDate}).`;

  // Compare trend strength 5 bars ago
  const activeBars5Ago = activeBars.slice(0, Math.max(1, activeBars.length - 5));
  const price5Ago = activeBars5Ago.length > 0 ? activeBars5Ago[activeBars5Ago.length - 1].close : currentPrice;
  const move5Pct = price5Ago > 0 ? ((currentPrice - price5Ago) / price5Ago) * 100 : 0;
  
  let sentence2 = 'قوة الاتجاه مستقرة نسبياً مقارنة بالفترة السابقة.';
  if (mediumTerm.level.includes('صاعد') && move5Pct >= 2.0) {
    sentence2 = 'قوة الاتجاه تزداد مقارنة بالفترة السابقة.';
  } else if (mediumTerm.level.includes('صاعد') && move5Pct <= -2.0) {
    sentence2 = 'قوة الاتجاه بدأت تضعف مقارنة بالفترة السابقة.';
  } else if (mediumTerm.level.includes('هابط') && move5Pct <= -2.0) {
    sentence2 = 'قوة الاتجاه الهابط تزداد مقارنة بالفترة السابقة.';
  } else if (mediumTerm.level.includes('هابط') && move5Pct >= 2.0) {
    sentence2 = 'قوة الاتجاه الهابط بدأت تضعف مقارنة بالفترة السابقة.';
  }

  let sentence3 = 'لا توجد إشارة حالية على احتمال انعكاس وشيك، بناءً على المؤشرات الفنية المتوفرة.';
  if (mediumTerm.level.includes('صاعد') && resistances.length > 0) {
    const dist = ((resistances[0].price - currentPrice) / currentPrice) * 100;
    if (dist <= 3.0 && dist >= -1.0 && (resistances[0].strengthLabel === 'قوي' || resistances[0].strengthLabel === 'قوي جداً')) {
      sentence3 = `يوجد احتمال انعكاس قريب، نظراً لاقتراب السعر من مستوى مقاومة قوي (المسافة ${Math.max(0, dist).toFixed(1)}%).`;
    }
  } else if (mediumTerm.level.includes('هابط') && supports.length > 0) {
    const dist = ((currentPrice - supports[0].price) / currentPrice) * 100;
    if (dist <= 3.0 && dist >= -1.0 && (supports[0].strengthLabel === 'قوي' || supports[0].strengthLabel === 'قوي جداً')) {
      sentence3 = `يوجد احتمال انعكاس قريب، نظراً لاقتراب السعر من مستوى دعم قوي (المسافة ${Math.max(0, dist).toFixed(1)}%).`;
    }
  }

  const trendExplanationParagraph = `${sentence1} ${sentence2} ${sentence3}`;

  // 8. Volume & Liquidity Sentences
  let volumeAnalysisSentence = '';
  if (volDiffPct >= 20) {
    volumeAnalysisSentence = `الحجم أعلى من المتوسط بنسبة ${Math.round(volDiffPct)}%.`;
  } else if (volDiffPct <= -20) {
    volumeAnalysisSentence = 'الحجم لا يدعم الحركة الحالية.';
  } else {
    volumeAnalysisSentence = 'الحجم قريب من متوسطه الطبيعي.';
  }

  const isLiquidityUp = liquidityScore >= 50;
  const price20Ago = activeBars.length >= 20 ? activeBars[activeBars.length - 20].close : (activeBars[0]?.close || currentPrice);
  const isPriceUp = currentPrice >= price20Ago;

  let liquidityAnalysisSentence = '';
  if (isLiquidityUp && isPriceUp) {
    liquidityAnalysisSentence = 'السيولة ترتفع مع ارتفاع السعر، وهي إشارة داعمة للاتجاه.';
  } else if (!isLiquidityUp && isPriceUp) {
    liquidityAnalysisSentence = 'السعر يرتفع بينما السيولة تتراجع، وهذا يضعف موثوقية استمرار الصعود.';
  } else if (isLiquidityUp && !isPriceUp) {
    liquidityAnalysisSentence = 'السيولة ترتفع رغم تراجع السعر، وقد يشير هذا لتجميع مبكر.';
  } else {
    liquidityAnalysisSentence = 'السيولة والسعر يتراجعان معاً، وهذا يتوافق مع ضعف الاهتمام الحالي بالسهم.';
  }

  // 9. Non-Iraqi Investors Report
  let foreignersReport = {
    hasData: hasForeignData,
    netStatusText: 'لا تتوفر بيانات',
    interpretationSentence: 'لا تتوفر بيانات المستثمرين غير العراقيين لهذا السهم.',
    fullText: 'لا تتوفر بيانات المستثمرين غير العراقيين لهذا السهم.'
  };

  if (hasForeignData) {
    const netStatusText = netVal > 0 ? 'صافي شراء' : netVal < 0 ? 'صافي بيع' : 'توازن تام';
    let interp = '';
    const isUpTrend = mediumTerm.level.includes('صاعد');
    const isDownTrend = mediumTerm.level.includes('هابط');

    if (netVal > 0 && isUpTrend) {
      interp = 'استمرار صافي الشراء يتوافق مع الاتجاه الصاعد الحالي.';
    } else if (netVal > 0 && isDownTrend) {
      interp = 'صافي شراء رغم الاتجاه الهابط، وهذا قد يشير لاحتمال بداية تجميع.';
    } else if (netVal < 0 && isUpTrend) {
      interp = 'صافي بيع رغم الاتجاه الصاعد، وهذا قد يشير لاحتمال بدء تصريف.';
    } else if (netVal < 0 && isDownTrend) {
      interp = 'استمرار صافي البيع يتوافق مع الاتجاه الهابط الحالي.';
    } else {
      interp = 'حركة الأجانب متوازنة ولا تعطي إشارة اتجاهية واضحة حالياً.';
    }

    foreignersReport = {
      hasData: true,
      netStatusText,
      interpretationSentence: interp,
      fullText: `${netStatusText}. ${interp}`
    };
  }

  // 10. Technical Risks (Explicit Conditions)
  const technicalRisks: string[] = [];
  if (resistances.length > 0) {
    const distRes = ((resistances[0].price - currentPrice) / currentPrice) * 100;
    if (distRes <= 2.0 && distRes >= -1.0 && (resistances[0].strengthLabel === 'قوي' || resistances[0].strengthLabel === 'قوي جداً')) {
      technicalRisks.push(`قرب مقاومة قوية (${resistances[0].price.toFixed(2)} د.ع)`);
    }
  }
  if (indicators.rsi14 >= 70) {
    technicalRisks.push('احتمال تصحيح بسبب دخول مؤشر RSI منطقة تشبع شرائي');
  }
  if (volDiffPct <= -20) {
    technicalRisks.push('ضعف بالحجم وعدم مواكبة الحركة السعرية');
  }
  if (atrPct >= 4.0) {
    technicalRisks.push('ارتفاع التذبذب السعري بحدود عالية وفق مؤشر ATR');
  }
  if (momentumSubScore < 40) {
    technicalRisks.push('ضعف واضح بالزخم وتراجع القوة النسبية');
  }

  // 11. Top 5 Strengths & Top 5 Weaknesses
  interface ComponentImpact {
    name: string;
    impact: number;
    label: string;
  }

  const componentImpacts: ComponentImpact[] = [
    {
      name: 'Trend',
      impact: (trendSubScore - 50) * weights.trend,
      label: (trendSubScore - 50) * weights.trend > 0
        ? (mediumTerm.level.includes('صاعد') ? 'اتجاه متوسط وطويل صاعد' : 'قوة فنية مرتفعة في المسار العام')
        : 'ضعف في اتجاه المسار العام'
    },
    {
      name: 'Momentum',
      impact: (momentumSubScore - 50) * weights.momentum,
      label: (momentumSubScore - 50) * weights.momentum > 0
        ? (indicators.rsi14 >= 55 ? 'MACD إيجابي وزخم نسبي مرتفع' : 'ثبات المؤشرات الفنية للزخم')
        : 'ضعف بالزخم وتراجع مؤشرات القوة النسبية'
    },
    {
      name: 'Volume',
      impact: (volumeSubScore - 50) * weights.volume,
      label: (volumeSubScore - 50) * weights.volume > 0
        ? (volDiffPct >= 20 ? `ارتفاع بالحجم أعلى من المتوسط بنسبة ${Math.round(volDiffPct)}%` : 'ارتفاع بالحجم وتداول نشط')
        : 'انخفاض بالحجم وعدم دعم التداول'
    },
    {
      name: 'Liquidity',
      impact: (liquidityScore - 50) * weights.liquidity,
      label: (liquidityScore - 50) * weights.liquidity > 0
        ? 'سيولة قوية ودوران تداول عالي'
        : 'ضعف السيولة وانخفاض الدوران'
    },
    {
      name: 'Pattern',
      impact: (patternSubScore - 50) * weights.pattern,
      label: (patternSubScore - 50) * weights.pattern > 0
        ? (indicators.detectedPattern !== 'لا يوجد نموذج مؤكد' ? `نموذج فني إيجابي (${indicators.detectedPattern})` : 'نموذج فني مكتمل')
        : (indicators.detectedPattern !== 'لا يوجد نموذج مؤكد' ? `نموذج فني سلبي (${indicators.detectedPattern})` : 'نموذج فني غير داعم')
    }
  ];

  if (hasForeignData) {
    componentImpacts.push({
      name: 'Foreign',
      impact: (foreignSubScore - 50) * weights.foreign,
      label: (foreignSubScore - 50) * weights.foreign > 0
        ? 'تجميع وصافي شراء من المستثمرين غير العراقيين'
        : 'تصريف وصافي بيع من المستثمرين غير العراقيين'
    });
  }

  if (supports.length > 0 && (currentPrice - supports[0].price) / currentPrice <= 0.02) {
    componentImpacts.push({
      name: 'SupportProximity',
      impact: 10,
      label: `ارتداد متوقع أو ثبات قرب مستوى دعم (${supports[0].price.toFixed(2)} د.ع)`
    });
  }

  const prosList = componentImpacts
    .filter(c => c.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5)
    .map(c => c.label);

  const consList = componentImpacts
    .filter(c => c.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 5)
    .map(c => c.label);

  const pros = prosList.length > 0 ? prosList : ['تداول مستقر نسبياً ضمن نطاقات محددة.'];
  const cons = consList.length > 0 ? consList : ['لا توجد انحرافات حادة مسجلة حالياً.'];

  const executiveSummaryText = generalStatusSentence;

  const coreV22 = computeCoreV22Systems(
    history,
    currentPrice,
    indicators,
    scoreBreakdown,
    compositeScore,
    confidenceScore,
    { nonIraqi, value: activeBars.reduce((s, b) => s + (b.value || b.close * b.volume), 0) }
  );

  const report: TechnicalReportData = {
    generalStatusSentence,
    compositeExplanations,
    confidenceExplanation,
    trendAlignmentSentence,
    executiveSummary,
    indicatorStatusesTable,
    indicatorExplanations,
    trendExplanationParagraph,
    volumeAnalysisSentence,
    liquidityAnalysisSentence,
    foreignersReport,
    technicalRisks
  };

  return {
    tier,
    stars,
    badgeBg,
    badgeTextColor,
    compositeScore,
    compositeInterpretation,
    confidenceScore,
    marketState,
    scoreBreakdown,
    weightsUsed: weights,
    trendAnalysis,
    supports,
    resistances,
    recentMajorMoves,
    majorMovesStats,
    pros,
    cons,
    actionRecommendation,
    executiveSummaryText,
    report,
    coreV22
  };
}

export function computeCoreV22Systems(
  bars: DailyBar[],
  currentPrice: number,
  indicators: TechnicalIndicators,
  scoreBreakdown: ScoreBreakdown,
  compositeScore: number,
  confidenceScoreStr: ConfidenceScore,
  company?: any
): CoreV22Systems {
  const activeBars = bars.filter((b) => (b.volume > 0 || b.trades > 0) && b.close > 0);
  const n = activeBars.length;
  const lastBar = activeBars[n - 1] || { close: currentPrice, volume: 1000, value: 5000, trades: 1 };

  // 18. Money Rotation Engine
  const p1 = activeBars.slice(Math.max(0, n - 10));
  const p2 = activeBars.slice(Math.max(0, n - 20), Math.max(0, n - 10));

  const val1 = p1.reduce((s, b) => s + (b.value || b.close * b.volume), 0) / Math.max(1, p1.length);
  const val2 = p2.reduce((s, b) => s + (b.value || b.close * b.volume), 0) / Math.max(1, p2.length);

  const stockShareCurrentPct = Math.min(100, Math.round((val1 / (val1 * 5 + 5000000)) * 100 * 10) / 10);
  const stockSharePrevPct = Math.min(100, Math.round((val2 / (val2 * 5 + 5000000)) * 100 * 10) / 10);
  const shareDiffPct = Math.round((stockShareCurrentPct - stockSharePrevPct) * 10) / 10;
  const sectorTrend: 'صاعد' | 'هابط' | 'مستقر' = val1 > val2 * 1.05 ? 'صاعد' : val1 < val2 * 0.95 ? 'هابط' : 'مستقر';

  let moneyRotationClassification: 'دخول سيولة' | 'خروج سيولة' | 'استقرار' | 'تدوير سيولة' = 'استقرار';
  if (shareDiffPct >= 2.0 && sectorTrend === 'صاعد') {
    moneyRotationClassification = 'دخول سيولة';
  } else if (shareDiffPct <= -2.0 && sectorTrend === 'هابط') {
    moneyRotationClassification = 'خروج سيولة';
  } else if (Math.abs(shareDiffPct) < 2.0) {
    moneyRotationClassification = 'استقرار';
  } else if (Math.abs(shareDiffPct) >= 2.0) {
    moneyRotationClassification = 'تدوير سيولة';
  }

  // 19. Volatility Engine
  const dailyAtrPct = Math.round((indicators.atr14 / currentPrice) * 100 * 10) / 10;
  const weeklyAtrPct = Math.round((dailyAtrPct * 1.2) * 10) / 10;
  const monthlyAtrPct = Math.round((dailyAtrPct * 1.5) * 10) / 10;
  const avgAtrPct = Math.round(((dailyAtrPct + weeklyAtrPct + monthlyAtrPct) / 3) * 10) / 10;

  let volClassification: 'مرتفع جداً' | 'مرتفع' | 'طبيعي' | 'منخفض' = 'طبيعي';
  if (avgAtrPct >= 5.0) volClassification = 'مرتفع جداً';
  else if (avgAtrPct >= 3.0) volClassification = 'مرتفع';
  else if (avgAtrPct >= 1.0) volClassification = 'طبيعي';
  else volClassification = 'منخفض';

  // 20. Breakout Engine
  const volumeRatio = indicators.volumeRatio20 || 1.0;
  const isClosedBeyond = indicators.detectedPattern === 'اختراق مستوى مقاومة' || indicators.detectedPattern === 'كسر مستوى دعم';
  const breakoutType: 'اختراق مقاومة' | 'كسر دعم' | 'لا يوجد' = indicators.detectedPattern === 'اختراق مستوى مقاومة' ? 'اختراق مقاومة' : indicators.detectedPattern === 'كسر مستوى دعم' ? 'كسر دعم' : 'لا يوجد';
  
  let breakoutQualification: 'اختراق مؤهل للتقييم' | 'اختراق ضعيف غير مؤهل' | 'لا يوجد اختراق' = 'لا يوجد اختراق';
  if (isClosedBeyond && volumeRatio >= 1.3) {
    breakoutQualification = 'اختراق مؤهل للتقييم';
  } else if (isClosedBeyond || volumeRatio >= 1.3) {
    breakoutQualification = 'اختراق ضعيف غير مؤهل';
  }

  // 21. False Breakout Engine
  let falseBreakoutStatus: 'اختراق حقيقي' | 'اختراق كاذب' | 'قيد التأكيد' | 'غير ينطبق' = 'غير ينطبق';
  if (breakoutQualification === 'اختراق مؤهل للتقييم') {
    falseBreakoutStatus = 'اختراق حقيقي';
  } else if (breakoutQualification === 'اختراق ضعيف غير مؤهل') {
    falseBreakoutStatus = 'قيد التأكيد';
  }

  // 22. Accumulation & Distribution Engine
  const obvTrend: 'صاعد' | 'هابط' = indicators.obv >= 0 ? 'صاعد' : 'هابط';
  const adTrend: 'صاعد' | 'هابط' = indicators.accumulationDistribution >= 0 ? 'صاعد' : 'هابط';
  const mfiPositive = indicators.mfi14 >= 55;
  const foreignPositive = company?.nonIraqi ? company.nonIraqi.netBuyValue > 0 : undefined;

  let positiveSourcesCount = 0;
  let totalSourcesCount = 3;
  if (obvTrend === 'صاعد') positiveSourcesCount++;
  if (adTrend === 'صاعد') positiveSourcesCount++;
  if (mfiPositive) positiveSourcesCount++;
  if (foreignPositive !== undefined) {
    totalSourcesCount = 4;
    if (foreignPositive) positiveSourcesCount++;
  }

  const positiveRatio = positiveSourcesCount / totalSourcesCount;
  let accumClassification: 'تجميع' | 'تصريف' | 'حياد' = 'حياد';
  if (positiveRatio >= 0.75) accumClassification = 'تجميع';
  else if (positiveRatio <= 0.25) accumClassification = 'تصريف';

  const accumConfidencePct = Math.round(positiveRatio * 100);

  // 23. Trend Strength Engine
  const trendStrengthScore = scoreBreakdown.trendScore;
  const trendStars = convertScoreToStars(trendStrengthScore);

  // 24. Momentum Engine
  const rsiCrossed50 = indicators.rsi14 >= 50;
  const momentumStatus: 'تسارع الزخم' | 'تباطؤ الزخم' | 'انعكاس الزخم' | 'زخم مستقر' = 
    scoreBreakdown.momentumScore >= 75 ? 'تسارع الزخم' :
    scoreBreakdown.momentumScore <= 35 ? 'تباطؤ الزخم' :
    indicators.rsi14 >= 50 ? 'انعكاس الزخم' : 'زخم مستقر';

  // 25. Volume Agreement Engine
  const volumeAgreementStatus: 'يؤكد الاتجاه' | 'يخالف الاتجاه' | 'محايد' =
    scoreBreakdown.volumeScore >= 60 ? 'يؤكد الاتجاه' :
    scoreBreakdown.volumeScore <= 35 ? 'يخالف الاتجاه' : 'محايد';

  // 26. Liquidity Power Engine
  const liquidityScore = scoreBreakdown.liquidityScore;
  const liquidityStars = convertScoreToStars(liquidityScore);

  // 27. Price Quality Score
  let reversalsCount = 0;
  for (let i = 2; i < Math.min(22, n - 2); i++) {
    const c = activeBars[n - i]?.close || currentPrice;
    const prev = activeBars[n - i - 1]?.close || c;
    const next = activeBars[n - i + 1]?.close || c;
    if ((c > prev && c > next) || (c < prev && c < next)) {
      reversalsCount++;
    }
  }

  const trendConsistencyPct = indicators.trendDirection.includes('صاعد') || indicators.trendDirection.includes('هابط') ? 85 : 50;
  const atrBonus = volClassification === 'طبيعي' ? 15 : volClassification === 'مرتفع' ? 5 : 0;
  const priceQualityScore = Math.max(0, Math.min(100, Math.round(50 - Math.min(50, reversalsCount * 10) + (trendConsistencyPct * 0.5) + atrBonus)));
  const priceQualityStars = convertScoreToStars(priceQualityScore);

  // 28. Trend Health Score
  let metConditionsCount = 0;
  if ((indicators.sma20 > indicators.sma50 && indicators.sma50 > indicators.sma200) ||
      (indicators.sma20 < indicators.sma50 && indicators.sma50 < indicators.sma200)) {
    metConditionsCount++;
  }
  if (indicators.macdLine > indicators.macdSignal || indicators.macdHist > 0) metConditionsCount++;
  if (indicators.adx14 >= 20) metConditionsCount++;
  if (indicators.rsi14 >= 45 && indicators.rsi14 <= 70) metConditionsCount++;
  if (scoreBreakdown.volumeScore >= 50) metConditionsCount++;
  if (foreignPositive === undefined || foreignPositive === true) metConditionsCount++;

  const trendHealthScore = Math.round((metConditionsCount / 6) * 100);
  const trendHealthStars = convertScoreToStars(trendHealthScore);

  // 29. Foreign Activity Score
  let foreignActivity: CoreV22Systems['foreignActivity'] = undefined;
  if (company?.nonIraqi && (company.nonIraqi.buyValue > 0 || company.nonIraqi.sellValue > 0)) {
    const totalVal = company.value || 1;
    const fVal = company.nonIraqi.buyValue + company.nonIraqi.sellValue;
    const participationScore = Math.min(100, Math.round((fVal / totalVal) * 100 * 10)) * 0.4;
    const correlationScore = (company.nonIraqi.netBuyValue >= 0 ? 80 : 30) * 0.4;
    const continuityScore = 70 * 0.2;
    const fScore = Math.round(participationScore + correlationScore + continuityScore);
    const fStars = convertScoreToStars(fScore);
    foreignActivity = {
      score: fScore,
      stars: fStars.count,
      starsStr: fStars.starsStr,
      participationScore: Math.round(participationScore / 0.4),
      correlationScore: Math.round(correlationScore / 0.4),
      continuityScore: Math.round(continuityScore / 0.2)
    };
  }

  // 30. Final Scoreboard & Star Ratings
  const confidenceScoreVal = confidenceScoreStr === 'مرتفع' ? 95 : confidenceScoreStr === 'جيد' ? 80 : confidenceScoreStr === 'متوسط' ? 65 : 45;
  const dataQualityVal = Math.min(100, Math.round((n / 250) * 100));
  const signalStrengthVal = Math.round((compositeScore + trendHealthScore) / 2);

  const finalScoreboard = {
    trendScore: { value: scoreBreakdown.trendScore, ...convertScoreToStars(scoreBreakdown.trendScore) },
    momentumScore: { value: scoreBreakdown.momentumScore, ...convertScoreToStars(scoreBreakdown.momentumScore) },
    volumeScore: { value: scoreBreakdown.volumeScore, ...convertScoreToStars(scoreBreakdown.volumeScore) },
    liquidityScore: { value: scoreBreakdown.liquidityScore, ...convertScoreToStars(scoreBreakdown.liquidityScore) },
    patternScore: { value: scoreBreakdown.patternScore, ...convertScoreToStars(scoreBreakdown.patternScore) },
    foreignScore: { value: scoreBreakdown.foreignScore, ...convertScoreToStars(scoreBreakdown.foreignScore) },
    confidenceScore: { value: confidenceScoreVal, ...convertScoreToStars(confidenceScoreVal) },
    compositeScore: { value: compositeScore, ...convertScoreToStars(compositeScore) },
    dataQualityScore: { value: dataQualityVal, ...convertScoreToStars(dataQualityVal) },
    signalStrengthScore: { value: signalStrengthVal, ...convertScoreToStars(signalStrengthVal) }
  };

  return {
    moneyRotation: {
      classification: moneyRotationClassification,
      stockShareCurrentPct,
      stockSharePrevPct,
      shareDiffPct,
      sectorTrend
    },
    volatility: {
      dailyAtrPct,
      weeklyAtrPct,
      monthlyAtrPct,
      avgAtrPct,
      classification: volClassification
    },
    breakout: {
      isBreakoutOrBreakdown: isClosedBeyond,
      type: breakoutType,
      volumeRatio,
      isClosedBeyond,
      qualification: breakoutQualification
    },
    falseBreakout: {
      status: falseBreakoutStatus,
      sessionsObserved: 3
    },
    accumulationDistribution: {
      classification: accumClassification,
      confidencePct: accumConfidencePct,
      positiveSourcesCount,
      totalSourcesCount,
      obvTrend,
      adTrend,
      mfiPositive,
      foreignPositive
    },
    trendStrength: {
      score: trendStrengthScore,
      stars: trendStars.count,
      starsStr: trendStars.starsStr
    },
    momentumEngine: {
      score: scoreBreakdown.momentumScore,
      status: momentumStatus,
      rsiCrossed50,
      change5Sessions: 5
    },
    volumeAgreement: {
      status: volumeAgreementStatus,
      volumeScore: scoreBreakdown.volumeScore
    },
    liquidityPower: {
      score: liquidityScore,
      stars: liquidityStars.count,
      starsStr: liquidityStars.starsStr
    },
    priceQuality: {
      score: priceQualityScore,
      stars: priceQualityStars.count,
      starsStr: priceQualityStars.starsStr,
      reversalsCount,
      trendConsistencyPct
    },
    trendHealth: {
      score: trendHealthScore,
      stars: trendHealthStars.count,
      starsStr: trendHealthStars.starsStr,
      metConditionsCount,
      totalConditionsCount: 6
    },
    foreignActivity,
    finalScoreboard
  };
}
