/**
 * ISX Surge Cycle Engine — Final (Multi-Engine Voting System)
 * JavaScript port (ES6 module) of the Python research engine.
 *
 * This engine contains FIVE INDEPENDENT SUB-ENGINES. Each one is a separate,
 * self-contained detector that scans the whole ISX market on its own and
 * decides, for each symbol and each day, whether ITS OWN condition is true.
 * None of the sub-engines know about each other while they run.
 *
 * Five of them (A, B, C, E, F) are genuinely independent detectors and are
 * the ones that vote. "Engine D" (any of A/B/C/E) is kept only as a
 * reference metric -- it is mathematically an OR-combination of the other
 * four, so it cannot be treated as an independent voter (including it in a
 * ">=2 engines agree" vote would make the vote count trivially identical to
 * Engine D firing alone).
 *
 *   A. Cycle Timing + Hammer                     -> 27.7% precision, 1.75x lift
 *   B. Cycle Timing + RSI(40-55)                  -> 27.5% precision, 1.74x lift
 *   C. Cycle Timing + Volume >= 3x                -> 26.9% precision, 1.71x lift
 *   D. Cycle Timing + (any of A/B/C/E) [reference only, not a voter]
 *   E. Cycle Timing + Pullback to EMA20           -> 25.7% precision, 1.63x lift
 *   F. Cycle Timing + RSI(30-50)                  -> 26.5% precision, 1.68x lift
 *
 * "Cycle Timing" itself is a per-symbol condition: today falls inside the
 * window where, based on THIS symbol's own historical spacing between past
 * surge waves, its next wave would be expected to start.
 *
 * After the five independent sub-engines run, a separate VOTING step checks,
 * for each symbol and today's date, how many of the five engines fired
 * "yes". If 2 or more agree on the same symbol on the same day, ONE
 * combined alert is issued for that symbol (listing which engines agreed).
 *
 * This is a research/backtesting tool. It describes historical patterns and
 * raises probability-weighted alerts. It does NOT guarantee future price
 * moves and is not investment advice.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const CONFIG = {
  DEFAULT_THRESHOLD: 0.03,     // surge wave definition: +3% from trough
  TROUGH_WINDOW: 10,           // local trough = lowest close in trailing N days
  MAX_WAVE_WINDOW: 60,         // wave must confirm within N trading days
  CORRECTION_TO_RESET: 0.10,   // pullback required from peak before a new wave can start
  MIN_HISTORY: 40,             // minimum trading days required to analyze a symbol
  MIN_WAVES_FOR_CYCLE: 3,      // minimum waves needed to estimate a symbol's own cycle spacing
  CYCLE_TOLERANCE: 0.35,       // cycle timing window = +/- 35% of the symbol's median gap
  VOTES_REQUIRED: 2,           // how many of the 5 engines must agree to raise a combined alert
};

const EPS = 1e-12;

// ---------------------------------------------------------------------------
// Small utilities (JS has no built-in statistics.median / isfinite-safe parse)
// ---------------------------------------------------------------------------

function median(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Parses a numeric field that may be a string with thousands separators
 * (e.g. "1,235,246,000"), empty, "-", or already numeric. Returns null if
 * unparsable, mirroring the Python `num()` helper.
 */
export function num(x: any): number | null {
  if (x === null || x === undefined || x === "" || x === "-") return null;
  let v = x;
  if (typeof v === "string") {
    v = v.replace(/,/g, "").trim();
    if (v === "" || v === "-") return null;
  }
  const f = parseFloat(v);
  return Number.isFinite(f) ? f : null;
}

/**
 * Converts a DD/MM/YYYY date string to YYYY-MM-DD. Returns null if
 * unparsable or empty. Also accepts already-ISO strings.
 */
