import { ISXCompany, DailyBar } from '../types/isx';

export type OpportunityTimeframe = '1m' | '2m' | '3m' | '6m';

export type OpportunitySignal = 
  | 'فرصة شراء قوية'
  | 'فرصة شراء'
  | 'إشارة بيع قوية'
  | 'إشارة بيع'
  | 'مراقبة (بلا إشارة حاسمة)';

export interface StockEligibility {
  isEligible: boolean;
  avgDailyValue: number;
  avgDailyTrades: number;
  activeDaysCount: number;
  totalDaysInPeriod: number;
  activeDaysRatio: number;
  exclusionReason?: string;
}

export interface OpportunityItem {
  company: ISXCompany;
  signal: OpportunitySignal;
  signalCategory: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'WATCH';
  eligibility: StockEligibility;
  summarySnippet: string; // 3-4 lines executive summary snippet
}

export interface OpportunityEngineResult {
  timeframe: OpportunityTimeframe;
  minDailyValueConfig: number;
  minDailyTradesConfig: number;
  buyOpportunities: OpportunityItem[];
  sellSignals: OpportunityItem[];
  watchList: OpportunityItem[];
  ineligibleList: { company: ISXCompany; eligibility: StockEligibility }[];
}

/**
 * Runs the Auto Opportunity Screener (مُقترِح الفرص التلقائي) according to Document 5 rules.
 */
export function runAutoOpportunityScreener(
  companies: ISXCompany[],
  options?: {
    timeframe?: OpportunityTimeframe;
    minDailyValue?: number; // IQD, default 5,000,000
    minDailyTrades?: number; // default 10
    minActiveRatio?: number; // default 0.50
  }
): OpportunityEngineResult {
  const timeframe = options?.timeframe || '2m';
  const minDailyValue = options?.minDailyValue ?? 5000000;
  const minDailyTrades = options?.minDailyTrades ?? 10;
  const minActiveRatio = options?.minActiveRatio ?? 0.50;

  // Approximate trading bars per period
  let periodDays = 40; // 2 months
  if (timeframe === '1m') periodDays = 20;
  if (timeframe === '3m') periodDays = 60;
  if (timeframe === '6m') periodDays = 120;

  const buyOpportunities: OpportunityItem[] = [];
  const sellSignals: OpportunityItem[] = [];
  const watchList: OpportunityItem[] = [];
  const ineligibleList: { company: ISXCompany; eligibility: StockEligibility }[] = [];

  companies.forEach((company) => {
    const bars = company.history || [];
    const recentBars = bars.slice(-periodDays);

    const activeBars = recentBars.filter((b) => b.volume > 0 || b.trades > 0);
    const activeDaysCount = activeBars.length;
    const totalDaysInPeriod = periodDays;
    const activeDaysRatio = totalDaysInPeriod > 0 ? activeDaysCount / totalDaysInPeriod : 0;

    const totalVal = activeBars.reduce((sum, b) => sum + (b.value || b.volume * b.close), 0);
    const totalTrades = activeBars.reduce((sum, b) => sum + (b.trades || 1), 0);

    const avgDailyValue = activeDaysCount > 0 ? totalVal / activeDaysCount : 0;
    const avgDailyTrades = activeDaysCount > 0 ? totalTrades / activeDaysCount : 0;

    // Check Eligibility Step 1
    const reasons: string[] = [];
    if (avgDailyValue < minDailyValue) {
      reasons.push(`متوسط السيولة اليومية (${(avgDailyValue / 1000000).toFixed(2)}M) أقل من الحد الأدنى (5M د.ع)`);
    }
    if (avgDailyTrades < minDailyTrades) {
      reasons.push(`متوسط الصفقات اليومية (${avgDailyTrades.toFixed(1)}) أقل من 10 صفقات`);
    }
    if (activeDaysRatio < minActiveRatio) {
      reasons.push(`نسبة أيام التداول الفعلية (${Math.round(activeDaysRatio * 100)}%) أقل من 50%`);
    }

    const isEligible = reasons.length === 0;

    const eligibility: StockEligibility = {
      isEligible,
      avgDailyValue,
      avgDailyTrades,
      activeDaysCount,
      totalDaysInPeriod,
      activeDaysRatio,
      exclusionReason: reasons.join(' • ')
    };

    if (!isEligible) {
      ineligibleList.push({ company, eligibility });
      return;
    }

    // Categorization Step 2
    const score = company.evaluation.compositeScore;
    const mediumTrend = company.evaluation.trendAnalysis?.mediumTerm?.level || 'جانبي';
    const isBullish = mediumTrend.includes('صاعد');
    const isBearish = mediumTrend.includes('هابط');

    let signal: OpportunitySignal = 'مراقبة (بلا إشارة حاسمة)';
    let signalCategory: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'WATCH' = 'WATCH';

    if (score >= 80 && isBullish) {
      signal = 'فرصة شراء قوية';
      signalCategory = 'STRONG_BUY';
    } else if (score >= 70 && score <= 79 && isBullish) {
      signal = 'فرصة شراء';
      signalCategory = 'BUY';
    } else if (score <= 25 && isBearish) {
      signal = 'إشارة بيع قوية';
      signalCategory = 'STRONG_SELL';
    } else if (score >= 26 && score <= 35 && isBearish) {
      signal = 'إشارة بيع';
      signalCategory = 'SELL';
    }

    // Generate 3-4 line Executive Summary Snippet for the card
    const sup1 = company.evaluation?.supports?.[0]?.price != null
      ? `${company.evaluation.supports[0].price.toFixed(3)} د.ع`
      : 'غير محدد';
    const res1 = company.evaluation?.resistances?.[0]?.price != null
      ? `${company.evaluation.resistances[0].price.toFixed(3)} د.ع`
      : 'غير محدد';

    const currentP = company.currentPrice ?? 0;
    const chgP = company.changePct ?? 0;
    const summarySnippet = `السعر: ${currentP.toFixed(2)} د.ع (${chgP >= 0 ? '+' : ''}${chgP.toFixed(2)}%) • الدرجة المركبة: ${score}/100 (${company.evaluation?.tier || '-'})
الاتجاه متوسط المدى: ${mediumTrend} • أقرب دعم: ${sup1} | أقرب مقاومة: ${res1}
متوسط التداول: ${((avgDailyValue ?? 0) / 1000000).toFixed(2)}M د.ع/يوم بـ ${Math.round(avgDailyTrades ?? 0)} صفقة • الثقة: ${company.evaluation?.confidenceScore || '-'}`;

    const item: OpportunityItem = {
      company,
      signal,
      signalCategory,
      eligibility,
      summarySnippet
    };

    if (signalCategory === 'STRONG_BUY' || signalCategory === 'BUY') {
      buyOpportunities.push(item);
    } else if (signalCategory === 'STRONG_SELL' || signalCategory === 'SELL') {
      sellSignals.push(item);
    } else {
      watchList.push(item);
    }
  });

  // Sort buy opportunities descending by Composite Score
  buyOpportunities.sort((a, b) => b.company.evaluation.compositeScore - a.company.evaluation.compositeScore);

  // Sort sell signals ascending by Composite Score (worst score first)
  sellSignals.sort((a, b) => a.company.evaluation.compositeScore - b.company.evaluation.compositeScore);

  // Sort watch list descending by Composite Score
  watchList.sort((a, b) => b.company.evaluation.compositeScore - a.company.evaluation.compositeScore);

  return {
    timeframe,
    minDailyValueConfig: minDailyValue,
    minDailyTradesConfig: minDailyTrades,
    buyOpportunities,
    sellSignals,
    watchList,
    ineligibleList
  };
}
