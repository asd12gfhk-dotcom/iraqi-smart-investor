export type ISXSector = 
  | 'المصارف'
  | 'الاتصالات'
  | 'الصناعة'
  | 'الخدمات'
  | 'الزراعة'
  | 'الفنادق والسياحة'
  | 'الاستثمار'
  | 'العقارات';

export type ISXTradingStatus = 'متداولة' | 'موقوفة' | 'مدرجة حديثاً';

export interface NonIraqiTradingData {
  buyVolume: number;
  sellVolume: number;
  netVolume: number; // buy - sell
  buyValue: number; // IQD
  sellValue: number; // IQD
  netValue: number; // IQD
  accumulationTrend: 'تجميع مكثف' | 'تجميع خفيف' | 'محايد' | 'تصريف خفيف' | 'تصريف مكثف';
  alignmentWithPrice: 'متوافق إيجابياً' | 'متوافق سلباً' | 'انحراف إيجابي' | 'انحراف سلبي' | 'غير مرتبط';
  influenceScore: number; // 0 to 100
}

export interface DailyBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number; // IQD
  trades: number;
  nonIraqiNetVolume: number;
}

export type IndicatorState = 'صالح' | 'بيانات غير كافية' | 'غير محسوب' | 'خطأ بالحساب';

export interface PivotPoints {
  p: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface FibonacciLevels {
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
  ext127: number;
  ext161: number;
  ext261: number;
}

export interface TechnicalIndicators {
  // General Info
  activeBarsCount: number; // عدد الجلسات الفعلية ذات التداول الفعلي
  indicatorStatuses: Record<string, IndicatorState>; // حالة صلاحية كل مؤشر

  // Moving Averages
  sma10: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  wma20: number;

  // Momentum Indicators
  rsi14: number;
  rsiStatus: 'منطقة إفراط في الشراء (>70)' | 'منطقة إفراط في البيع (<30)' | 'منطقة زَخَم معتدل (30-70)';
  stochasticRSI: number;
  roc12: number;
  momentum10: number;
  cci20: number;

  // Trend Indicators
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  macdSignalType: 'تقاطع إيجابي صاعد' | 'تقاطع سلبي هابط' | 'محايد فوق خط الصفر' | 'محايد تحت خط الصفر';
  adx14: number;
  plusDI14: number;
  minusDI14: number;
  superTrend: number;
  aroonUp: number;
  aroonDown: number;

  // Volume Indicators
  obv: number;
  mfi14: number;
  vwap: number;
  volumeRatio20: number; // Current volume / 20-day avg volume
  accumulationDistribution: number;

  // Volatility Indicators
  atr14: number;
  volatilityPct: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  bollingerPosition: 'أعلى القناة' | 'أسفل القناة' | 'وسط القناة' | 'اختراق صاعد' | 'انكسار هابط';
  stochasticK: number;
  stochasticD: number;
  stochasticStatus: 'إفراط شراء' | 'إفراط بيع' | 'متوازن';
  keltnerUpper: number;
  keltnerLower: number;
  donchianUpper: number;
  donchianLower: number;

  // Additional Indicators
  pivots: PivotPoints;
  fibonacci: FibonacciLevels;
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  parabolicSAR: number;

