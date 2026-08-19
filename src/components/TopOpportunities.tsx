import React, { useState } from 'react';
import { Sparkles, Trophy, Globe, Zap, ChevronLeft, ShieldCheck, TrendingUp, TrendingDown, Info, History, CheckCircle2 } from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { runAutoOpportunityScreener, OpportunityTimeframe } from '../utils/opportunityEngine';
import { evaluateHistoricalDecision } from '../utils/historicalDecisionEngine';

interface TopOpportunitiesProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

export const TopOpportunities: React.FC<TopOpportunitiesProps> = ({ companies, onSelectStock }) => {
  const [timeframe, setTimeframe] = useState<OpportunityTimeframe>('2m');

  const autoResults = runAutoOpportunityScreener(companies, {
    timeframe,
    minDailyValue: 5000000,
    minDailyTrades: 10,
    minActiveRatio: 0.50
  });

  // Evaluate Historical Decision Engine for all companies
  const historicalResults = companies.map((c) => ({
    company: c,
    decision: evaluateHistoricalDecision(c)
  }));

  const historicalBuySignals = historicalResults.filter(
    (r) => r.decision.signal === 'BUY' || r.decision.signal === 'BUY_WATCH'
  );
  const historicalExitSignals = historicalResults.filter((r) => r.decision.signal === 'EXIT');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" /> مُقترِح الفرص التلقائي الحتمي (Auto Opportunity Screener)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            يقوم النظام دورياً عند كل تحديث بيانات بتطبيق القواعد الحتمية واستبعاد الأسهم ضعيفة السيولة، لإبراز أفضل 10 فرص شراء وأعلى 10 إشارات بيع.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-2 text-xs self-start md:self-auto bg-zinc-100 p-1.5 rounded-xl border border-zinc-200">
          <span className="text-zinc-600 font-bold px-1">فترة فلترة الأهلية:</span>
          {(['1m', '2m', '3m', '6m'] as OpportunityTimeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                timeframe === tf
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tf === '1m' ? 'شهر' : tf === '2m' ? 'شهرين (افتراضي)' : tf === '3m' ? '3 أشهر' : '6 أشهر'}
            </button>
          ))}
        </div>
      </div>

      {/* 🟢 Smart Iraqi Investor - Historical Decision Engine Highlights */}
      <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="text-base font-bold text-white">
              إشارات محرك القرار التاريخي (Historical Decision Signals)
            </h3>
          </div>
          <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full font-mono font-bold">
            مطابقة الدورات وبوابات الأدلة الـ 5
          </span>
        </div>

        {historicalBuySignals.length === 0 ? (
          <p className="text-zinc-400 text-xs py-3 text-center">
            لا توجد أسهم حالياً تجتاز بوابات الأدلة الـ 5 لإصدار إشارت شراء أو مراقبة تاريخية مؤكدة.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historicalBuySignals.map(({ company, decision }) => (
              <div
                key={company.ticker}
                onClick={() => onSelectStock(company.ticker)}
                className="p-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-400 font-mono text-base">
                      {company.ticker}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {company.nameAr}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded border ${
                      decision.signal === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {decision.signalBadgeAr}
                  </span>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  <div className="flex justify-between font-mono text-[11px] text-zinc-400">
                    <span>نسبة النجاح التاريخية (+20d): <strong className="text-emerald-400">{decision.similarity.winRate20dPct}%</strong></span>
                    <span>درجة الثقة: <strong className="text-amber-300">{decision.confidenceScore}%</strong></span>
                  </div>
                  <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                    {decision.reasons[0] || decision.summaryExecutive}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-amber-400 pt-0.5 font-semibold">
                  <span className="text-zinc-400 font-mono">السعر الحالي: {company.currentPrice.toFixed(2)} د.ع</span>
                  <span className="flex items-center gap-1 group-hover:underline">
                    عرض التقرير التاريخي الكامل <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Buy Opportunities Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> قسم أفضل 10 فرص شراء مؤهلة (فرصة شراء قوية / فرصة شراء)
          </h3>
          <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full font-bold">
            العدد الإجمالي: {autoResults.buyOpportunities.length} شركة
          </span>
        </div>

        {autoResults.buyOpportunities.length === 0 ? (
          <p className="text-zinc-500 text-xs py-4 text-center">
            لا توجد أسهم تحقق الشروط الرقمية لـ "فرصة شراء قوية" أو "فرصة شراء" في الفترة المحددة.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoResults.buyOpportunities.slice(0, 10).map((item, idx) => (
              <div
                key={item.company.ticker}
                onClick={() => onSelectStock(item.company.ticker)}
                className="p-4 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-amber-700 font-mono text-base">
                      {item.company.ticker}
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      {item.company.nameAr}
                    </span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded bg-emerald-600 text-white">
                    {item.signal}
                  </span>
                </div>

                <p className="text-xs text-zinc-700 font-mono whitespace-pre-line leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-100">
                  {item.summarySnippet}
                </p>

                <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1 font-semibold">
                  <span>الدرجة الفنية المركبة: <strong>{item.company.evaluation.compositeScore}/100</strong></span>
                  <span className="flex items-center gap-1 group-hover:underline">
                    الانتقال لتقرير السهم الكامل <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Sell Signals Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" /> قسم أعلى 10 إشارات بيع حاسمة (إشارة بيع قوية / إشارة بيع)
          </h3>
          <span className="text-xs bg-rose-100 text-rose-900 px-2.5 py-1 rounded-full font-bold">
            العدد الإجمالي: {autoResults.sellSignals.length} شركة
          </span>
        </div>

        {autoResults.sellSignals.length === 0 ? (
          <p className="text-zinc-500 text-xs py-4 text-center">
            لا توجد أسهم ينطبق عليها تصنيف إشارة بيع صريحة حالياً.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoResults.sellSignals.slice(0, 10).map((item, idx) => (
              <div
                key={item.company.ticker}
                onClick={() => onSelectStock(item.company.ticker)}
                className="p-4 bg-rose-50/40 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-amber-700 font-mono text-base">
                      {item.company.ticker}
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      {item.company.nameAr}
                    </span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded bg-rose-600 text-white">
                    {item.signal}
                  </span>
                </div>

                <p className="text-xs text-zinc-700 font-mono whitespace-pre-line leading-relaxed bg-white p-2.5 rounded-lg border border-rose-100">
                  {item.summarySnippet}
                </p>

                <div className="flex items-center justify-between text-[11px] text-rose-800 pt-1 font-semibold">
                  <span>الدرجة الفنية المركبة: <strong>{item.company.evaluation.compositeScore}/100</strong></span>
                  <span className="flex items-center gap-1 group-hover:underline">
                    الانتقال لتقرير السهم الكامل <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Excluded Illiquid Stocks Check */}
      <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" /> التحقق الحتمي: الأسهم المستبعدة في هذا التحليل لضعف السيولة ({autoResults.ineligibleList.length} شركة)
          </h3>
          <span className="text-xs text-zinc-500">حظر آلي مستند للشروط الرقمية الثلاثة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {autoResults.ineligibleList.map(({ company, eligibility }) => (
            <div key={company.ticker} className="p-2.5 bg-white rounded-xl border border-zinc-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-700 font-mono">{company.ticker}</span> - <span className="font-semibold text-zinc-800">{company.nameAr}</span>
                <span className="text-[10px] text-rose-700 block mt-0.5">{eligibility.exclusionReason}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                مُستبعد من القوائم
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
