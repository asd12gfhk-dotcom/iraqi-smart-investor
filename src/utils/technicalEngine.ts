import { DailyBar, FibonacciLevels, IndicatorState, PivotPoints, TechnicalIndicators } from '../types/isx';
import { IndicatorSettings } from '../types/settings';

/**
 * Deterministic Technical Analysis Engine for ISX Stock Historical Data (Core V2)
 * Adheres strictly to Document 3 - Technical Analysis Engine Specifications
 */

export function calculateSMA(prices: number[], period: number): { value: number; status: IndicatorState } {
  if (!prices || prices.length === 0) return { value: 0, status: 'غير محسوب' };
  if (prices.length < period) return { value: prices[prices.length - 1], status: 'بيانات غير كافية' };
  const slice = prices.slice(prices.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return { value: sum / period, status: 'صالح' };
}

export function calculateEMA(prices: number[], period: number): { value: number; status: IndicatorState } {
  if (!prices || prices.length === 0) return { value: 0, status: 'غير محسوب' };
  if (prices.length < period) {
    const sma = calculateSMA(prices, prices.length);
    return { value: sma.value, status: 'بيانات غير كافية' };
  }
  const k = 2 / (period + 1);
  const initialSlice = prices.slice(0, period);
  let ema = initialSlice.reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return { value: ema, status: 'صالح' };
}

export function calculateWMA(prices: number[], period: number): { value: number; status: IndicatorState } {
  if (!prices || prices.length === 0) return { value: 0, status: 'غير محسوب' };
  if (prices.length < period) return { value: prices[prices.length - 1], status: 'بيانات غير كافية' };
  const slice = prices.slice(prices.length - period);
  let weightSum = 0;
  let weightedPriceSum = 0;
  for (let i = 0; i < period; i++) {
    const weight = i + 1;
    weightSum += weight;
    weightedPriceSum += slice[i] * weight;
  }
  return { value: weightedPriceSum / weightSum, status: 'صالح' };
}

/**
 * RSI Calculation using Wilder's smoothing.
 * Filters out zero-trading days (volume === 0 or zero price diff with zero trades).
 */
export function calculateRSI(bars: DailyBar[], period: number = 14): { value: number; status: IndicatorState } {
  // Filter active trading bars only (exclude zero trading days per Document 3)
  const activeBars = bars.filter((b) => b.volume > 0 || b.trades > 0);
  if (activeBars.length <= period) {
    return { value: 50, status: 'بيانات غير كافية' };
  }

  const prices = activeBars.map((b) => b.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return { value: 100, status: 'صالح' };
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return { value: rsi, status: 'صالح' };
}

export function calculateStochasticRSI(bars: DailyBar[], period: number = 14): { value: number; status: IndicatorState } {
  const activeBars = bars.filter((b) => b.volume > 0 || b.trades > 0);
  if (activeBars.length < period + 14) {
    return { value: 50, status: 'بيانات غير كافية' };
  }

  // Calculate historic RSI values
  const rsiSeries: number[] = [];
  for (let i = 15; i <= activeBars.length; i++) {
    const subBars = activeBars.slice(0, i);
    const rsiRes = calculateRSI(subBars, period);
    if (rsiRes.status === 'صالح') {
      rsiSeries.push(rsiRes.value);
    }
  }

  if (rsiSeries.length < period) return { value: 50, status: 'بيانات غير كافية' };
  const lastWindow = rsiSeries.slice(rsiSeries.length - period);
  const currentRSI = lastWindow[lastWindow.length - 1];
  const lowestRSI = Math.min(...lastWindow);
  const highestRSI = Math.max(...lastWindow);

  if (highestRSI === lowestRSI) return { value: 0, status: 'صالح' };
  const stochRSI = ((currentRSI - lowestRSI) / (highestRSI - lowestRSI)) * 100;
  return { value: stochRSI, status: 'صالح' };
}

export function calculateROC(bars: DailyBar[], period: number = 12): { value: number; status: IndicatorState } {
  const activeBars = bars.filter((b) => b.volume > 0 || b.trades > 0);
  if (activeBars.length <= period) return { value: 0, status: 'بيانات غير كافية' };

  const currentClose = activeBars[activeBars.length - 1].close;
  const prevClose = activeBars[activeBars.length - 1 - period].close;

  if (prevClose === 0) return { value: 0, status: 'خطأ بالحساب' };
  const roc = ((currentClose - prevClose) / prevClose) * 100;
  return { value: roc, status: 'صالح' };
}

export function calculateMomentum(bars: DailyBar[], period: number = 10): { value: number; status: IndicatorState } {
  const activeBars = bars.filter((b) => b.volume > 0 || b.trades > 0);
  if (activeBars.length <= period) return { value: 0, status: 'بيانات غير كافية' };

  const currentClose = activeBars[activeBars.length - 1].close;
  const prevClose = activeBars[activeBars.length - 1 - period].close;
  return { value: currentClose - prevClose, status: 'صالح' };
}

export function calculateCCI(bars: DailyBar[], period: number = 20): { value: number; status: IndicatorState } {
  if (bars.length < period) return { value: 0, status: 'بيانات غير كافية' };

  const tps = bars.map((b) => (b.high + b.low + b.close) / 3);
  const sliceTPs = tps.slice(tps.length - period);
  const smaTP = sliceTPs.reduce((a, b) => a + b, 0) / period;

  const meanDeviation = sliceTPs.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
  if (meanDeviation === 0) return { value: 0, status: 'صالح' };

  const currentTP = tps[tps.length - 1];
  const cci = (currentTP - smaTP) / (0.015 * meanDeviation);
  return { value: cci, status: 'صالح' };
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  line: number;
  signal: number;
  hist: number;
  status: IndicatorState;
} {
  if (!prices || prices.length < slowPeriod) {
    return { line: 0, signal: 0, hist: 0, status: 'بيانات غير كافية' };
  }

  const macdSeries: number[] = [];
  for (let i = slowPeriod; i <= prices.length; i++) {
    const subPrices = prices.slice(0, i);
    const e12 = calculateEMA(subPrices, fastPeriod).value;
    const e26 = calculateEMA(subPrices, slowPeriod).value;
    macdSeries.push(e12 - e26);
  }

  const macdLine = macdSeries[macdSeries.length - 1];
  const signal = calculateEMA(macdSeries, signalPeriod).value;
  const hist = macdLine - signal;

  return { line: macdLine, signal, hist, status: 'صالح' };
}

export function calculateADX(bars: DailyBar[], period: number = 14): {
  adx: number;
  plusDI: number;
  minusDI: number;
  status: IndicatorState;
} {
  if (bars.length < period + 1) {
    return { adx: 20, plusDI: 0, minusDI: 0, status: 'بيانات غير كافية' };
  }

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );

    trs.push(tr);
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }

  if (trs.length < period) {
    return { adx: 20, plusDI: 0, minusDI: 0, status: 'بيانات غير كافية' };
  }

  let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxSeries: number[] = [];

  for (let i = period; i < trs.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxSeries.push(dx);
  }

  if (dxSeries.length === 0) {
    return { adx: 20, plusDI: 0, minusDI: 0, status: 'بيانات غير كافية' };
  }

  const finalPlusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const finalMinusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

  // Initial ADX = average of first period DX values
  let adx = dxSeries.slice(0, Math.min(period, dxSeries.length)).reduce((a, b) => a + b, 0) / Math.min(period, dxSeries.length);
  for (let i = period; i < dxSeries.length; i++) {
    adx = (adx * (period - 1) + dxSeries[i]) / period;
  }

  return { adx, plusDI: finalPlusDI, minusDI: finalMinusDI, status: 'صالح' };
}

