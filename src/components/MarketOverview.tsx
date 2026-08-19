import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Globe, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Flame, Award, BarChart2 } from 'lucide-react';
import { ISXCompany, MarketSummary } from '../types/isx';

interface MarketOverviewProps {
  companies: ISXCompany[];
  summary: MarketSummary;
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  companies,
  summary,
  watchlist = [],
  onToggleWatchlist,
  onSelectStock
}) => {
  const topGainers = [...companies]
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 5);

  const topLosers = [...companies]
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 5);

  const mostTraded = [...companies]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // Market Monitor Aggregates (Document 5 Section 10)
  const topVolStock = [...companies].sort((a, b) => b.volume - a.volume)[0];
  const topLiqStock = [...companies].sort((a, b) => b.value - a.value)[0];
  const topScoreStock = [...companies].sort((a, b) => (b.evaluation?.compositeScore ?? 0) - (a.evaluation?.compositeScore ?? 0))[0];

  const marketAvgScore = Math.round(
    companies.reduce((acc, c) => acc + (c.evaluation?.compositeScore ?? 50), 0) / Math.max(1, companies.length)
  );

  let marketTrend = 'جانبي';
  if (marketAvgScore >= 58 || summary.advancersCount > summary.declinersCount) {
    marketTrend = 'صاعد';
  } else if (marketAvgScore <= 42 || summary.declinersCount > summary.advancersCount) {
    marketTrend = 'هابط';
  }

  const marketStrength = marketAvgScore;
  const generalConfidence = marketStrength >= 60 ? 'مرتفع' : marketStrength >= 50 ? 'جيد' : 'متوسط';

  interface SectorStat {
    totalValue: number;
    count: number;
    avgChangePct: number;
    sumChangePct: number;
  }

  // Sector Performance Aggregate
  const sectorMap = companies.reduce((acc, c) => {
    if (!acc[c.sector]) {
      acc[c.sector] = { totalValue: 0, count: 0, avgChangePct: 0, sumChangePct: 0 };
    }
    acc[c.sector].totalValue += c.value;
    acc[c.sector].count += 1;
    acc[c.sector].sumChangePct += c.changePct;
    return acc;
  }, {} as Record<string, SectorStat>);

  const sectorChartData = Object.entries(sectorMap).map(([sector, data]: [string, SectorStat]) => ({
    sector,
    avgChangePct: Number((data.sumChangePct / data.count).toFixed(2)),
    totalValueM: Number((data.totalValue / 1000000).toFixed(1))
  }));

  return (
    <div className="space-y-6">
      {/* MARKET MONITOR DASHBOARD CARDS (مراقبة السوق) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-600" /> مراقبة حالة السوق الفنية والمؤشرات العامة (Market Monitor)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              شاشة شاملة لحالة واتجاه وسلوك التداول لكامل سوق العراق للأوراق المالية.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
              اتجاه السوق: {marketTrend}
            </span>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200">
              مستوى الثقة العام: {generalConfidence}
            </span>
          </div>
        </div>

        {/* 4 Core Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Breadth Count */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="text-zinc-500 font-semibold block">إحصائيات الأسهم المتداولة:</span>
            <div className="flex items-center justify-between pt-1">
              <span className="text-emerald-700 font-bold">صاعدة: {summary.advancersCount}</span>
              <span className="text-zinc-500 font-bold">مستقرة: {summary.unchangedCount}</span>
              <span className="text-rose-700 font-bold">هابطة: {summary.declinersCount}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block pt-1">المجموع: {summary.tradedCompaniesCount} شركة</span>
          </div>

          {/* Top Volume Stock */}
          <div
            onClick={() => topVolStock && onSelectStock(topVolStock.ticker)}
            className="p-3.5 bg-zinc-50 hover:bg-amber-50/50 border border-zinc-200 rounded-xl cursor-pointer transition-all space-y-1"
          >
            <span className="text-zinc-500 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" /> أعلى سهم بالحجم اليوم:
            </span>
            <strong className="text-amber-700 font-mono text-sm block">{topVolStock?.ticker} ({topVolStock?.nameAr})</strong>
            <span className="text-[11px] font-mono text-zinc-700 block">
              {topVolStock ? ((topVolStock.volume ?? 0) / 1000000).toFixed(2) : '0.00'}M سهم
            </span>
          </div>

          {/* Top Liquidity Stock */}
          <div
            onClick={() => topLiqStock && onSelectStock(topLiqStock.ticker)}
            className="p-3.5 bg-zinc-50 hover:bg-amber-50/50 border border-zinc-200 rounded-xl cursor-pointer transition-all space-y-1"
          >
            <span className="text-zinc-500 font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" /> أعلى سهم بالسيولة اليوم:
            </span>
            <strong className="text-amber-700 font-mono text-sm block">{topLiqStock?.ticker} ({topLiqStock?.nameAr})</strong>
            <span className="text-[11px] font-mono text-amber-800 font-bold block">
              {topLiqStock ? ((topLiqStock.value ?? 0) / 1000000).toFixed(2) : '0.00'}M د.ع
            </span>
          </div>

          {/* Top Composite Score Stock */}
          <div
            onClick={() => topScoreStock && onSelectStock(topScoreStock.ticker)}
            className="p-3.5 bg-zinc-50 hover:bg-amber-50/50 border border-zinc-200 rounded-xl cursor-pointer transition-all space-y-1"
          >
            <span className="text-zinc-500 font-semibold flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-600" /> أصلب سهم بالقوة الفنية المركبة:
            </span>
            <strong className="text-amber-700 font-mono text-sm block">{topScoreStock?.ticker} ({topScoreStock?.nameAr})</strong>
            <span className="text-[11px] font-mono text-indigo-700 font-bold block">الدرجة المركبة: {topScoreStock?.evaluation?.compositeScore}/100</span>
          </div>
        </div>
      </div>

      {/* ISX Market Indices Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ISX60 Index Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span className="font-semibold">{summary.isx60.indexName}</span>
            <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded font-mono text-[10px]">ISX60</span>
          </div>
          <div className="flex items-baseline gap-3 my-1">
            <span className="text-2xl font-extrabold text-zinc-900 font-mono">
              {summary.isx60.currentValue.toFixed(2)}
            </span>
            <div
              className={`flex items-center text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                summary.isx60.change >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {summary.isx60.change >= 0 ? '+' : ''}
              {summary.isx60.change.toFixed(2)} ({summary.isx60.changePct.toFixed(2)}%)
            </div>
          </div>
          <div className="h-14 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.isx60.history}>
                <defs>
                  <linearGradient id="isx60Color" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#isx60Color)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ISX15 Index Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span className="font-semibold">{summary.isx15.indexName}</span>
            <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded font-mono text-[10px]">ISX15</span>
          </div>
          <div className="flex items-baseline gap-3 my-1">
            <span className="text-2xl font-extrabold text-zinc-900 font-mono">
              {summary.isx15.currentValue.toFixed(2)}
            </span>
            <div
              className={`flex items-center text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                summary.isx15.change >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {summary.isx15.change >= 0 ? '+' : ''}
              {summary.isx15.change.toFixed(2)} ({summary.isx15.changePct.toFixed(2)}%)
            </div>
          </div>
          <div className="h-14 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.isx15.history}>
                <defs>
                  <linearGradient id="isx15Color" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#isx15Color)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Volume & Value */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-zinc-800">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                حجم وقيمة التداول الكلي
              </span>
              <span className="text-zinc-500 font-mono text-[10px]">{summary.tradingDate}</span>
            </div>
            <div className="space-y-2 my-2">
              <div>
                <span className="text-xs text-zinc-500 block">حجم التداول (أسهم):</span>
                <span className="text-lg font-bold text-zinc-900 font-mono">
                  {summary.totalVolume.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">قيمة التداول الكلية:</span>
                <span className="text-lg font-bold text-amber-700 font-mono">
                  {(summary.totalValue / 1000000).toFixed(2)} مليون د.ع
                </span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-200 flex justify-between">
            <span>عدد الصفقات: <strong className="text-zinc-800 font-mono">{summary.totalTrades}</strong></span>
            <span>الشركات المتداولة: <strong className="text-zinc-800 font-mono">{summary.tradedCompaniesCount}</strong></span>
          </div>
        </div>

        {/* Non-Iraqi Trading Overview */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-teal-700">
                <Globe className="w-3.5 h-3.5" />
                تداول غير العراقيين (صافي الشراء)
              </span>
              <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-semibold">مؤشر فني</span>
            </div>
            <div className="my-2">
              <span className="text-xs text-zinc-500 block">إجمالي صافي التدفق الأجنبي:</span>
              <span className="text-xl font-extrabold text-emerald-700 font-mono">
                +{(summary.foreignerNetBuyTotalValue / 1000000).toFixed(2)} مليون د.ع
              </span>
              <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
                تجميع إيجابي مستمر يركز على قطاعي المصارف والاتصالات، ويُعتبر داعماً فندياً للاتجاه الصاعد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 text-xs text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>اتجاه التجميع العام: إيجابي صاعد</span>
          </div>
        </div>
      </div>

      {/* Tables Row: Top Gainers, Losers, Most Traded */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Gainers */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 pb-2 border-b border-zinc-200">
            <TrendingUp className="w-4 h-4" /> الأكثر ارتفاعاً اليوم
          </h3>
          <div className="space-y-2">
            {topGainers.map((c) => (
              <div
                key={c.ticker}
                onClick={() => onSelectStock(c.ticker)}
                className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">{c.ticker}</span>
                  <span className="text-[11px] text-zinc-500">{c.nameAr}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-zinc-800 block">{c.currentPrice.toFixed(2)} د.ع</span>
                  <span className="text-xs font-bold text-emerald-700">+{c.changePct.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-rose-700 flex items-center gap-1.5 pb-2 border-b border-zinc-200">
            <TrendingDown className="w-4 h-4" /> الأكثر انخفاضاً اليوم
          </h3>
          <div className="space-y-2">
            {topLosers.map((c) => (
              <div
                key={c.ticker}
                onClick={() => onSelectStock(c.ticker)}
                className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">{c.ticker}</span>
                  <span className="text-[11px] text-zinc-500">{c.nameAr}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-zinc-800 block">{c.currentPrice.toFixed(2)} د.ع</span>
                  <span className="text-xs font-bold text-rose-700">{c.changePct.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Traded */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 pb-2 border-b border-zinc-200">
            <Activity className="w-4 h-4" /> الأعلى حجماً وسيولة
          </h3>
          <div className="space-y-2">
            {mostTraded.map((c) => (
              <div
                key={c.ticker}
                onClick={() => onSelectStock(c.ticker)}
                className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">{c.ticker}</span>
                  <span className="text-[11px] text-zinc-500">{c.nameAr}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-zinc-800 block">{(c.volume / 1000000).toFixed(2)}M سهم</span>
                  <span className="text-[11px] text-amber-700 font-semibold">{(c.value / 1000000).toFixed(1)}M د.ع</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
