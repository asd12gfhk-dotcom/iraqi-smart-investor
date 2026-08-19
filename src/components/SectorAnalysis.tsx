import React, { useState } from 'react';
import { PieChart, TrendingUp, TrendingDown, Layers, Award, ChevronLeft, ArrowUpDown, Filter } from 'lucide-react';
import { ISXCompany } from '../types/isx';

interface SectorAnalysisProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

type SectorSortOption = 'performance' | 'compositeScore' | 'liquidity' | 'volume' | 'advancingCount';

export const SectorAnalysis: React.FC<SectorAnalysisProps> = ({ companies, onSelectStock }) => {
  const [sortBy, setSortBy] = useState<SectorSortOption>('compositeScore');
  const [selectedSector, setSelectedSector] = useState<string>('');

  // Extract unique sectors
  const sectors = Array.from(new Set(companies.map((c) => c.sector)));

  // Calculate sector aggregate metrics
  const sectorAggregates = sectors.map((sectorName) => {
    const sectorCompanies = companies.filter((c) => c.sector === sectorName);
    const count = sectorCompanies.length;

    const advancingCount = sectorCompanies.filter((c) => c.changePct > 0).length;
    const decliningCount = sectorCompanies.filter((c) => c.changePct < 0).length;
    const flatCount = sectorCompanies.filter((c) => c.changePct === 0).length;

    const avgChangePct = sectorCompanies.reduce((a, b) => a + b.changePct, 0) / count;
    const avgCompositeScore = Math.round(
      sectorCompanies.reduce((a, b) => a + (b.evaluation?.compositeScore ?? 50), 0) / count
    );

    const totalVolume = sectorCompanies.reduce((a, b) => a + b.volume, 0);
    const avgVolume = Math.round(totalVolume / count);

    const totalLiquidity = sectorCompanies.reduce((a, b) => a + b.value, 0);
    const avgLiquidity = Math.round(totalLiquidity / count);

    // Confidence distribution
    const highConfCount = sectorCompanies.filter((c) => c.evaluation?.confidenceScore === 'مرتفع' || c.evaluation?.confidenceScore === 'جيد').length;
    const avgConfidenceScore = highConfCount >= count / 2 ? 'مرتفع/جيد' : 'متوسط';

    // Sector Trend
    let sectorTrend = 'جانبي';
    if (avgCompositeScore >= 60 || advancingCount > decliningCount) {
      sectorTrend = 'صاعد';
    } else if (avgCompositeScore <= 40 || decliningCount > advancingCount) {
      sectorTrend = 'هابط';
    }

    // Top 5 & Weakest 5 companies in this sector
    const sortedByScore = [...sectorCompanies].sort((a, b) => (b.evaluation?.compositeScore ?? 0) - (a.evaluation?.compositeScore ?? 0));
    const top5Companies = sortedByScore.slice(0, 5);
    const weakest5Companies = [...sortedByScore].reverse().slice(0, 5);

    return {
      sectorName,
      count,
      advancingCount,
      decliningCount,
      flatCount,
      avgChangePct,
      avgCompositeScore,
      avgConfidenceScore,
      avgVolume,
      avgLiquidity,
      totalLiquidity,
      sectorTrend,
      top5Companies,
      weakest5Companies
    };
  });

  // Sort sectors by user choice
  const sortedSectors = [...sectorAggregates].sort((a, b) => {
    if (sortBy === 'performance') return b.avgChangePct - a.avgChangePct;
    if (sortBy === 'compositeScore') return b.avgCompositeScore - a.avgCompositeScore;
    if (sortBy === 'liquidity') return b.totalLiquidity - a.totalLiquidity;
    if (sortBy === 'volume') return b.avgVolume - a.avgVolume;
    if (sortBy === 'advancingCount') return b.advancingCount - a.advancingCount;
    return 0;
  });

  const activeSectorDetail = sortedSectors.find((s) => s.sectorName === selectedSector) || sortedSectors[0];

  return (
    <div className="space-y-6">
      {/* Header Banner & Controls */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" /> تحليل القطاعات الفنية المباشر (Sector Analysis)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              حساب مؤشرات كل قطاع بالكامل (الأداء، القوة الفنية المركبة، السيولة، الاتجاه العام، وأعلى/أضعف الشركات).
            </p>
          </div>

          {/* Sorting controls */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-zinc-100 p-1.5 rounded-xl border border-zinc-200 text-xs">
            <span className="text-zinc-600 font-bold px-1 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" /> ترتيب القطاعات بـ:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SectorSortOption)}
              className="px-3 py-1 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="compositeScore">القوة الفنية (Average Composite Score)</option>
              <option value="performance">الأداء النسبي % (Avg Return)</option>
              <option value="liquidity">السيولة الإجمالية (Total Value)</option>
              <option value="volume">متوسط حجم التداول (Volume)</option>
              <option value="advancingCount">عدد الأسهم الصاعدة (Advancing)</option>
            </select>
          </div>
        </div>

        {/* Sectors Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSectors.map((sec) => (
            <div
              key={sec.sectorName}
              onClick={() => setSelectedSector(sec.sectorName)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                activeSectorDetail?.sectorName === sec.sectorName
                  ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                  : 'bg-zinc-50/60 hover:bg-zinc-100 border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-black text-zinc-900 text-sm">{sec.sectorName}</span>
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 font-bold text-[10px] rounded-full">
                    {sec.count} شركة
                  </span>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                    sec.sectorTrend === 'صاعد'
                      ? 'bg-emerald-100 text-emerald-900'
                      : sec.sectorTrend === 'هابط'
                      ? 'bg-rose-100 text-rose-900'
                      : 'bg-zinc-200 text-zinc-800'
                  }`}
                >
                  اتجاه {sec.sectorTrend}
                </span>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-white rounded-xl border border-zinc-200/80">
                  <span className="text-[10px] text-zinc-500 font-sans block">متوسط القوة الفنية:</span>
                  <strong className="text-amber-700 text-sm">{sec.avgCompositeScore}/100</strong>
                </div>

                <div className="p-2 bg-white rounded-xl border border-zinc-200/80">
                  <span className="text-[10px] text-zinc-500 font-sans block">متوسط الأداء اليومي:</span>
                  <strong className={(sec.avgChangePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {(sec.avgChangePct ?? 0) >= 0 ? '+' : ''}{(sec.avgChangePct ?? 0).toFixed(2)}%
                  </strong>
                </div>
              </div>

              {/* Advancing/Declining ratio bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-zinc-600">
                  <span className="text-emerald-700 font-mono">صاعد: {sec.advancingCount}</span>
                  <span className="text-zinc-500 font-mono">مستقر: {sec.flatCount}</span>
                  <span className="text-rose-700 font-mono">هابط: {sec.decliningCount}</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(sec.advancingCount / sec.count) * 100}%` }} className="bg-emerald-500 h-full"></div>
                  <div style={{ width: `${(sec.flatCount / sec.count) * 100}%` }} className="bg-zinc-400 h-full"></div>
                  <div style={{ width: `${(sec.decliningCount / sec.count) * 100}%` }} className="bg-rose-500 h-full"></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 font-mono">
                <span>سيولة القطاع: <strong>{((sec.totalLiquidity ?? 0) / 1000000).toFixed(1)}M د.ع</strong></span>
                <span className="text-amber-700 font-bold font-sans flex items-center gap-0.5">
                  عرض الشركات <ChevronLeft className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SELECTED SECTOR DETAILED BREAKDOWN (أفضل 5 وأضعف 5 شركات في القطاع) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" /> أفضل وأضعف شركات قطاع ({activeSectorDetail.sectorName})
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              ترتيب تلقائي حتمي لشركات القطاع بناءً على التقييم الفني المركب Composite Score.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            {activeSectorDetail.sectorName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 5 Companies in Sector */}
          <div className="space-y-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/80">
            <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5 pb-2 border-b border-emerald-200">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> أداء أفضل 5 أسهم في قطاع {activeSectorDetail.sectorName}
            </h4>

            <div className="space-y-2">
              {activeSectorDetail.top5Companies.map((c, idx) => (
                <div
                  key={c.ticker}
                  onClick={() => onSelectStock(c.ticker)}
                  className="p-3 bg-white hover:bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-amber-700 font-mono text-sm">{c.ticker}</span>
                    <span className="font-bold text-zinc-900">{c.nameAr}</span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-amber-700 block">{c.evaluation?.compositeScore}/100</span>
                    <span className={(c.changePct ?? 0) >= 0 ? 'text-emerald-700 text-[11px]' : 'text-rose-700 text-[11px]'}>
                      {(c.changePct ?? 0) >= 0 ? '+' : ''}{(c.changePct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weakest 5 Companies in Sector */}
          <div className="space-y-3 bg-rose-50/40 p-4 rounded-2xl border border-rose-200/80">
            <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5 pb-2 border-b border-rose-200">
              <TrendingDown className="w-4 h-4 text-rose-600" /> أداء أضعف 5 أسهم في قطاع {activeSectorDetail.sectorName}
            </h4>

            <div className="space-y-2">
              {activeSectorDetail.weakest5Companies.map((c, idx) => (
                <div
                  key={c.ticker}
                  onClick={() => onSelectStock(c.ticker)}
                  className="p-3 bg-white hover:bg-rose-50 border border-rose-100 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-amber-700 font-mono text-sm">{c.ticker}</span>
                    <span className="font-bold text-zinc-900">{c.nameAr}</span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-rose-700 block">{c.evaluation?.compositeScore}/100</span>
                    <span className={(c.changePct ?? 0) >= 0 ? 'text-emerald-700 text-[11px]' : 'text-rose-700 text-[11px]'}>
                      {(c.changePct ?? 0) >= 0 ? '+' : ''}{(c.changePct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
