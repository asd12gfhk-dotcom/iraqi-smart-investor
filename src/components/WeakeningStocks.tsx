import React from 'react';
import { AlertTriangle, TrendingDown, ChevronLeft, ShieldAlert } from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { detectWeakeningStocks } from '../utils/weakeningEngine';

interface WeakeningStocksProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

export const WeakeningStocks: React.FC<WeakeningStocksProps> = ({ companies, onSelectStock }) => {
  const weakeningList = detectWeakeningStocks(companies);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> قسم الأسهم الضعيفة وتراجع القوة الفنية (Weakening Stocks)
          </h2>
          <span className="text-xs bg-rose-100 text-rose-900 border border-rose-200 px-3 py-1 rounded-full font-bold">
            {weakeningList.length} شركة ينطبق عليها الفحص
          </span>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          قسم مستقل يكتشف تحديداً الأسهم التي شهدت <strong>تراجعاً فعلياً حديثاً خلال آخر 5 جلسات فعلية</strong>، بغض النظر عن مستواها المطلق.
          يُدرَج السهم هنا حتمياً إذا تحقق واحد أو أكثر من شروط القوة الفنية، الاتجاه، أو السيولة.
        </p>
      </div>

      {/* Weakening Stocks List */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        {weakeningList.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
            <ShieldAlert className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
            <p className="font-bold text-zinc-700">لا توجد أسهم تشهد تراجعاً فنياً أو فقداناً للاتجاه الصاعد خلال آخر 5 جلسات.</p>
            <p>جميع أسهم السوق تحافظ على استقرار مستوياتها الفنية والسيولة الحالية.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakeningList.map((item, idx) => (
              <div
                key={item.company.ticker}
                onClick={() => onSelectStock(item.company.ticker)}
                className="p-4 bg-rose-50/40 hover:bg-rose-50 border border-rose-200 rounded-2xl cursor-pointer transition-all space-y-3 group"
              >
                {/* Stock Title Row */}
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-mono text-xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-extrabold text-amber-700 font-mono text-base block">
                        {item.company.ticker}
                      </span>
                      <span className="font-bold text-zinc-900 text-xs">
                        {item.company.nameAr} ({item.company.sector})
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-zinc-900 block">{(item.company?.currentPrice ?? 0).toFixed(2)} د.ع</span>
                    <span className="text-[11px] font-bold text-rose-700">Composite: {item.currScore}/100</span>
                  </div>
                </div>

                {/* Triggered Weakening Reasons List */}
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-rose-100 text-xs text-rose-950 font-sans">
                  <span className="font-bold text-rose-900 text-[11px] block mb-1">أسباب الإدراج بهذة القائمة:</span>
                  {item.reasons.map((reason, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-zinc-600 pt-1 border-t border-rose-100">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">القوة الفنية:</span>
                    <span className="font-bold text-zinc-800">{item.prevScore} &rarr; {item.currScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">الاتجاه:</span>
                    <span className="font-bold text-zinc-800">{item.prevTrend} &rarr; {item.currTrend}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">درجة السيولة:</span>
                    <span className="font-bold text-zinc-800">{item.prevLiqScore} &rarr; {item.currLiqScore}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end text-[11px] text-amber-800 font-semibold group-hover:underline pt-1">
                  الانتقال لتقرير التحليل الكامل <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