export function convDate(d: any): string | null {
  const s = (d || "").toString().trim();
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) {
    if (s.length >= 10 && s[4] === "-") return s.slice(0, 10);
    return null;
  }
  const [dd, mm, yyyy] = parts;
  const y = parseInt(yyyy, 10);
  const m = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(day, 2)}`;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Loads { symbol: [rows] } from a parsed ISX history JSON object
 * (already JSON.parse'd -- pass the object, not a file path, since this
 * runs in the browser / Apps Script rather than reading local files).
 * Drops non-trading days (zero price / zero trades) entirely rather than
 * treating them as real price observations. Returns rows sorted
 * oldest -> newest per symbol.
 *
 * @param {Object} raw - parsed JSON: { SYMBOL: [{date, open, high, low, close, volume, trades}, ...] }
 * @returns {Object} { SYMBOL: [rows sorted oldest->newest] }
 */
export function loadIsxData(raw: any): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  if (!raw || typeof raw !== "object") return out;

  for (const symbol of Object.keys(raw)) {
    const records = raw[symbol];
    if (!Array.isArray(records)) continue;
    const rowsBySymbol = new Map(); // date -> row, dedupes keeping last occurrence

    for (const r of records) {
      const date = convDate(r.date || "");
      const close = num(r.close);
      const trades = num(r.trades);
      if (date === null || close === null || close <= 0) continue;
      if (trades !== null && trades <= 0) continue;

      const high = num(r.high) ?? close;
      const low = num(r.low) ?? close;
      const open = num(r.open) ?? close;
      const volume = num(r.volume) ?? 0.0;
      const value = num(r.value) ?? (volume * close);

      rowsBySymbol.set(date, {
        date, symbol, nameAr: r.nameAr || symbol, open, high, low, close, volume, value, trades: trades || 0,
      });
    }

    const rows = Array.from(rowsBySymbol.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (rows.length > 0) out[symbol] = rows;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

function sma(values: number[], n: number): (number | null)[] {
  const out = new Array(values.length).fill(null);
  let s = 0.0;
  for (let i = 0; i < values.length; i++) {
    s += values[i];
    if (i >= n) s -= values[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

function ema(values: number[], n: number): (number | null)[] {
  const out = new Array(values.length).fill(null);
  if (values.length < n) return out;
  let seed = 0;
  for (let i = 0; i < n; i++) seed += values[i];
  seed /= n;
  out[n - 1] = seed;
  const a = 2.0 / (n + 1.0);
  let prev = seed;
  for (let i = n; i < values.length; i++) {
    prev = (values[i] - prev) * a + prev;
    out[i] = prev;
  }
  return out;
}

function rsi(values: number[], n = 14): (number | null)[] {
  const out = new Array(values.length).fill(null);
  if (values.length <= n) return out;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gains.push(Math.max(d, 0.0));
    losses.push(Math.max(-d, 0.0));
  }
  let ag = 0, al = 0;
  for (let i = 0; i < n; i++) { ag += gains[i]; al += losses[i]; }
  ag /= n; al /= n;
  out[n] = al === 0 ? 100.0 : 100 - 100 / (1 + ag / al);
  for (let j = n; j < gains.length; j++) {
    ag = (ag * (n - 1) + gains[j]) / n;
    al = (al * (n - 1) + losses[j]) / n;
    out[j + 1] = al === 0 ? 100.0 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

function rollingMin(values: number[], n: number): (number | null)[] {
  const out = new Array(values.length).fill(null);
  for (let i = n - 1; i < values.length; i++) {
    let m = Infinity;
    for (let k = i - n + 1; k <= i; k++) if (values[k] < m) m = values[k];
    out[i] = m;
  }
  return out;
}

/** Precomputes everything each sub-engine needs, once per symbol. */
export function buildFeatures(rows: any[]): any[] {
  const c = rows.map((r) => r.close);
  const v = rows.map((r) => r.volume);

  const ema20 = ema(c, 20);
  const ema50 = ema(c, 50);
  const rsi14 = rsi(c, 14);
  const volSma20 = sma(v, 20);

  const feats = [];
  for (let i = 0; i < rows.length; i++) {
    const f: any = {};
    f.ema20 = ema20[i];
    f.ema50 = ema50[i];
    f.rsi14 = rsi14[i];
    f.volRatio20 = volSma20[i] ? v[i] / (volSma20[i] as number) : null;

    // Hammer candle
    const { open: o, high: h, low: l, close: cl } = rows[i];
    const rng = Math.max(h - l, EPS);
    const body = Math.abs(cl - o);
    const lowerWick = Math.min(o, cl) - l;
    f.hammer = lowerWick / rng >= 0.5 && body / rng <= 0.35;

    // Volume >= 3x of 20-day average
    f.volume3x = f.volRatio20 !== null && f.volRatio20 >= 3.0;

    // RSI bands
    f.rsi30to50 = rsi14[i] !== null && (rsi14[i] as number) >= 30 && (rsi14[i] as number) <= 50;
    f.rsi40to55 = rsi14[i] !== null && (rsi14[i] as number) >= 40 && (rsi14[i] as number) <= 55;

    // Pullback to EMA20: price within 2% of EMA20, and EMA20 still above EMA50
    // (i.e. still in an uptrend structure, just pulled back to the average)
    if (ema20[i] !== null && ema50[i] !== null && ema20[i] !== 0) {
      f.pullbackEma20 = Math.abs(cl / (ema20[i] as number) - 1) <= 0.02 && (ema20[i] as number) >= (ema50[i] as number);
    } else {
      f.pullbackEma20 = false;
    }

    feats.push(f);
  }
  return feats;
}

// ---------------------------------------------------------------------------
// Wave detection (trough -> peak, with correction-based reset)
// ---------------------------------------------------------------------------

/**
 * Detects non-overlapping surge waves for a single symbol.
 * A wave starts at a local trough (lowest close in trailing TROUGH_WINDOW
 * days) and is confirmed once price reaches +threshold from that trough
 * within MAX_WAVE_WINDOW trading days. The peak is extended until price
 * corrects CORRECTION_TO_RESET from the running high, and no new wave can
 * start until price has corrected that much from the last wave's peak.
 */
export function detectWaves(rows: any[], threshold = CONFIG.DEFAULT_THRESHOLD): any[] {
  const n = rows.length;
  const closes = rows.map((r) => r.close);
  const waves = [];
  let i = 0;
  let blockedUntil: number | null = null;

  while (i < n) {
    if (i < CONFIG.TROUGH_WINDOW - 1) { i++; continue; }

    let windowMin = Infinity;
    for (let k = i - CONFIG.TROUGH_WINDOW + 1; k <= i; k++) if (closes[k] < windowMin) windowMin = closes[k];
    const isTrough = closes[i] === windowMin;
    if (!isTrough) { i++; continue; }

    if (blockedUntil !== null) {
      if (closes[i] > blockedUntil * (1 - CONFIG.CORRECTION_TO_RESET)) { i++; continue; }
      blockedUntil = null;
    }

    const troughClose = closes[i];
    const troughIdx = i;
    let j = i + 1;
    let confirmed = false;
    let confirmIdx = null;
    let runningPeak = troughClose;
    let runningPeakIdx = troughIdx;
    const endScan = Math.min(n, troughIdx + CONFIG.MAX_WAVE_WINDOW + 1);

    while (j < endScan) {
      const gain = closes[j] / troughClose - 1;
      if (!confirmed && gain >= threshold) { confirmed = true; confirmIdx = j; }
      if (closes[j] > runningPeak) { runningPeak = closes[j]; runningPeakIdx = j; }
      if (confirmed && closes[j] <= runningPeak * (1 - CONFIG.CORRECTION_TO_RESET)) break;
      j++;
    }

    if (confirmed) {
      waves.push({
        symbol: rows[0].symbol,
        troughDate: rows[troughIdx].date,
        troughIndex: troughIdx,
        troughClose,
        peakDate: rows[runningPeakIdx].date,
        peakIndex: runningPeakIdx,
        peakClose: runningPeak,
        peakGainPct: Math.round((runningPeak / troughClose - 1) * 100 * 1000) / 1000,
        daysToPeak: runningPeakIdx - troughIdx,
      });
      blockedUntil = runningPeak;
      i = runningPeakIdx + 1;
    } else {
      i = troughIdx + 1;
    }
  }

  return waves;
}

export function medianGapDays(waves: any[]): number | null {
  if (waves.length < 2) return null;
  const starts = waves.map((w) => w.troughIndex).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let k = 1; k < starts.length; k++) gaps.push(starts[k] - starts[k - 1]);
  return median(gaps);
}

/**
 * For each trading day, true if that day falls inside the window where,
 * based on this symbol's OWN historical median gap between past waves, the
 * next wave would be expected -- counted forward from every past wave's
 * trough. Needs at least MIN_WAVES_FOR_CYCLE waves to compute; otherwise
 * returns all-false (not enough history to estimate a personal cycle).
 */
export function cycleTimingFlags(rows: any[], waves: any[]): boolean[] {
  const n = rows.length;
  const flags = new Array(n).fill(false);
  if (waves.length < CONFIG.MIN_WAVES_FOR_CYCLE) return flags;
  const mg = medianGapDays(waves);
  if (!mg) return flags;
  const tol = Math.max(2, Math.floor(mg * CONFIG.CYCLE_TOLERANCE));
  const starts = waves.map((w) => w.troughIndex).sort((a, b) => a - b);
  for (const idx of starts) {
    const expected = idx + mg;
    const lo = Math.max(0, Math.floor(expected - tol));
    const hi = Math.min(n - 1, Math.floor(expected + tol));
    for (let k = lo; k <= hi; k++) flags[k] = true;
  }
  return flags;
}

// ---------------------------------------------------------------------------
// THE FIVE INDEPENDENT SUB-ENGINES (+ Engine D as a non-voting reference)
// ---------------------------------------------------------------------------
// Each function takes (rows, feats, ctFlags, i) for a single day index i and
// returns true/false -- completely independent of the other engines.

export function engineACycleHammer(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Standalone: 27.7% precision, 1.75x lift (n=643)
  return ctFlags[i] && feats[i].hammer;
}

export function engineBCycleRsi40to55(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Standalone: 27.5% precision, 1.74x lift (n=5531)
  return ctFlags[i] && feats[i].rsi40to55;
}

export function engineCCycleVolume3x(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Standalone: 26.9% precision, 1.71x lift (n=828)
  return ctFlags[i] && feats[i].volume3x;
}

export function engineDCycleAnyOfFour(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Reference only (not a voter): 26.8% precision, 1.70x lift (n=6697)
  if (!ctFlags[i]) return false;
  const f = feats[i];
  return f.hammer || f.rsi40to55 || f.volume3x || f.pullbackEma20;
}

export function engineECyclePullbackEma20(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Standalone: 25.7% precision, 1.63x lift (n=1505)
  return ctFlags[i] && feats[i].pullbackEma20;
}

export function engineFCycleRsi30to50(rows: any[], feats: any[], ctFlags: boolean[], i: number): boolean {
  // Standalone: 26.5% precision, 1.68x lift (n=6186)
  return ctFlags[i] && feats[i].rsi30to50;
}

/**
 * The five genuinely independent voting engines. Engine D is intentionally
 * excluded -- see module docstring for why including it would make the
 * combined vote collapse trivially onto Engine D's own flag.
 */
export const SUB_ENGINES = [
  { name: "Engine A: Cycle + Hammer", fn: engineACycleHammer, refPrecision: 0.277, refLift: 1.75 },
  { name: "Engine B: Cycle + RSI(40-55)", fn: engineBCycleRsi40to55, refPrecision: 0.275, refLift: 1.74 },
  { name: "Engine C: Cycle + Volume>=3x", fn: engineCCycleVolume3x, refPrecision: 0.269, refLift: 1.71 },
  { name: "Engine E: Cycle + PullbackEMA20", fn: engineECyclePullbackEma20, refPrecision: 0.257, refLift: 1.63 },
  { name: "Engine F: Cycle + RSI(30-50)", fn: engineFCycleRsi30to50, refPrecision: 0.265, refLift: 1.68 },
];

export const REFERENCE_ENGINE_D = {
  name: "Engine D: Cycle + Any-of-4 (reference, not a voter)",
  fn: engineDCycleAnyOfFour,
  refPrecision: 0.268,
  refLift: 1.70,
};

// ---------------------------------------------------------------------------
// Per-symbol analysis: run the 5 independent engines, then vote
// ---------------------------------------------------------------------------

/**
 * Runs all 5 independent sub-engines across a symbol's full history and
 * returns today's (last day's) vote result plus reference info used for
 * formatting an alert (last completed wave, typical wave size).
 *
 * @param {Array} rows - cleaned rows for one symbol (from loadIsxData)
 * @param {number} threshold - surge threshold, e.g. 0.03 for +3%
 * @param {number} votesRequired - how many engines must agree for combinedAlertToday
 */
export function analyzeSymbol(rows: any[], threshold = CONFIG.DEFAULT_THRESHOLD, votesRequired = CONFIG.VOTES_REQUIRED): any {
  if (rows.length < CONFIG.MIN_HISTORY) return null;

  const feats = buildFeatures(rows);
  const waves = detectWaves(rows, threshold);
  const ctFlags = cycleTimingFlags(rows, waves);
  const n = rows.length;

  // Run each engine across the symbol's FULL history (kept for backtest
  // aggregation) and read off the LAST day's value for today's alert.
  const engineDailyFlags: Record<string, boolean[]> = {};
  for (const { name, fn } of SUB_ENGINES) {
    const flags = new Array(n);
    for (let i = 0; i < n; i++) flags[i] = fn(rows, feats, ctFlags, i);
    engineDailyFlags[name] = flags;
  }

  const lastI = n - 1;
  const votesToday = SUB_ENGINES.filter(({ name }) => engineDailyFlags[name][lastI]).map((e) => e.name);
  const combinedAlertToday = votesToday.length >= votesRequired;

  const lastWave = waves.length ? waves[waves.length - 1] : null;
  const waveGains = waves.map((w) => w.peakGainPct);
  const medianWaveGainPct = waveGains.length ? median(waveGains) : null;

  const lastRow = rows[n - 1];
  const lastValue = lastRow.value ?? (lastRow.volume * lastRow.close);

  return {
    symbol: rows[0].symbol,
    nameAr: rows[0].nameAr || rows[0].symbol,
    rows: n,
    lastDate: lastRow.date,
    lastClose: lastRow.close,
    lastVolume: lastRow.volume,
    lastValue: lastValue,
    wavesTotal: waves.length,
    medianWaveGainPct,
    lastWave,
    votesToday,
    votesCountToday: votesToday.length,
    combinedAlertToday,
    engineDailyFlags, // kept for backtest aggregation; drop before serializing if not needed
  };
}

// ---------------------------------------------------------------------------
// Market-wide backtest: confirms each engine's standalone precision + the
// combined-vote precision, using the "one credit per event" rule (a wave
// can only ever count as one success, no matter how many days near it the
// condition held).
// ---------------------------------------------------------------------------

function eventNearFlags(rows: any[], waves: any[], leadDays: number | null = null): boolean[] {
  const n = rows.length;
  if (!waves.length) return new Array(n).fill(false);
  let lead = leadDays;
  if (lead === null) {
    const mg = medianGapDays(waves);
    lead = mg ? Math.max(3, Math.min(10, Math.floor(mg / 3))) : 10;
  }
  const near = new Array(n).fill(false);
  for (const w of waves) {
    const idx = w.troughIndex;
    const lo = Math.max(0, idx - (lead as number));
    for (let k = lo; k <= idx; k++) near[k] = true;
  }
  return near;
}

/**
 * Runs the full market-wide backtest: for every symbol, computes each
 * engine's daily flags, accumulates standalone precision/lift for each of
 * the 5 voting engines, the reference-only Engine D, and the combined vote
 * (>= votesRequired engines agree same day). Also returns per-symbol
 * results (including today's alert status) for building an alerts list.
 *
 * @param {Object} bySymbol - output of loadIsxData()
 * @param {number} threshold
 * @param {number} votesRequired
 */
export function runBacktest(bySymbol: Record<string, any[]>, threshold = CONFIG.DEFAULT_THRESHOLD, votesRequired = CONFIG.VOTES_REQUIRED): any {
  const perSymbolResults: Record<string, any> = {};
  const engineTotals: Record<string, { occ: number; succ: number }> = {};
  for (const { name } of SUB_ENGINES) engineTotals[name] = { occ: 0, succ: 0 };
  const combinedTotals = { occ: 0, succ: 0 };
  let baselineDays = 0;
  let baselineNear = 0;

  for (const symbol of Object.keys(bySymbol)) {
    const rows = bySymbol[symbol];
    if (rows.length < CONFIG.MIN_HISTORY) continue;

    const waves = detectWaves(rows, threshold);
    const near = eventNearFlags(rows, waves);
    const n = rows.length;

    baselineDays += n;
    for (let i = 0; i < n; i++) if (near[i]) baselineNear++;

    const result = analyzeSymbol(rows, threshold, votesRequired);
    if (!result) continue;
    perSymbolResults[symbol] = result;

    for (const { name } of SUB_ENGINES) {
      const flags = result.engineDailyFlags[name];
      for (let i = 0; i < n; i++) {
        if (flags[i]) {
          engineTotals[name].occ++;
          if (near[i]) engineTotals[name].succ++;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      let votes = 0;
      for (const { name } of SUB_ENGINES) if (result.engineDailyFlags[name][i]) votes++;
      if (votes >= votesRequired) {
        combinedTotals.occ++;
        if (near[i]) combinedTotals.succ++;
      }
    }
  }

  const baseline = baselineDays ? baselineNear / baselineDays : 0;

  const engineSummary = SUB_ENGINES.map(({ name }) => {
    const { occ, succ } = engineTotals[name];
    const precision = occ ? succ / occ : 0;
    const lift = baseline ? precision / baseline : 0;
    return { engine: name, occurrences: occ, successes: succ, precision: round4(precision), lift: round3(lift) };
  });

  // Engine D, reference only (not part of voting), computed the same way
  let dOcc = 0, dSucc = 0;
  for (const symbol of Object.keys(bySymbol)) {
    const rows = bySymbol[symbol];
    if (rows.length < CONFIG.MIN_HISTORY) continue;
    const feats = buildFeatures(rows);
    const waves = detectWaves(rows, threshold);
    const ctFlags = cycleTimingFlags(rows, waves);
    const near = eventNearFlags(rows, waves);
    for (let i = 0; i < rows.length; i++) {
      if (engineDCycleAnyOfFour(rows, feats, ctFlags, i)) {
        dOcc++;
        if (near[i]) dSucc++;
      }
    }
  }
  const dPrecision = dOcc ? dSucc / dOcc : 0;
  const dLift = baseline ? dPrecision / baseline : 0;
  const referenceEngineD = {
    engine: REFERENCE_ENGINE_D.name,
    occurrences: dOcc,
    successes: dSucc,
    precision: round4(dPrecision),
    lift: round3(dLift),
  };

  const combinedPrecision = combinedTotals.occ ? combinedTotals.succ / combinedTotals.occ : 0;
  const combinedLift = baseline ? combinedPrecision / baseline : 0;

  return {
    baselinePrecision: round4(baseline),
    engineSummary,
    referenceEngineD,
    combinedVoteSummary: {
      votesRequired,
      occurrences: combinedTotals.occ,
      successes: combinedTotals.succ,
      precision: round4(combinedPrecision),
      lift: round3(combinedLift),
    },
    perSymbolResults,
  };
}

function round4(x: number) { return Math.round(x * 10000) / 10000; }
function round3(x: number) { return Math.round(x * 1000) / 1000; }

// ---------------------------------------------------------------------------
// Alert formatting (for Telegram, UI cards, etc.): symbol, entry price,
// expected target, last wave range, engines agreed.
// ---------------------------------------------------------------------------

/**
 * Formats a human-readable Arabic alert message for a single symbol result
 * (as returned by analyzeSymbol / found in runBacktest().perSymbolResults).
 */
export function formatAlert(result: any): string {
  const symbol = result.symbol;
  const companyName = result.nameAr && result.nameAr !== symbol ? result.nameAr : '';
  const displayName = companyName ? `${companyName} (<code>${symbol}</code>)` : `(<code>${symbol}</code>)`;
  const entryPrice = result.lastClose; // today's close = entry/reference price
  const lastWave = result.lastWave;
  const medianGain = result.medianWaveGainPct;

  const expectedHigh = medianGain ? Math.round(entryPrice * (1 + medianGain / 100) * 10000) / 10000 : null;

  const lines = [
    `🚨 تنبيه محرك دورات الصعود والتصويت 🚨\n`,
    `🏦 الشركة: ${displayName}`,
    `💰 السعر الحالي (منطقة الدخول المحتملة): ${entryPrice}`,
  ];
  if (expectedHigh !== null) {
    lines.push(`🎯 الهدف المتوقع (بناء على متوسط موجات هذا السهم تاريخياً +${medianGain.toFixed(1)}%): ${expectedHigh}`);
  }
  if (lastWave) {
    lines.push(
      `🌊 آخر موجة صعود مسجلة: من ${lastWave.troughClose} بتاريخ ${lastWave.troughDate} ` +
      `إلى ${lastWave.peakClose} بتاريخ ${lastWave.peakDate} (+${lastWave.peakGainPct.toFixed(1)}%)`
    );
  }
  lines.push(`🛰 عدد المحركات المتفقة اليوم: ${result.votesCountToday}/5`);
  return lines.join("\n");
}

/**
 * Returns a plain-object version of a symbol result with engineDailyFlags
 * stripped out (that field is large and only needed internally for
 * backtest aggregation) -- convenient for sending to a UI, Sheet, or
 * Telegram webhook as JSON.
 */
export function toAlertRecord(result: any): any {
  const expectedTarget = result.medianWaveGainPct
    ? Math.round(result.lastClose * (1 + result.medianWaveGainPct / 100) * 10000) / 10000
    : null;
  return {
    symbol: result.symbol,
    nameAr: result.nameAr || result.symbol,
    date: result.lastDate,
    entryPrice: result.lastClose,
    lastVolume: result.lastVolume,
    lastValue: result.lastValue,
    expectedTarget,
    votesCount: result.votesCountToday,
    votesEngines: result.votesToday.join(", "),
    lastWaveLow: result.lastWave ? result.lastWave.troughClose : null,
    lastWaveHigh: result.lastWave ? result.lastWave.peakClose : null,
    lastWaveGainPct: result.lastWave ? result.lastWave.peakGainPct : null,
  };
}

/**
 * Convenience one-shot: given raw parsed ISX JSON, runs the full backtest
 * and returns { summary, alerts } where alerts is the sorted list of
 * today's combined-vote alerts (as plain records, ready for a UI table or
 * a Telegram loop).
 */
export function runIsxEngine(
  rawIsxJson: any,
  options: { threshold?: number; votesRequired?: number; minVolume?: number; minLiquidity?: number } = {}
): { summary: any; alerts: any[] } {
  const threshold = options.threshold ?? CONFIG.DEFAULT_THRESHOLD;
  const votesRequired = options.votesRequired ?? CONFIG.VOTES_REQUIRED;
  const minVolume = options.minVolume ?? 500000; // شرط حجم التداول اليومي في آخر يوم تداول: أكثر من 500,000 سهم

  const bySymbol = loadIsxData(rawIsxJson);
  const bt = runBacktest(bySymbol, threshold, votesRequired);

  const alerts = Object.values(bt.perSymbolResults)
    .filter((r: any) => r.combinedAlertToday && (r.lastVolume === undefined || r.lastVolume >= minVolume))
    .sort((a: any, b: any) => b.votesCountToday - a.votesCountToday)
    .map((r: any) => ({ ...toAlertRecord(r), message: formatAlert(r) }));

  const summary = {
    engine: "ISX Surge Cycle Engine - Final (5 independent sub-engines + voting)",
    researchOnly: true,
    investmentRecommendation: false,
    surgeThreshold: threshold,
    votesRequired,
    minVolume,
    baselinePrecision: bt.baselinePrecision,
    engineSummary: bt.engineSummary,
    referenceEngineD: bt.referenceEngineD,
    combinedVoteSummary: bt.combinedVoteSummary,
    alertsTodayCount: alerts.length,
    symbolsLoaded: Object.keys(bySymbol).length,
    symbolsProcessed: Object.keys(bt.perSymbolResults).length,
  };

  return { summary, alerts };
}