export function calculateATR(bars: DailyBar[], period: number = 14): { value: number; status: IndicatorState } {
  if (bars.length < 2) return { value: 0.05, status: 'بيانات غير كافية' };
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  if (trs.length < period) {
    const avgTR = trs.reduce((a, b) => a + b, 0) / trs.length;
    return { value: avgTR, status: 'بيانات غير كافية' };
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return { value: atr, status: 'صالح' };
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; middle: number; lower: number; status: IndicatorState } {
  const smaRes = calculateSMA(prices, period);
  if (smaRes.status !== 'صالح') {
    return { upper: smaRes.value * 1.05, middle: smaRes.value, lower: smaRes.value * 0.95, status: smaRes.status };
  }

  const slice = prices.slice(prices.length - period);
  const middle = smaRes.value;
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + multiplier * stdDev,
    middle,
    lower: middle - multiplier * stdDev,
    status: 'صالح'
  };
}

export function calculateKeltnerChannel(
  bars: DailyBar[],
  period: number = 20,
  atrMultiplier: number = 2
): { upper: number; lower: number; status: IndicatorState } {
  const closes = bars.map((b) => b.close);
  const emaRes = calculateEMA(closes, period);
  const atrRes = calculateATR(bars, 14);

  if (emaRes.status !== 'صالح') {
    return { upper: emaRes.value, lower: emaRes.value, status: emaRes.status };
  }

  return {
    upper: emaRes.value + atrMultiplier * atrRes.value,
    lower: emaRes.value - atrMultiplier * atrRes.value,
    status: 'صالح'
  };
}