  // Patterns & Trends
  trendDirection: 'صاعد قوي' | 'صاعد معتدل' | 'عرضي/تذبذب' | 'هابط معتدل' | 'هابط قوي';
  trendADX: number; // 0 to 100
  detectedPattern: 'قاع مزدوج صاعد' | 'قمة مزدوجة هابطة' | 'اختراق مستوى مقاومة' | 'كسر مستوى دعم' | 'نموذج علم صاعد' | 'لا يوجد نموذج مؤكد';
}

export interface ScoreBreakdown {
  trendScore: number;       // 0-100
  momentumScore: number;    // 0-100
  volumeScore: number;      // 0-100
  liquidityScore: number;   // 0-100
  patternScore: number;     // 0-100
  foreignScore: number;     // 0-100
  total: number;            // 0-100
}

export type TrendLevel = 'جانبي' | 'صاعد قوي' | 'صاعد' | 'هابط قوي' | 'هابط';

export interface TrendLevelDetails {
  level: TrendLevel;
  priceDiffPct: number;
  slopePct: number;
}

export interface TrendAnalysis {
  shortTerm: TrendLevelDetails;
  mediumTerm: TrendLevelDetails;
  longTerm: TrendLevelDetails;
  strengthScore: number; // 0-100
  alignment: 'توافق صاعد تام' | 'توافق هابط تام' | 'مرحلة انتقالية / تباين';
}

export interface SupportResistanceLevel {
  price: number;
  type: 'دعم' | 'مقاومة';
  bounceCount: number;
  score: number; // 0-5 points
  strengthLabel: 'قوي جداً' | 'قوي' | 'متوسط' | 'ضعيف';
  nearSMA: boolean;
  nearFibonacci: boolean;
  highVolume: boolean;
}

export interface ConfirmedMajorMove {
  type: 'صعود' | 'هبوط';
  startDate: string;
  startPrice: number;
  endDate: string;
  endPrice: number;
  changePct: number;
  activeTradingDays: number;
}

export interface MajorMovesStats {
  avgBullishPct: number;
  avgBearishPct: number;
  avgBearishActiveDays: number;
}

export type RatingTier = 'ممتاز' | 'جيد جداً' | 'جيد' | 'محايد' | 'ضعيف' | 'ضعيف جداً';

export type ConfidenceScore = 'مرتفع' | 'جيد' | 'متوسط' | 'منخفض';

export interface CoreV22Systems {
  moneyRotation: {
    classification: 'دخول سيولة' | 'خروج سيولة' | 'استقرار' | 'تدوير سيولة';
    stockShareCurrentPct: number;
    stockSharePrevPct: number;
    shareDiffPct: number;
    sectorTrend: 'صاعد' | 'هابط' | 'مستقر';
  };
  volatility: {
    dailyAtrPct: number;
    weeklyAtrPct: number;
    monthlyAtrPct: number;
    avgAtrPct: number;
    classification: 'مرتفع جداً' | 'مرتفع' | 'طبيعي' | 'منخفض';
  };
  breakout: {
    isBreakoutOrBreakdown: boolean;
    type: 'اختراق مقاومة' | 'كسر دعم' | 'لا يوجد';
    volumeRatio: number;
    isClosedBeyond: boolean;
    qualification: 'اختراق مؤهل للتقييم' | 'اختراق ضعيف غير مؤهل' | 'لا يوجد اختراق';
  };
  falseBreakout: {
    status: 'اختراق حقيقي' | 'اختراق كاذب' | 'قيد التأكيد' | 'غير ينطبق';
    sessionsObserved: number;
  };
  accumulationDistribution: {
    classification: 'تجميع' | 'تصريف' | 'حياد';
    confidencePct: number;
    positiveSourcesCount: number;
    totalSourcesCount: number;
    obvTrend: 'صاعد' | 'هابط';
    adTrend: 'صاعد' | 'هابط';
    mfiPositive: boolean;
    foreignPositive?: boolean;
  };
  trendStrength: {
    score: number;
    stars: number;
    starsStr: string;
  };
  momentumEngine: {
    score: number;
    status: 'تسارع الزخم' | 'تباطؤ الزخم' | 'انعكاس الزخم' | 'زخم مستقر';
    rsiCrossed50: boolean;
    change5Sessions: number;
  };
  volumeAgreement: {
    status: 'يؤكد الاتجاه' | 'يخالف الاتجاه' | 'محايد';
    volumeScore: number;
  };
  liquidityPower: {
    score: number;
    stars: number;
    starsStr: string;
  };
  priceQuality: {
    score: number;
    stars: number;
    starsStr: string;
    reversalsCount: number;
    trendConsistencyPct: number;
  };
  trendHealth: {
    score: number;
    stars: number;
    starsStr: string;
    metConditionsCount: number;
    totalConditionsCount: number;
  };
  foreignActivity?: {
    score: number;
    stars: number;
    starsStr: string;
    participationScore: number;
    correlationScore: number;
    continuityScore: number;
  };
  finalScoreboard: {
    trendScore: { value: number; stars: number; starsStr: string };
    momentumScore: { value: number; stars: number; starsStr: string };
    volumeScore: { value: number; stars: number; starsStr: string };
    liquidityScore: { value: number; stars: number; starsStr: string };
    patternScore: { value: number; stars: number; starsStr: string };
    foreignScore: { value: number; stars: number; starsStr: string };
    confidenceScore: { value: number; stars: number; starsStr: string };
    compositeScore: { value: number; stars: number; starsStr: string };
    dataQualityScore: { value: number; stars: number; starsStr: string };
    signalStrengthScore: { value: number; stars: number; starsStr: string };
  };
}

export function convertScoreToStars(score: number): { stars: number; count: number; starsStr: string } {
  const s = Math.round(score);
  if (s >= 90) return { stars: 5, count: 5, starsStr: '★★★★★' };
  if (s >= 75) return { stars: 4, count: 4, starsStr: '★★★★☆' };
  if (s >= 60) return { stars: 3, count: 3, starsStr: '★★★☆☆' };
  if (s >= 40) return { stars: 2, count: 2, starsStr: '★★☆☆☆' };
  return { stars: 1, count: 1, starsStr: '★☆☆☆☆' };
}

export interface DynamicWeights {
  trend: number;
  momentum: number;
  volume: number;
  liquidity: number;
  pattern: number;
  foreign: number;
}

export interface IndicatorExplanation {
  name: string;
  status: string;
  reason: string;
  impact: string;
}

export interface ExecutiveSummaryContent {
  technicalStrengthText: string;
  trendText: string;
  volumeText: string;
  liquidityText: string;
  hasForeignData: boolean;
  foreignText?: string;
  nearestSupportText: string;
  nearestResistanceText: string;
  confidenceText: string;
}

export interface TechnicalReportData {
  generalStatusSentence: string;
  compositeExplanations: string[];
  confidenceExplanation?: string;
  trendAlignmentSentence: string;
  executiveSummary: ExecutiveSummaryContent;
  indicatorStatusesTable: {
    rsi: string;
    macd: string;
    ema: string;
    adx: string;
    atr: string;
  };
  indicatorExplanations: IndicatorExplanation[];
  trendExplanationParagraph: string;
  volumeAnalysisSentence: string;
  liquidityAnalysisSentence: string;
  foreignersReport: {
    hasData: boolean;
    netStatusText: string;
    interpretationSentence: string;
    fullText: string;
  };
  technicalRisks: string[];
}

export interface StockEvaluation {
  tier: RatingTier;
  stars: number; // 1 to 5 stars
  badgeBg: string;
  badgeTextColor: string;
  compositeScore: number; // 0-100
  compositeInterpretation: string; // e.g. 'قوة فنية استثنائية'
  confidenceScore: ConfidenceScore;
  marketState: 'سوق جانبي' | 'اتجاه قوي' | 'عادية';
  scoreBreakdown: ScoreBreakdown;
  weightsUsed: DynamicWeights;
  trendAnalysis: TrendAnalysis;
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  recentMajorMoves: ConfirmedMajorMove[];
  majorMovesStats: MajorMovesStats;
  pros: string[];
  cons: string[];
  actionRecommendation: string;
  executiveSummaryText: string;
  report: TechnicalReportData;
  coreV22?: CoreV22Systems;
}

export interface ISXCompany {
  ticker: string;          // e.g. BBOB
  nameAr: string;          // e.g. مصرف بغداد
  nameEn: string;          // e.g. Bank of Baghdad
  sector: ISXSector;
  status: ISXTradingStatus;
  currentPrice: number;    // e.g. 4.32 IQD
  prevClose: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  avgPrice: number;
  volume: number;          // shares
  value: number;           // IQD
  tradesCount: number;
  marketCap: number;       // IQD
  sharesTotal: number;
  nonIraqi: NonIraqiTradingData;
  history: DailyBar[];
  indicators: TechnicalIndicators;
  evaluation: StockEvaluation;
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  shares: number;
  avgBuyPrice: number;
  notes?: string;
}

export interface AlertRule {
  id: string;
  ticker: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_ABOVE' | 'RSI_BELOW' | 'SCORE_ABOVE';
  targetValue: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  telegramNotified?: boolean;
  note?: string;
}

export interface MarketIndexData {
  indexName: string;
  currentValue: number;
  prevValue: number;
  change: number;
  changePct: number;
  history: { date: string; value: number }[];
}

export interface MarketSummary {
  tradingDate: string;
  isx60: MarketIndexData;
  isx15: MarketIndexData;
  totalVolume: number;
  totalValue: number;
  totalTrades: number;
  advancersCount: number;
  declinersCount: number;
  unchangedCount: number;
  tradedCompaniesCount: number;
  foreignerNetBuyTotalValue: number;
}
