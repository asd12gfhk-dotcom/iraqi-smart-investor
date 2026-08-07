import React, { useState } from 'react';
import { 
  Filter, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  Sparkles, 
  Bookmark, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  SlidersHorizontal,
  Info,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { 
  runAutoOpportunityScreener, 
  OpportunityTimeframe, 
  OpportunityEngineResult 
} from '../utils/opportunityEngine';

interface StockScreenerProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

export const StockScreener: React.FC<StockScreenerProps> = ({ companies, onSelectStock }) => {
  const [activeMode, setActiveMode] = useState<'AUTO_OPPORTUNITY' | 'MANUAL_SCREENER'>('AUTO_OPPORTUNITY');

  // Manual Screener State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [trendFilter, setTrendFilter] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [changeType, setChangeType] = useState<string>('ALL');
  const [volumeFilter, setVolumeFilter] = useState<string>('ALL');
  const [liquidityFilter, setLiquidityFilter] = useState<string>('ALL');
  const [foreignerFilter, setForeignerFilter] = useState<string>('ALL');
  const [rsiFilter, setRsiFilter] = useState<string>('ALL');
  const [macdFilter, setMacdFilter] = useState<string>('ALL');
  const [adxFilter, setAdxFilter] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);

  const [sortField, setSortField] = useState<
    'score' | 'price' | 'change' | 'volume' | 'liquidity' | 'rsi' | 'adx' | 'macd'
  >('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Saved Search Presets
  const [savedPreset, setSavedPreset] = useState<string>('NONE');

  // Auto Opportunity Screener Parameters
  const [timeframe, setTimeframe] = useState<OpportunityTimeframe>('2m');
  const [minDailyValue, setMinDailyValue] = useState<number>(5000000); // 5 Million IQD default

  // Run Auto Opportunity Screener
  const autoResults: OpportunityEngineResult = runAutoOpportunityScreener(companies, {
    timeframe,
    minDailyValue,
    minDailyTrades: 10,
    minActiveRatio: 0.50
  });

  // Apply Presets
  const applyPreset = (presetKey: string) => {
    setSavedPreset(presetKey);
    if (presetKey === 'SPECULATION') {
      // أسهم المضاربة: تغير عالي وزخم قوي
      setMinScore(60);
      setRsiFilter('OVERSOLD');
      setVolumeFilter('EXCEPTIONAL');
      setTrendFilter('ALL');
    } else if (presetKey === 'BULLISH_TREND') {
      // أسهم الاتجاه الصاعد
      setTrendFilter('STRONG_BULLISH');
      setMinScore(70);
      setChangeType('BULLISH');
    } else if (presetKey === 'FOREIGN_ACCUMULATION') {
      // أسهم التجميع الأجنبي
      setForeignerFilter('ACCUMULATION');
      setMinScore(50);
    } else if (presetKey === 'HIGH_LIQUIDITY') {
      // أسهم السيولة العالية
      setLiquidityFilter('HIGH');
      setMinScore(50);
    } else {
      // Reset
      setSelectedSector('ALL');
      setSelectedTier('ALL');
      setTrendFilter('ALL');
      setMinPrice('');
      setMaxPrice('');
      setChangeType('ALL');
      setVolumeFilter('ALL');
      setLiquidityFilter('ALL');
      setForeignerFilter('ALL');
      setRsiFilter('ALL');
      setMacdFilter('ALL');
      setAdxFilter('ALL');
      setMinScore(0);
    }
  };

  // Filter Manual Screener Companies
  const filteredManual = companies.filter((c) => {
    if (selectedSector !== 'ALL' && c.sector !== selectedSector) return false;
    if (selectedTier !== 'ALL' && c.evaluation.tier !== selectedTier) return false;
    if (c.evaluation.compositeScore < minScore) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        c.ticker.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.nameEn.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Price Filter
    if (minPrice && c.currentPrice < parseFloat(minPrice)) return false;
    if (maxPrice && c.currentPrice > parseFloat(maxPrice)) return false;

    // Change Type Filter
    if (changeType === 'BULLISH' && c.changePct <= 0) return false;
    if (changeType === 'BEARISH' && c.changePct >= 0) return false;

    // Trend Filter
    const mediumTrend = c.evaluation.trendAnalysis?.mediumTerm?.level || c.indicators.trendDirection;
    if (trendFilter === 'STRONG_BULLISH' && !mediumTrend.includes('صاعد قوي')) return false;
    if (trendFilter === 'BULLISH' && !mediumTrend.includes('صاعد')) return false;
    if (trendFilter === 'SIDEWAYS' && !mediumTrend.includes('جانبي') && !mediumTrend.includes('عرضي')) return false;
    if (trendFilter === 'BEARISH' && !mediumTrend.includes('هابط')) return false;
    if (trendFilter === 'STRONG_BEARISH' && !mediumTrend.includes('هابط قوي')) return false;

    // Volume Filter
    if (volumeFilter === 'ABOVE_AVG' && c.indicators.volumeRatio20 <= 1.0) return false;
    if (volumeFilter === 'BELOW_AVG' && c.indicators.volumeRatio20 >= 1.0) return false;
    if (volumeFilter === 'EXCEPTIONAL' && c.indicators.volumeRatio20 <= 1.5) return false;

    // Liquidity Filter
    if (liquidityFilter === 'HIGH' && c.evaluation.scoreBreakdown.liquidityScore < 70) return false;
    if (liquidityFilter === 'MEDIUM' && (c.evaluation.scoreBreakdown.liquidityScore < 40 || c.evaluation.scoreBreakdown.liquidityScore > 70)) return false;
    if (liquidityFilter === 'LOW' && c.evaluation.scoreBreakdown.liquidityScore > 40) return false;

    // Non-Iraqi Filter
    if (foreignerFilter === 'NET_BUY' && c.nonIraqi.netValue <= 0) return false;
    if (foreignerFilter === 'NET_SELL' && c.nonIraqi.netValue >= 0) return false;
    if (foreignerFilter === 'ACCUMULATION' && !c.nonIraqi.accumulationTrend.includes('تجميع')) return false;
    if (foreignerFilter === 'DISTRIBUTION' && !c.nonIraqi.accumulationTrend.includes('تصريف')) return false;

    // Technical Indicators Filters
    if (rsiFilter === 'OVERSOLD' && c.indicators.rsi14 >= 35) return false;
    if (rsiFilter === 'OVERBOUGHT' && c.indicators.rsi14 <= 65) return false;
    if (rsiFilter === 'NEUTRAL' && (c.indicators.rsi14 < 35 || c.indicators.rsi14 > 65)) return false;

    if (macdFilter === 'BULLISH' && !c.indicators.macdSignalType.includes('إيجابي')) return false;
    if (macdFilter === 'BEARISH' && !c.indicators.macdSignalType.includes('سلبي')) return false;

    if (adxFilter === 'STRONG' && c.indicators.adx14 < 25) return false;
    if (adxFilter === 'WEAK' && c.indicators.adx14 >= 25) return false;

    return true;
  });

  // Sort Manual Screener Results
  const sortedManual = [...filteredManual].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (sortField === 'score') {
      valA = a.evaluation.compositeScore;
      valB = b.evaluation.compositeScore;
    } else if (sortField === 'price') {
      valA = a.currentPrice;
      valB = b.currentPrice;
    } else if (sortField === 'change') {
      valA = a.changePct;
      valB = b.changePct;
    } else if (sortField === 'volume') {
      valA = a.volume;
      valB = b.volume;
    } else if (sortField === 'liquidity') {
      valA = a.evaluation.scoreBreakdown.liquidityScore;
      valB = b.evaluation.scoreBreakdown.liquidityScore;
    } else if (sortField === 'rsi') {
      valA = a.indicators.rsi14;
      valB = b.indicators.rsi14;
    } else if (sortField === 'adx') {
      valA = a.indicators.adx14;
      valB = b.indicators.adx14;
    } else if (sortField === 'macd') {
      valA = a.indicators.macdHist;
      valB = b.indicators.macdHist;
    }

    return sortAsc ? valA - valB : valB - valA;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Screener Sub-Header & Mode Switcher */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" /> مستكشف ومُقترِح السوق الذكي (ISX Screener V2)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            البحث عن الفرص وفق نتائج التحليل الفني الحتمي، فلترة الأهلية والسيولة، وقواعد الحسم الخالية من التعارض.
          </p>
        </div>

        {/* Navigation Tabs between Auto Opportunity & Manual Screener */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveMode('AUTO_OPPORTUNITY')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'AUTO_OPPORTUNITY'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>مُقترِح الفرص التلقائي (Auto Screener)</span>
          </button>
          <button
            onClick={() => setActiveMode('MANUAL_SCREENER')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'MANUAL_SCREENER'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>مستكشف السوق الحر (Custom Screener)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: AUTO OPPORTUNITY SCREENER */}
      {activeMode === 'AUTO_OPPORTUNITY' && (
        <div className="space-y-6">
          {/* Step 1 Eligibility Banner & Configuration */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">شروط فلترة الأهلية والسيولة (Step 1 Eligibility)</h3>
                  <p className="text-amber-800 text-[11px]">
                    يُستبعد تلقائياً أي سهم ضعيف التداول لا يحقق أدنى مقومات السيولة الفعلية.
                  </p>
                </div>
              </div>

              {/* Controls for Timeframe and Min Daily Value */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-700">الفترة الزمنية:</span>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as OpportunityTimeframe)}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold focus:outline-none"
                  >
                    <option value="1m">شهر (1m)</option>
                    <option value="2m">شهرين (2m - افتراضي)</option>
                    <option value="3m">3 أشهر (3m)</option>
                    <option value="6m">6 أشهر (6m)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-700">أدنى سيولة يومية:</span>
                  <select
                    value={minDailyValue}
                    onChange={(e) => setMinDailyValue(Number(e.target.value))}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold focus:outline-none"
                  >
                    <option value={2000000}>2 مليون د.ع</option>
                    <option value={5000000}>5 مليون د.ع (افتراضي)</option>
                    <option value={10000000}>10 مليون د.ع</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-amber-900">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                • <strong>متوسط تداول يومي:</strong> ≥ {(minDailyValue / 1000000).toFixed(1)} مليون د.ع
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                • <strong>متوسط عدد الصفقات:</strong> ≥ 10 صفقات يومياً
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                • <strong>أيام التداول الفعلية:</strong> ≥ 50% من إجمالي الجلسات
              </div>
            </div>
          </div>

          {/* Section 1: Top 10 Buy Opportunities */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> أعلى فرص الشراء المؤهلة (فرصة شراء قوية / فرصة شراء)
              </h3>
              <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full font-bold">
                {autoResults.buyOpportunities.length} سهم مطبق للشروط الحتمية
              </span>
            </div>

            {autoResults.buyOpportunities.length === 0 ? (
              <p className="text-zinc-500 text-xs py-4 text-center">
                لا توجد أسهم تستوفي حالياً شروط "فرصة شراء قوية" أو "فرصة شراء" بالمعايير الحتمية الحالية.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoResults.buyOpportunities.slice(0, 10).map((item) => (
                  <div
                    key={item.company.ticker}
                    onClick={() => onSelectStock(item.company.ticker)}
                    className="p-4 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-700 font-mono text-base">
                          {item.company.ticker}
                        </span>
                        <span className="font-bold text-zinc-900 text-sm">
                          {item.company.nameAr}
                        </span>
                        <span className="text-xs text-zinc-500">({item.company.sector})</span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded bg-emerald-600 text-white">
                        {item.signal}
                      </span>
                    </div>

                    {/* Executive Summary Snippet (3-4 lines) */}
                    <p className="text-xs text-zinc-700 font-mono whitespace-pre-line leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-100">
                      {item.summarySnippet}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1 font-semibold">
                      <span>الدرجة الفنية: <strong>{item.company.evaluation.compositeScore}/100</strong></span>
                      <span className="flex items-center gap-1 group-hover:underline">
                        عرض الصفحة الكاملة <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Top 10 Sell Signals */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" /> إشارات البيع المؤهلة (إشارة بيع قوية / إشارة بيع)
              </h3>
              <span className="text-xs bg-rose-100 text-rose-900 px-2.5 py-1 rounded-full font-bold">
                {autoResults.sellSignals.length} سهم يحذر منه التحليل الرقمي
              </span>
            </div>

            {autoResults.sellSignals.length === 0 ? (
              <p className="text-zinc-500 text-xs py-4 text-center">
                لا توجد أسهم حالياً تحت طائلة إشارات البيع الصريحة.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoResults.sellSignals.slice(0, 10).map((item) => (
                  <div
                    key={item.company.ticker}
                    onClick={() => onSelectStock(item.company.ticker)}
                    className="p-4 bg-rose-50/40 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-700 font-mono text-base">
                          {item.company.ticker}
                        </span>
                        <span className="font-bold text-zinc-900 text-sm">
                          {item.company.nameAr}
                        </span>
                        <span className="text-xs text-zinc-500">({item.company.sector})</span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded bg-rose-600 text-white">
                        {item.signal}
                      </span>
                    </div>

                    {/* Executive Summary Snippet */}
                    <p className="text-xs text-zinc-700 font-mono whitespace-pre-line leading-relaxed bg-white p-2.5 rounded-lg border border-rose-100">
                      {item.summarySnippet}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-rose-800 pt-1 font-semibold">
                      <span>الدرجة الفنية: <strong>{item.company.evaluation.compositeScore}/100</strong></span>
                      <span className="flex items-center gap-1 group-hover:underline">
                        عرض الصفحة الكاملة <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Neutral Watchlist (مراقبة - بلا إشارة حاسمة) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-600" /> أسهم قيد المراقبة (حالات وسطية أو غير حاسمة)
              </h3>
              <span className="text-xs text-zinc-500">
                العدد: <strong className="text-zinc-900 font-mono">{autoResults.watchList.length}</strong> شركة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {autoResults.watchList.map((item) => (
                <div
                  key={item.company.ticker}
                  onClick={() => onSelectStock(item.company.ticker)}
                  className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700 font-mono text-sm">{item.company.ticker}</span>
                      <span className="font-semibold text-zinc-900 text-xs">{item.company.nameAr}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 block">
                      الدرجة: {item.company.evaluation.compositeScore} • الاتجاه: {item.company.evaluation.trendAnalysis?.mediumTerm?.level || 'جانبي'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-bold">
                    مراقبة
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Ineligible Illiquid Stocks List */}
          <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> الأسهم المستبعدة لضعف السيولة أو التداول النادر ({autoResults.ineligibleList.length} شركة)
              </h3>
              <span className="text-[11px] text-zinc-500">تم حظرها لسلامة القرارات الاستثمارية</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {autoResults.ineligibleList.map(({ company, eligibility }) => (
                <div key={company.ticker} className="p-2.5 bg-white rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-700 font-mono">{company.ticker}</span> - <span className="font-semibold text-zinc-800">{company.nameAr}</span>
                    <span className="text-[10px] text-rose-700 block mt-0.5">{eligibility.exclusionReason}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                    مُستبعد
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MANUAL SCREENER */}
      {activeMode === 'MANUAL_SCREENER' && (
        <div className="space-y-6">
          {/* Filter Panel & Presets */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            {/* Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2 text-xs text-zinc-700 font-bold">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <span>قوالب البحث المحفوظة:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button
                  onClick={() => applyPreset('SPECULATION')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                    savedPreset === 'SPECULATION'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                  }`}
                >
                  أسهم المضاربة
                </button>
                <button
                  onClick={() => applyPreset('BULLISH_TREND')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                    savedPreset === 'BULLISH_TREND'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                  }`}
                >
                  أسهم الاتجاه الصاعد
                </button>
                <button
                  onClick={() => applyPreset('FOREIGN_ACCUMULATION')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                    savedPreset === 'FOREIGN_ACCUMULATION'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                  }`}
                >
                  أسهم التجميع الأجنبي
                </button>
                <button
                  onClick={() => applyPreset('HIGH_LIQUIDITY')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                    savedPreset === 'HIGH_LIQUIDITY'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                  }`}
                >
                  أسهم السيولة العالية
                </button>
                <button
                  onClick={() => applyPreset('NONE')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold cursor-pointer"
                >
                  إعادة ضبط
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {/* Search Box */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">البحث بالشركة/الرمز</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="رمز/اسم السهم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-2 pr-8 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Sector */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">القطاع</label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">جميع القطاعات</option>
                  <option value="المصارف">المصارف</option>
                  <option value="الاتصالات">الاتصالات</option>
                  <option value="الصناعة">الصناعة</option>
                  <option value="الخدمات">الخدمات</option>
                  <option value="الزراعة">الزراعة</option>
                  <option value="الفنادق والسياحة">الفنادق والسياحة</option>
                  <option value="الاستثمار">الاستثمار</option>
                  <option value="العقارات">العقارات</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">السعر (د.ع)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="من"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-1/2 px-2 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none font-mono text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="إلى"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-1/2 px-2 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Change % Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">نسبة التغير</label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="BULLISH">صاعد (+)</option>
                  <option value="BEARISH">هابط (-)</option>
                </select>
              </div>

              {/* Trend Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">الاتجاه</label>
                <select
                  value={trendFilter}
                  onChange={(e) => setTrendFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="STRONG_BULLISH">صاعد قوي</option>
                  <option value="BULLISH">صاعد</option>
                  <option value="SIDEWAYS">جانبي / عرضي</option>
                  <option value="BEARISH">هابط</option>
                  <option value="STRONG_BEARISH">هابط قوي</option>
                </select>
              </div>

              {/* Volume Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">الحجم</label>
                <select
                  value={volumeFilter}
                  onChange={(e) => setVolumeFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="ABOVE_AVG">أعلى من المتوسط</option>
                  <option value="BELOW_AVG">أقل من المتوسط</option>
                  <option value="EXCEPTIONAL">حجم استثنائي (&gt;1.5x)</option>
                </select>
              </div>

              {/* Liquidity Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">السيولة</label>
                <select
                  value={liquidityFilter}
                  onChange={(e) => setLiquidityFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="HIGH">مرتفعة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="LOW">منخفضة</option>
                </select>
              </div>

              {/* Non-Iraqi Investors */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">غير العراقيين</label>
                <select
                  value={foreignerFilter}
                  onChange={(e) => setForeignerFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="NET_BUY">صافي شراء</option>
                  <option value="NET_SELL">صافي بيع</option>
                  <option value="ACCUMULATION">تجميع أجنبي</option>
                  <option value="DISTRIBUTION">تصريف أجنبي</option>
                </select>
              </div>

              {/* RSI Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">مؤشر RSI</label>
                <select
                  value={rsiFilter}
                  onChange={(e) => setRsiFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="OVERSOLD">إفراط بيع (&lt;35)</option>
                  <option value="NEUTRAL">معتدل (35-65)</option>
                  <option value="OVERBOUGHT">إفراط شراء (&gt;65)</option>
                </select>
              </div>

              {/* MACD Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">مؤشر MACD</label>
                <select
                  value={macdFilter}
                  onChange={(e) => setMacdFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="BULLISH">تقاطع إيجابي / صاعد</option>
                  <option value="BEARISH">تقاطع سلبي / هابط</option>
                </select>
              </div>

              {/* ADX Filter */}
              <div className="space-y-1">
                <label className="text-zinc-600 font-medium">قوة الاتجاه ADX</label>
                <select
                  value={adxFilter}
                  onChange={(e) => setAdxFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">الكل</option>
                  <option value="STRONG">اتجاه قوي (&gt;25)</option>
                  <option value="WEAK">اتجاه ضعيف (&lt;25)</option>
                </select>
              </div>

              {/* Min Composite Score Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-600 font-medium">
                  <span>أدنى Composite Score</span>
                  <span className="font-mono text-amber-700 font-bold">{minScore}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-xs">
              <span className="font-bold text-zinc-800">
                نتائج الفلترة: <strong className="text-amber-700 font-mono text-sm">{sortedManual.length}</strong> شركة
              </span>
              <span className="text-zinc-500">
                يمكن ترتيب الجدول بالنقر على أي رأس عمود.
              </span>
            </div>

            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold sticky top-0 z-20 shadow-xs">
                  <tr>
                    <th className="py-3 px-4 bg-zinc-100 sticky top-0 z-20">الرمز / الشركة</th>
                    <th className="py-3 px-4 bg-zinc-100 sticky top-0 z-20">القطاع</th>
                    <th
                      onClick={() => toggleSort('price')}
                      className="py-3 px-4 cursor-pointer hover:text-zinc-900 bg-zinc-100 sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>السعر</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('change')}
                      className="py-3 px-4 cursor-pointer hover:text-zinc-900 bg-zinc-100 sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>التغير %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('score')}
                      className="py-3 px-4 cursor-pointer hover:text-zinc-900 bg-zinc-100 sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>Composite Score</span>
                        <ArrowUpDown className="w-3 h-3 text-amber-600" />
                      </div>
                    </th>
                    <th className="py-3 px-4 bg-zinc-100 sticky top-0 z-20">الاتجاه</th>
                    <th
                      onClick={() => toggleSort('rsi')}
                      className="py-3 px-4 cursor-pointer hover:text-zinc-900 bg-zinc-100 sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>RSI</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('adx')}
                      className="py-3 px-4 cursor-pointer hover:text-zinc-900 bg-zinc-100 sticky top-0 z-20"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <span>ADX</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 bg-zinc-100 sticky top-0 z-20">غير العراقيين</th>
                    <th className="py-3 px-4 text-center bg-zinc-100 sticky top-0 z-20">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {sortedManual.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-zinc-500">
                        لا توجد نتائج تطابق هذه الفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    sortedManual.map((c) => (
                      <tr
                        key={c.ticker}
                        className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                        onClick={() => onSelectStock(c.ticker)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-amber-700 font-mono text-sm">{c.ticker}</span>
                            <div>
                              <span className="font-bold text-zinc-900 block">{c.nameAr}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-600">{c.sector}</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                          {(c.currentPrice ?? 0).toFixed(2)} د.ع
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={(c.changePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {(c.changePct ?? 0) >= 0 ? '+' : ''}{(c.changePct ?? 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                          {c.evaluation?.compositeScore ?? 0}/100
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-800">
                          {c.evaluation?.trendAnalysis?.mediumTerm?.level || c.indicators?.trendDirection || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-700">
                          {c.indicators?.rsi14 != null ? c.indicators.rsi14.toFixed(1) : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-700">
                          {c.indicators?.adx14 != null ? c.indicators.adx14.toFixed(1) : '-'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className={(c.nonIraqi?.accumulationTrend || '').includes('تجميع') ? 'text-teal-700 font-bold' : 'text-zinc-600'}>
                            {c.nonIraqi?.accumulationTrend || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button className="p-1.5 bg-zinc-100 hover:bg-amber-500 hover:text-zinc-950 text-zinc-600 rounded-lg transition-colors group-hover:bg-amber-500 group-hover:text-zinc-950">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