export function calculateDonchianChannel(
  bars: DailyBar[],
  period: number = 20
): { upper: number; lower: number; middle: number; status: IndicatorState } {
  if (bars.length < period) {
    const last = bars[bars.length - 1] || { high: 0, low: 0 };
    return { upper: last.high, lower: last.low, middle: (last.high + last.low) / 2, status: 'بيانات غير كافية' };
  }

  const slice = bars.slice(bars.length - period);
  const upper = Math.max(...slice.map((b) => b.high));
  const lower = Math.min(...slice.map((b) => b.low));
  const middle = (upper + lower) / 2;

  return { upper, lower, middle, status: 'صالح' };
}

export function calculateStochastic(
  bars: DailyBar[],
  period: number = 14
): { k: number; d: number; status: IndicatorState } {
  if (bars.length < period) return { k: 50, d: 50, status: 'بيانات غير كافية' };
  const slice = bars.slice(bars.length - period);
  const currentClose = slice[slice.length - 1].close;
  const lowestLow = Math.min(...slice.map((b) => b.low));
  const highestHigh = Math.max(...slice.map((b) => b.high));

  if (highestHigh === lowestLow) return { k: 50, d: 50, status: 'صالح' };

  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

  const kHistory: number[] = [];
  for (let i = bars.length - 3; i < bars.length; i++) {
    const subSlice = bars.slice(Math.max(0, i - period), i + 1);
    const cClose = subSlice[subSlice.length - 1].close;
    const lLow = Math.min(...subSlice.map((b) => b.low));
    const hHigh = Math.max(...subSlice.map((b) => b.high));
    const subK = hHigh === lLow ? 50 : ((cClose - lLow) / (hHigh - lLow)) * 100;
    kHistory.push(subK);
  }
  const d = kHistory.reduce((a, b) => a + b, 0) / kHistory.length;

  return { k, d, status: 'صالح' };
}

export function calculateOBV(bars: DailyBar[]): { value: number; status: IndicatorState } {
  if (bars.length === 0) return { value: 0, status: 'غير محسوب' };
  let obv = bars[0].volume;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) {
      obv += bars[i].volume;
    } else if (bars[i].close < bars[i - 1].close) {
      obv -= bars[i].volume;
    }
  }
  return { value: obv, status: 'صالح' };
}

export function calculateMFI(bars: DailyBar[], period: number = 14): { value: number; status: IndicatorState } {
  if (bars.length < period + 1) return { value: 50, status: 'بيانات غير كافية' };

  let posMoneyFlow = 0;
  let negMoneyFlow = 0;

  for (let i = bars.length - period; i < bars.length; i++) {
    const tpCurrent = (bars[i].high + bars[i].low + bars[i].close) / 3;
    const tpPrev = (bars[i - 1].high + bars[i - 1].low + bars[i - 1].close) / 3;
    const rawMoneyFlow = tpCurrent * bars[i].volume;

    if (tpCurrent > tpPrev) {
      posMoneyFlow += rawMoneyFlow;
    } else if (tpCurrent < tpPrev) {
      negMoneyFlow += rawMoneyFlow;
    }
  }

  if (negMoneyFlow === 0) return { value: 100, status: 'صالح' };
  const moneyRatio = posMoneyFlow / negMoneyFlow;
  const mfi = 100 - 100 / (1 + moneyRatio);
  return { value: mfi, status: 'صالح' };
}

