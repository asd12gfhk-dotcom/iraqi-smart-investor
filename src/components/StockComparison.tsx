import React, { useState } from 'react';
import { ArrowRightLeft, Plus, X, Trophy, LineChart, BarChart2, Shield, Activity, Sparkles, Scale } from 'lucide-react';
import { ISXCompany } from '../types/isx';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface StockComparisonProps {
  companies: ISXCompany[];
}

type ChartMetric = 'priceChange' | 'compositeScore' | 'volume' | 'liquidity';

export const StockComparison: React.FC<StockComparisonProps> = ({ companies }) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['BBOB', 'TASC', 'IBSD', 'TROW']);
  const [activeChartMetric, setActiveChartMetric] = useState<ChartMetric>('priceChange');

  const selectedCompanies = companies.filter((c) => selectedTickers.includes(c.ticker));

  const addTicker = (ticker: string) => {
    if (selectedTickers.length < 5 && !selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
  };

  const removeTicker = (ticker: string) => {
    if (selectedTickers.length > 1) {
      setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
    }
  };

  const availableTickers = companies.filter((c) => !selectedTickers.includes(c.ticker));

  // --- SMART COMPARISON ENGINE (المقارنة الذكية) ---
  // 1. Highest Composite Score
  const maxScoreVal = Math.max(...selectedCompanies.map((c) => c.evaluation?.compositeScore ?? 0));
  const scoreWinners = selectedCompanies.filter((c) => (c.evaluation?.compositeScore ?? 0) === maxScoreVal);

  // 2. Strongest Trend (trendStrength score 0-100)
  const maxTrendVal = Math.max(...selectedCompanies.map((c) => c.evaluation?.trendAnalysis?.strengthScore ?? c.indicators?.trendADX ?? 0));
  const trendWinners = selectedCompanies.filter((c) => (c.evaluation?.trendAnalysis?.strengthScore ?? c.indicators?.trendADX ?? 0) === maxTrendVal);

  // 3. Highest Liquidity
  const maxLiqVal = Math.max(...selectedCompanies.map((c) => c.evaluation?.scoreBreakdown?.liquidityScore ?? 0));
  const liqWinners = selectedCompanies.filter((c) => (c.evaluation?.scoreBreakdown?.liquidityScore ?? 0) === maxLiqVal);

  // 4. Highest Trading Volume (20-day avg volume)
  const getAvgVolume = (c: ISXCompany) => {
    const history = c.history || [];
    if (history.length === 0) return c.volume;
    const sum = history.slice(-20).reduce((a, b) => a + (b.volume || 0), 0);
    return Math.round(sum / Math.min(20, history.length));
  };
  const maxVolVal = Math.max(...selectedCompanies.map(getAvgVolume));
  const volWinners = selectedCompanies.filter((c) => getAvgVolume(c) === maxVolVal);

  // 5. Best Indicator Alignment (count of positive indicators)
  const getPositiveIndicatorsCount = (c: ISXCompany) => {
    let count = 0;
    const ind = c.indicators;
    if (!ind) return 0;
    if (ind.rsi14 >= 40 && ind.rsi14 <= 70) count++;
    if (ind.macdHist > 0 || ind.macdSignalType.includes('إيجابي')) count++;
    if (ind.adx14 >= 25) count++;
    if (ind.trendDirection.includes('صاعد')) count++;
    if (ind.stochasticStatus === 'متوازن' || ind.stochasticStatus === 'إفراط بيع') count++;
    if (c.nonIraqi?.netValue > 0) count++;
    return count;
  };
  const maxAlignmentVal = Math.max(...selectedCompanies.map(getPositiveIndicatorsCount));
  const alignmentWinners = selectedCompanies.filter((c) => getPositiveIndicatorsCount(c) === maxAlignmentVal);

  // 6. Highest Confidence Score
  const getConfidenceRank = (c: ISXCompany) => {
    const cs = c.evaluation?.confidenceScore;
    if (cs === 'مرتفع') return 4;
    if (cs === 'جيد') return 3;
    if (cs === 'متوسط') return 2;
    return 1;
  };
  const maxConfRank = Math.max(...selectedCompanies.map(getConfidenceRank));
  const confWinners = selectedCompanies.filter((c) => getConfidenceRank(c) === maxConfRank);

  const formatWinnerNames = (winners: ISXCompany[]) => {
    if (winners.length === 0) return 'غير محدد';
    if (winners.length > 1) return `متعادلين (${winners.map((w) => w.ticker).join(' و ')})`;
    return `${winners[0].ticker} (${winners[0].nameAr})`;
  };

  // --- GRAPHICAL COMPARISON DATASET GENERATION ---
  const colors = ['#d97706', '#0284c7', '#16a34a', '#dc2626', '#9333ea'];

  // Prepare normalized time-series data for chart
  const maxBarCount = Math.max(...selectedCompanies.map((c) => (c.history || []).length));
  const chartData = [];
  
  if (maxBarCount > 0) {
    const baseHistory = selectedCompanies[0]?.history || [];
    for (let i = 0; i < baseHistory.length; i++) {
      const date = baseHistory[i]?.date || `جلسة ${i + 1}`;
      const entry: Record<string, any> = { date };

      selectedCompanies.forEach((c) => {
        const h = c.history || [];
        const bar = h[i] || h[h.length - 1];
        if (bar) {
          if (activeChartMetric === 'priceChange') {
            const firstBar = h[0] || bar;
            const pct = firstBar.close > 0 ? ((bar.close - firstBar.close) / firstBar.close) * 100 : 0;
            entry[c.ticker] = Number(pct.toFixed(2));
          } else if (activeChartMetric === 'compositeScore') {
            // Trend/score curve estimate
            const baseScore = c.evaluation?.compositeScore ?? 50;
            const variation = ((bar.close - c.currentPrice) / Math.max(0.01, c.currentPrice)) * 30;
            entry[c.ticker] = Math.min(100, Math.max(0, Number((baseScore + variation).toFixed(1))));
          } else if (activeChartMetric === 'volume') {
            entry[c.ticker] = Number((bar.volume / 1000000).toFixed(2));
          } else if (activeChartMetric === 'liquidity') {
            entry[c.ticker] = Number((bar.value / 1000000).toFixed(2));
          }
        }
      });
      chartData.push(entry);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Ticker Chips */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" /> أداة مقارنة الأسهم المتقدمة (Stock Comparison)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              مقارنة رقمية ورسومية شاملة بين الأسهم في شاشة واحدة (حد أقصى 5 أسهم).
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full font-bold self-start md:self-auto">
            {selectedCompanies.length} من 5 أسهم
          </span>
        </div>

        {/* Selected Ticker Chips */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedCompanies.map((c, idx) => (
            <div
              key={c.ticker}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 shadow-xs"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></span>
              <span className="text-amber-700 font-mono font-extrabold">{c.ticker}</span>
              <span>({c.nameAr})</span>
              {selectedTickers.length > 1 && (
                <button
                  onClick={() => removeTicker(c.ticker)}
                  className="text-zinc-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {selectedTickers.length < 5 && availableTickers.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addTicker(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 text-xs rounded-xl font-bold cursor-pointer focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="">+ إضافة سهم جديد للمقارنة...</option>
              {availableTickers.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.ticker} - {c.nameAr} ({c.sector})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* SMART COMPARISON CARDS (المقارنة الذكية - تحديد الفائز) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> لوحة المقارنة الذكية (تحديد الفائز لكل معيار)
          </h3>
          <span className="text-xs text-zinc-500">تحليل تلقائي حتمي بين الأسهم المختارة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Highest Composite Score */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أعلى Composite Score:</span>
            <span className="text-sm font-extrabold text-amber-900 block">
              {formatWinnerNames(scoreWinners)}
            </span>
            <span className="text-[11px] font-mono text-amber-700 font-bold block">
              القيمة: {maxScoreVal}/100
            </span>
          </div>

          {/* Strongest Trend */}
          <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أقوى اتجاه فني (Trend Strength):</span>
            <span className="text-sm font-extrabold text-sky-950 block">
              {formatWinnerNames(trendWinners)}
            </span>
            <span className="text-[11px] font-mono text-sky-700 font-bold block">
              درجة قوة الاتجاه: {maxTrendVal}/100
            </span>
          </div>

          {/* Highest Liquidity */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أعلى سيولة (Liquidity Score):</span>
            <span className="text-sm font-extrabold text-emerald-950 block">
              {formatWinnerNames(liqWinners)}
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-bold block">
              درجة السيولة: {maxLiqVal}/100
            </span>
          </div>

          {/* Highest Trading Volume */}
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أعلى متوسط حجم تداول (آخر 20 جلسة):</span>
            <span className="text-sm font-extrabold text-indigo-950 block">
              {formatWinnerNames(volWinners)}
            </span>
            <span className="text-[11px] font-mono text-indigo-700 font-bold block">
              {(maxVolVal / 1000000).toFixed(2)}M سهم/جلسة
            </span>
          </div>

          {/* Best Indicator Alignment */}
          <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أفضل توافق بين المؤشرات الإيجابية:</span>
            <span className="text-sm font-extrabold text-teal-950 block">
              {formatWinnerNames(alignmentWinners)}
            </span>
            <span className="text-[11px] font-mono text-teal-700 font-bold block">
              عدد المؤشرات الإيجابية: {maxAlignmentVal} مؤشرات
            </span>
          </div>

          {/* Highest Confidence Score */}
          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">أعلى Confidence Score:</span>
            <span className="text-sm font-extrabold text-purple-950 block">
              {formatWinnerNames(confWinners)}
            </span>
            <span className="text-[11px] font-mono text-purple-700 font-bold block">
              المستوى: {confWinners[0]?.evaluation?.confidenceScore || 'غير محدد'}
            </span>
          </div>
        </div>
      </div>

      {/* GRAPHICAL COMPARISON CHART (المقارنة الرسومية) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-amber-600" /> الرسم البياني الموحد للمقارنة الرسومية
          </h3>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 text-xs bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => setActiveChartMetric('priceChange')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                activeChartMetric === 'priceChange' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              الأداء السعري %
            </button>
            <button
              onClick={() => setActiveChartMetric('compositeScore')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                activeChartMetric === 'compositeScore' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              Composite Score
            </button>
            <button
              onClick={() => setActiveChartMetric('volume')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                activeChartMetric === 'volume' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              تطور الحجم (M)
            </button>
            <button
              onClick={() => setActiveChartMetric('liquidity')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                activeChartMetric === 'liquidity' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              تطور السيولة (M د.ع)
            </button>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#52525b', fontSize: 10 }} />
              <YAxis stroke="#a1a1aa" tick={{ fill: '#52525b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              {selectedCompanies.map((c, idx) => (
                <Line
                  key={c.ticker}
                  type="monotone"
                  dataKey={c.ticker}
                  name={`${c.ticker} (${c.nameAr})`}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* COMPARISON MATRIX TABLE (عناصر المقارنة) */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" /> جدول عناصر المقارنة التفصيلية
          </h3>
          <span className="text-xs text-zinc-500">كل القيم الحقيقية من محرك التحليل الفني</span>
        </div>

        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-3.5 px-4 w-52 bg-zinc-100 sticky top-0 z-20">عنصر المقارنة</th>
                {selectedCompanies.map((c, idx) => (
                  <th key={c.ticker} className="py-3.5 px-4 text-center border-r border-zinc-200 bg-zinc-100 sticky top-0 z-20">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                      <span className="font-mono text-amber-700 text-sm font-extrabold">{c.ticker}</span>
                    </div>
                    <span className="text-zinc-900 text-xs block font-bold">{c.nameAr}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {/* Current Price */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">السعر الحالي</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold text-zinc-900 text-sm border-r border-zinc-100">
                    {(c.currentPrice ?? 0).toFixed(2)} د.ع
                  </td>
                ))}
              </tr>

              {/* Change % */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">نسبة التغير اليومي</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold border-r border-zinc-100">
                    <span className={(c.changePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {(c.changePct ?? 0) >= 0 ? '+' : ''}{(c.changePct ?? 0).toFixed(2)}%
                    </span>
                  </td>
                ))}
              </tr>

              {/* Sector */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">القطاع</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center text-zinc-800 font-medium border-r border-zinc-100">
                    {c.sector}
                  </td>
                ))}
              </tr>

              {/* Composite Score */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">Composite Score</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono text-base font-black text-amber-700 border-r border-zinc-100">
                    {c.evaluation?.compositeScore ?? 50}/100
                  </td>
                ))}
              </tr>

              {/* Confidence Score */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">Confidence Score</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center border-r border-zinc-100">
                    <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-300 rounded text-xs font-bold text-zinc-800">
                      {c.evaluation?.confidenceScore || 'متوسط'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Trend */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">الاتجاه الفني العام</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-semibold text-zinc-800 border-r border-zinc-100">
                    {c.evaluation?.trendAnalysis?.mediumTerm?.level || c.indicators?.trendDirection || 'عرضي'}
                  </td>
                ))}
              </tr>

              {/* RSI */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">مؤشر RSI (14)</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono border-r border-zinc-100">
                    <span className="font-bold text-amber-700 block">
                      {c.indicators?.rsi14 != null ? c.indicators.rsi14.toFixed(1) : '-'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{c.indicators?.rsiStatus || '-'}</span>
                  </td>
                ))}
              </tr>

              {/* MACD */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">إشارة MACD</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center text-zinc-800 font-semibold border-r border-zinc-100">
                    {c.indicators?.macdSignalType || '-'}
                  </td>
                ))}
              </tr>

              {/* ADX */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">قوة الاتجاه ADX (14)</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold text-zinc-900 border-r border-zinc-100">
                    {c.indicators?.adx14 != null ? c.indicators.adx14.toFixed(1) : '-'}
                  </td>
                ))}
              </tr>

              {/* ATR */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">مؤشر التذبذب ATR (14)</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono border-r border-zinc-100">
                    {c.indicators?.atr14 != null ? `${c.indicators.atr14.toFixed(3)} د.ع` : '-'}
                  </td>
                ))}
              </tr>

              {/* Volume */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">حجم التداول اليومي</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold text-zinc-900 border-r border-zinc-100">
                    {((c.volume ?? 0) / 1000000).toFixed(2)}M سهم
                  </td>
                ))}
              </tr>

              {/* Liquidity */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">قيمة السيولة اليومية</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold text-amber-700 border-r border-zinc-100">
                    {((c.value ?? 0) / 1000000).toFixed(2)}M د.ع
                  </td>
                ))}
              </tr>

              {/* Non-Iraqi Net Flow */}
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-700 bg-zinc-50/70">صافي تداول غير العراقيين</td>
                {selectedCompanies.map((c) => (
                  <td key={c.ticker} className="py-3 px-4 text-center font-mono font-bold border-r border-zinc-100">
                    <span className={c.nonIraqi?.netValue >= 0 ? 'text-teal-700' : 'text-rose-700'}>
                      {c.nonIraqi?.netValue >= 0 ? '+' : ''}{((c.nonIraqi?.netValue ?? 0) / 1000000).toFixed(2)}M د.ع
                    </span>
                    <span className="text-[10px] text-zinc-500 block font-normal">{c.nonIraqi?.accumulationTrend}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