export function calculateVWAP(bars: DailyBar[]): { value: number; status: IndicatorState } {
  if (bars.length === 0) return { value: 0, status: 'غير محسوب' };
  let totalPV = 0;
  let totalVolume = 0;

  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3;
    totalPV += tp * b.volume;
    totalVolume += b.volume;
  }

  if (totalVolume === 0) return { value: bars[bars.length - 1].close, status: 'صالح' };
  return { value: totalPV / totalVolume, status: 'صالح' };
}

export function calculateAccumulationDistribution(bars: DailyBar[]): { value: number; status: IndicatorState } {
  if (bars.length === 0) return { value: 0, status: 'غير محسوب' };
  let ad = 0;
  for (const b of bars) {
    const highLowDiff = b.high - b.low;
    const multiplier = highLowDiff > 0 ? ((b.close - b.low) - (b.high - b.close)) / highLowDiff : 0;
    ad += multiplier * b.volume;
  }
  return { value: ad, status: 'صالح' };
}

export function calculateAroon(bars: DailyBar[], period: number = 25): {
  aroonUp: number;
  aroonDown: number;
  status: IndicatorState;
} {
  if (bars.length < period) {
    return { aroonUp: 50, aroonDown: 50, status: 'بيانات غير كافية' };
  }

  const slice = bars.slice(bars.length - period);
  let highestIndex = 0;
  let lowestIndex = 0;

  for (let i = 0; i < slice.length; i++) {
    if (slice[i].high >= slice[highestIndex].high) highestIndex = i;
    if (slice[i].low <= slice[lowestIndex].low) lowestIndex = i;
  }

  const daysSinceHigh = period - 1 - highestIndex;
  const daysSinceLow = period - 1 - lowestIndex;

  const aroonUp = ((period - daysSinceHigh) / period) * 100;
  const aroonDown = ((period - daysSinceLow) / period) * 100;

  return { aroonUp, aroonDown, status: 'صالح' };
}

export function calculatePivots(lastBar: DailyBar): PivotPoints {
  const p = (lastBar.high + lastBar.low + lastBar.close) / 3;
  const r1 = 2 * p - lastBar.low;
  const s1 = 2 * p - lastBar.high;
  const r2 = p + (lastBar.high - lastBar.low);
  const s2 = p - (lastBar.high - lastBar.low);
  const r3 = lastBar.high + 2 * (p - lastBar.low);
  const s3 = lastBar.low - 2 * (lastBar.high - p);
  return { p, r1, r2, r3, s1, s2, s3 };
}

export function calculateFibonacci(bars: DailyBar[]): FibonacciLevels {
  if (bars.length === 0) {
    return { fib236: 0, fib382: 0, fib500: 0, fib618: 0, fib786: 0, ext127: 0, ext161: 0, ext261: 0 };
  }
  const period = Math.min(60, bars.length);
  const slice = bars.slice(bars.length - period);
  const high = Math.max(...slice.map((b) => b.high));
  const low = Math.min(...slice.map((b) => b.low));
  const diff = high - low;

  return {
    fib236: high - diff * 0.236,
    fib382: high - diff * 0.382,
    fib500: high - diff * 0.5,
    fib618: high - diff * 0.618,
    fib786: high - diff * 0.786,
    ext127: low + diff * 1.272,
    ext161: low + diff * 1.618,
    ext261: low + diff * 2.618
  };
}

export function calculateIchimoku(bars: DailyBar[]): {
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  status: IndicatorState;
} {
  if (bars.length < 52) {
    const last = bars[bars.length - 1] || { close: 0 };
    return {
      tenkanSen: last.close,
      kijunSen: last.close,
      senkouSpanA: last.close,
      senkouSpanB: last.close,
      status: 'بيانات غير كافية'
    };
  }

  const calcMid = (period: number) => {
    const slice = bars.slice(bars.length - period);
    const maxH = Math.max(...slice.map((b) => b.high));
    const minL = Math.min(...slice.map((b) => b.low));
    return (maxH + minL) / 2;
  };

  const tenkanSen = calcMid(9);
  const kijunSen = calcMid(26);
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const senkouSpanB = calcMid(52);

  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, status: 'صالح' };
}

export function calculateParabolicSAR(bars: DailyBar[]): { value: number; status: IndicatorState } {
  if (bars.length < 5) {
    const last = bars[bars.length - 1] || { close: 0 };
    return { value: last.close, status: 'بيانات غير كافية' };
  }

  let isUptrend = bars[1].close >= bars[0].close;
  let sar = isUptrend ? bars[0].low : bars[0].high;
  let ep = isUptrend ? bars[0].high : bars[0].low;
  let af = 0.02;

  for (let i = 1; i < bars.length; i++) {
    sar = sar + af * (ep - sar);

    if (isUptrend) {
      if (bars[i].low < sar) {
        isUptrend = false;
        sar = ep;
        ep = bars[i].low;
        af = 0.02;
      } else {
        if (bars[i].high > ep) {
          ep = bars[i].high;
          af = Math.min(0.2, af + 0.02);
        }
      }
    } else {
      if (bars[i].high > sar) {
        isUptrend = true;
        sar = ep;
        ep = bars[i].high;
        af = 0.02;
      } else {
        if (bars[i].low < ep) {
          ep = bars[i].low;
          af = Math.min(0.2, af + 0.02);
        }
      }
    }
  }

  return { value: sar, status: 'صالح' };
}

/**
 * Main Master Method: Order of execution strictly defined per Document 3:
 * 1. Moving Averages
 * 2. Volume
 * 3. Momentum
 * 4. Trend
 * 5. Volatility
 * 6. Patterns & Composite Score
 */
export function computeTechnicalIndicators(bars: DailyBar[], customSettings?: IndicatorSettings): TechnicalIndicators {
  if (!bars || bars.length === 0) {
    throw new Error('بيانات الأسعار التاريخية غير متوفرة');
  }

  const rsiPeriod = customSettings?.rsiPeriod || 14;
  const macdFast = customSettings?.macdFast || 12;
  const macdSlow = customSettings?.macdSlow || 26;
  const macdSignal = customSettings?.macdSignal || 9;
  const emaShortP = customSettings?.emaShort || 20;
  const emaLongP = customSettings?.emaLong || 50;
  const smaShortP = customSettings?.smaShort || 50;
  const smaLongP = customSettings?.smaLong || 200;
  const atrPeriod = customSettings?.atrPeriod || 14;
  const bbPeriod = customSettings?.bbPeriod || 20;
  const bbStdDev = customSettings?.bbStdDev || 2;
  const adxPeriod = customSettings?.adxPeriod || 14;

  const indicatorStatuses: Record<string, IndicatorState> = {};
  const closes = bars.map((b) => b.close);
  const activeBars = bars.filter((b) => b.volume > 0 || b.trades > 0);
  const lastBar = bars[bars.length - 1];
  const currentPrice = lastBar.close;

  // 1. Moving Averages
  const sma10Res = calculateSMA(closes, 10);
  indicatorStatuses.sma10 = sma10Res.status;

  const sma20Res = calculateSMA(closes, Math.min(20, closes.length));
  indicatorStatuses.sma20 = sma20Res.status;

  const sma50Res = calculateSMA(closes, smaShortP);
  indicatorStatuses.sma50 = sma50Res.status;

  const sma200Res = calculateSMA(closes, smaLongP);
  indicatorStatuses.sma200 = sma200Res.status;

  const ema12Res = calculateEMA(closes, emaShortP);
  indicatorStatuses.ema12 = ema12Res.status;

  const ema26Res = calculateEMA(closes, emaLongP);
  indicatorStatuses.ema26 = ema26Res.status;

  const wma20Res = calculateWMA(closes, 20);
  indicatorStatuses.wma20 = wma20Res.status;

  // 2. Volume Indicators
  const obvRes = calculateOBV(bars);
  indicatorStatuses.obv = obvRes.status;

  const mfi14Res = calculateMFI(bars, 14);
  indicatorStatuses.mfi14 = mfi14Res.status;

  const vwapRes = calculateVWAP(bars);
  indicatorStatuses.vwap = vwapRes.status;

  const vol20Avg = calculateSMA(
    bars.map((b) => b.volume),
    Math.min(20, bars.length)
  ).value;
  const volumeRatio20 = vol20Avg > 0 ? lastBar.volume / vol20Avg : 1;

  const adRes = calculateAccumulationDistribution(bars);
  indicatorStatuses.accumulationDistribution = adRes.status;

  // 3. Momentum Indicators
  const rsiRes = calculateRSI(bars, rsiPeriod);
  indicatorStatuses.rsi14 = rsiRes.status;
  const rsi14 = rsiRes.value;

  let rsiStatus: TechnicalIndicators['rsiStatus'] = 'منطقة زَخَم معتدل (30-70)';
  if (rsi14 >= 70) rsiStatus = 'منطقة إفراط في الشراء (>70)';
  else if (rsi14 <= 30) rsiStatus = 'منطقة إفراط في البيع (<30)';

  const stochRSIRes = calculateStochasticRSI(bars, 14);
  indicatorStatuses.stochasticRSI = stochRSIRes.status;

  const roc12Res = calculateROC(bars, 12);
  indicatorStatuses.roc12 = roc12Res.status;

  const momentum10Res = calculateMomentum(bars, 10);
  indicatorStatuses.momentum10 = momentum10Res.status;

  const cci20Res = calculateCCI(bars, 20);
  indicatorStatuses.cci20 = cci20Res.status;

  // 4. Trend Indicators
  const macdRes = calculateMACD(closes, macdFast, macdSlow, macdSignal);
  indicatorStatuses.macd = macdRes.status;

  let macdSignalType: TechnicalIndicators['macdSignalType'] = 'محايد فوق خط الصفر';
  if (macdRes.hist > 0 && macdRes.line > macdRes.signal) macdSignalType = 'تقاطع إيجابي صاعد';
  else if (macdRes.hist < 0 && macdRes.line < macdRes.signal) macdSignalType = 'تقاطع سلبي هابط';
  else if (macdRes.line < 0) macdSignalType = 'محايد تحت خط الصفر';

  const adxRes = calculateADX(bars, adxPeriod);
  indicatorStatuses.adx14 = adxRes.status;

  const aroonRes = calculateAroon(bars, 25);
  indicatorStatuses.aroon = aroonRes.status;

  // Trend direction detection
  let trendDirection: TechnicalIndicators['trendDirection'] = 'عرضي/تذبذب';
  if (currentPrice > sma20Res.value && sma20Res.value > sma50Res.value) {
    trendDirection = currentPrice > sma10Res.value ? 'صاعد قوي' : 'صاعد معتدل';
  } else if (currentPrice < sma20Res.value && sma20Res.value < sma50Res.value) {
    trendDirection = currentPrice < sma10Res.value ? 'هابط قوي' : 'هابط معتدل';
  }

  // SuperTrend estimation
  const atr14Res = calculateATR(bars, atrPeriod);
  indicatorStatuses.atr14 = atr14Res.status;
  const superTrend = trendDirection.includes('صاعد')
    ? currentPrice - atr14Res.value * 2
    : currentPrice + atr14Res.value * 2;

  // 5. Volatility Indicators
  const volatilityPct = currentPrice > 0 ? (atr14Res.value / currentPrice) * 100 : 0;

  const bbRes = calculateBollingerBands(closes, 20, 2);
  indicatorStatuses.bollingerBands = bbRes.status;

  let bollingerPosition: TechnicalIndicators['bollingerPosition'] = 'وسط القناة';
  if (currentPrice >= bbRes.upper) bollingerPosition = 'اختراق صاعد';
  else if (currentPrice <= bbRes.lower) bollingerPosition = 'انكسار هابط';
  else if (currentPrice > bbRes.middle) bollingerPosition = 'أعلى القناة';
  else bollingerPosition = 'أسفل القناة';

  const stochRes = calculateStochastic(bars, 14);
  indicatorStatuses.stochastic = stochRes.status;

  let stochasticStatus: TechnicalIndicators['stochasticStatus'] = 'متوازن';
  if (stochRes.k >= 80) stochasticStatus = 'إفراط شراء';
  else if (stochRes.k <= 20) stochasticStatus = 'إفراط بيع';

  const keltnerRes = calculateKeltnerChannel(bars, 20, 2);
  indicatorStatuses.keltnerChannel = keltnerRes.status;

  const donchianRes = calculateDonchianChannel(bars, 20);
  indicatorStatuses.donchianChannel = donchianRes.status;

  // 6. Additional & Patterns
  const pivots = calculatePivots(lastBar);
  const fibonacci = calculateFibonacci(bars);

  const ichimokuRes = calculateIchimoku(bars);
  indicatorStatuses.ichimoku = ichimokuRes.status;

  const psarRes = calculateParabolicSAR(bars);
  indicatorStatuses.parabolicSAR = psarRes.status;

  // Pattern Detection
  let detectedPattern: TechnicalIndicators['detectedPattern'] = 'لا يوجد نموذج مؤكد';
  if (currentPrice > pivots.r1 && volumeRatio20 > 1.3) {
    detectedPattern = 'اختراق مستوى مقاومة';
  } else if (currentPrice < pivots.s1 && volumeRatio20 > 1.3) {
    detectedPattern = 'كسر مستوى دعم';
  } else if (stochRes.k < 25 && rsi14 < 35) {
    detectedPattern = 'قاع مزدوج صاعد';
  } else if (stochRes.k > 75 && rsi14 > 65) {
    detectedPattern = 'قمة مزدوجة هابطة';
  } else if (trendDirection.includes('صاعد') && volumeRatio20 > 1.1) {
    detectedPattern = 'نموذج علم صاعد';
  }

  return {
    activeBarsCount: activeBars.length,
    indicatorStatuses,

    sma10: sma10Res.value,
    sma20: sma20Res.value,
    sma50: sma50Res.value,
    sma200: sma200Res.value,
    ema12: ema12Res.value,
    ema26: ema26Res.value,
    wma20: wma20Res.value,

    rsi14,
    rsiStatus,
    stochasticRSI: stochRSIRes.value,
    roc12: roc12Res.value,
    momentum10: momentum10Res.value,
    cci20: cci20Res.value,

    macdLine: macdRes.line,
    macdSignal: macdRes.signal,
    macdHist: macdRes.hist,
    macdSignalType,
    adx14: adxRes.adx,
    plusDI14: adxRes.plusDI,
    minusDI14: adxRes.minusDI,
    superTrend,
    aroonUp: aroonRes.aroonUp,
    aroonDown: aroonRes.aroonDown,

    obv: obvRes.value,
    mfi14: mfi14Res.value,
    vwap: vwapRes.value,
    volumeRatio20,
    accumulationDistribution: adRes.value,

    atr14: atr14Res.value,
    volatilityPct,
    bollingerUpper: bbRes.upper,
    bollingerMiddle: bbRes.middle,
    bollingerLower: bbRes.lower,
    bollingerPosition,
    stochasticK: stochRes.k,
    stochasticD: stochRes.d,
    stochasticStatus,
    keltnerUpper: keltnerRes.upper,
    keltnerLower: keltnerRes.lower,
    donchianUpper: donchianRes.upper,
    donchianLower: donchianRes.lower,

    pivots,
    fibonacci,
    tenkanSen: ichimokuRes.tenkanSen,
    kijunSen: ichimokuRes.kijunSen,
    senkouSpanA: ichimokuRes.senkouSpanA,
    senkouSpanB: ichimokuRes.senkouSpanB,
    parabolicSAR: psarRes.value,

    trendDirection,
    trendADX: adxRes.adx,
    detectedPattern
  };
}
