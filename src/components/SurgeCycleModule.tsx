import React, { useState, useMemo } from 'react';
import {
  Activity,
  Flame,
  CheckCircle,
  Vote,
  Target,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Send,
  Sparkles,
  Info,
  Copy,
  ChevronLeft
} from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { runIsxEngine } from '../utils/isxEngine';
import { sendTelegramMessage } from '../utils/telegramService';

interface SurgeCycleModuleProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

export const SurgeCycleModule: React.FC<SurgeCycleModuleProps> = ({
  companies,
  onSelectStock
}) => {
  const [threshold, setThreshold] = useState<number>(0.03);
  const [votesRequired, setVotesRequired] = useState<number>(2);
  const [minVolume, setMinVolume] = useState<number>(500000);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [sendingSymbol, setSendingSymbol] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Build the dataset { [symbol]: historyRows }
  const isxHistoryData = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const c of companies) {
      if (c.history && c.history.length > 0) {
        map[c.ticker] = c.history.map((row) => ({
          ...row,
          nameAr: c.nameAr,
          symbol: c.ticker
        }));
      }
    }
    return map;
  }, [companies]);

  // Run the exact engine as specified
  const { summary, alerts } = useMemo(() => {
    return runIsxEngine(isxHistoryData, {
      threshold,
      votesRequired,
      minVolume
    });
  }, [isxHistoryData, threshold, votesRequired, minVolume]);

  const handleCopyMessage = (text: string, symbol: string) => {
    const plainText = text.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopiedSymbol(symbol);
    setTimeout(() => setCopiedSymbol(null), 2500);
  };

  const handleSendTelegram = async (alertItem: any) => {
    setSendingSymbol(alertItem.symbol);
    try {
      const res = await sendTelegramMessage(alertItem.message);
      if (res.success) {
        setActionNotice(`✅ تم إرسال تنبيه سهم ${alertItem.symbol} إلى تلغرام بنجاح!`);
      } else {
        setActionNotice(`⚠️ فشل الإرسال: ${res.error || 'تحقق من إعدادات بوت تلغرام'}`);
      }
    } catch (e: any) {
      setActionNotice(`⚠️ حدث خطأ: ${e.message}`);
    } finally {
      setSendingSymbol(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                <Flame className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">
                محرك دورات الصعود ونظام تصويت المحركات الـ 5 (ISX Surge Cycle Engine)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              نظام بحثي متعدد المحركات المستقلة (5 Independent Sub-Engines) يقوم بمسح دورات الصعود الموجية تاريخياً لكل سهم وتوقيت موجاتها، ثم يجمع تصويت المحركات المتفقة لإصدار إشارات صعود مرجحة إحصائياً.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/60 font-mono text-xs">
            <div className="text-center">
              <span className="text-zinc-400 text-[10px] block">تنبيهات اليوم</span>
              <span className="text-emerald-400 font-extrabold text-base">{alerts.length}</span>
            </div>
            <div className="h-6 w-px bg-zinc-700"></div>
            <div className="text-center">
              <span className="text-zinc-400 text-[10px] block">الشركات المحللة</span>
              <span className="text-amber-300 font-extrabold text-base">{summary.symbolsProcessed}</span>
            </div>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="p-3 bg-zinc-800/90 text-amber-300 border border-amber-500/40 rounded-xl text-xs flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-zinc-400 hover:text-white text-xs">إغلاق</button>
          </div>
        )}

        {/* Settings & Filter Controls */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            {/* Box 1: Surge Threshold */}
            <div className="flex items-center justify-between gap-2 bg-zinc-900/90 px-3.5 py-2.5 rounded-xl border border-zinc-700/80">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>عتبة الصعود:</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setThreshold(0.03)}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                    threshold === 0.03
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  +3% (افتراضي)
                </button>
                <button
                  onClick={() => setThreshold(0.05)}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                    threshold === 0.05
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  +5%
                </button>
              </div>
            </div>

            {/* Box 2: Votes Required */}
            <div className="flex items-center justify-between gap-2 bg-zinc-900/90 px-3.5 py-2.5 rounded-xl border border-zinc-700/80">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Vote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>أصوات الإنذار:</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                {[2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVotesRequired(v)}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                      votesRequired === v
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Box 3: Daily Volume Threshold */}
            <div className="flex items-center justify-between gap-2 bg-zinc-900/90 px-3.5 py-2.5 rounded-xl border border-zinc-700/80 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>حجم التداول:</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setMinVolume(500000)}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                    minVolume === 500000
                      ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  &gt; 500k (إلزامي)
                </button>
                <button
                  onClick={() => setMinVolume(0)}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                    minVolume === 0
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>نظام تصويت مستقل بين 5 كواشف فنية ودورية مع تصفية حجم التداول اليومي لآخر يوم (&gt; 500,000 سهم)</span>
          </div>
        </div>
      </div>

      {/* Sub-engines Precision and Lift Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summary.engineSummary?.map((eng: any) => (
          <div
            key={eng.engine}
            className="bg-white border border-zinc-200 rounded-xl p-3 shadow-xs space-y-1 hover:border-amber-300 transition-colors"
          >
            <span className="text-[10px] text-zinc-500 font-bold block truncate" title={eng.engine}>
              {eng.engine.replace('Engine ', 'محرك ')}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-extrabold text-zinc-900 font-mono">
                {(eng.precision * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                {eng.lift}x Lift
              </span>
            </div>
            <span className="text-[9px] text-zinc-400 block font-mono">
              تكرار: {eng.occurrences} | نجاح: {eng.successes}
            </span>
          </div>
        ))}

        {/* Combined Vote Metric */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 shadow-xs space-y-1">
          <span className="text-[10px] text-amber-900 font-bold block">
            التصويت المشترك (≥{votesRequired})
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {(summary.combinedVoteSummary?.precision * 100 || 0).toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-mono">
              {summary.combinedVoteSummary?.lift}x Lift
            </span>
          </div>
          <span className="text-[9px] text-amber-700 block font-mono">
            خط الأساس للسوق: {(summary.baselinePrecision * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Alerts Grid Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-zinc-900">
              قائمة تنبيهات دورات الصعود المؤكدة بالتصويت اليوم ({alerts.length} سهم)
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            شرط التنبيه: توافق {votesRequired} محركات فأكثر على نفس السهم
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-bold text-zinc-700">لا توجد أسهم تحقق توافق {votesRequired} محركات اليوم</p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              يمكنك خفض الأصوات المطلوبة إلى محركين (2) أو مراجعة الشركات عند التحديث القادم لجلسة التداول.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((item) => {
              const comp = companies.find((c) => c.ticker === item.symbol);
              const companyName = comp ? comp.nameAr : item.symbol;

              return (
                <div
                  key={item.symbol}
                  className="p-4 bg-zinc-50 hover:bg-white border border-zinc-200 hover:border-amber-400 rounded-xl transition-all shadow-2xs space-y-3 group"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-amber-700 font-mono text-base bg-amber-100/60 px-2 py-0.5 rounded-md border border-amber-200">
                        {item.symbol}
                      </span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {companyName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                        <Vote className="w-3.5 h-3.5" /> {item.votesCount}/5 محركات
                      </span>
                    </div>
                  </div>

                  {/* Pricing and Target Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-zinc-200 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">سعر الدخول:</span>
                      <span className="font-extrabold text-zinc-900 font-mono text-sm">
                        {item.entryPrice.toFixed(2)} د.ع
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">الهدف المتوقع:</span>
                      <span className="font-extrabold text-emerald-700 font-mono text-sm flex items-center gap-1">
                        {item.expectedTarget ? `${item.expectedTarget.toFixed(2)} د.ع` : 'قيد القياس'}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">حجم تداول آخر يوم:</span>
                      <span className="font-extrabold text-emerald-700 font-mono text-xs block truncate" title={`${Math.round(item.lastVolume || 0).toLocaleString()} سهم`}>
                        {Math.round(item.lastVolume || 0).toLocaleString()} سهم
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">قيمة التداول:</span>
                      <span className="font-extrabold text-zinc-800 font-mono text-xs block truncate" title={`${Math.round(item.lastValue || 0).toLocaleString()} د.ع`}>
                        {Math.round(item.lastValue || 0).toLocaleString()} د.ع
                      </span>
                    </div>
                  </div>

                  {/* Agreed Engines List */}
                  <div className="bg-zinc-100/80 p-2.5 rounded-lg border border-zinc-200 text-xs space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">المحركات المتفقة:</span>
                    <p className="text-[11px] text-zinc-800 font-medium leading-relaxed">
                      {item.votesEngines}
                    </p>
                    {item.lastWaveGainPct !== null && (
                      <span className="text-[10px] text-amber-800 block pt-1 font-mono">
                        آخر موجة: صعود بنسبة +{item.lastWaveGainPct.toFixed(1)}% (من {item.lastWaveLow} إلى {item.lastWaveHigh})
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => onSelectStock(item.symbol)}
                      className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      عرض التحليل الفني <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyMessage(item.message, item.symbol)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-zinc-700 flex items-center gap-1 font-medium transition-colors cursor-pointer text-[11px]"
                        title="نسخ نص التنبيه"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedSymbol === item.symbol ? 'تم النسخ' : 'نسخ'}
                      </button>

                      <button
                        onClick={() => handleSendTelegram(item)}
                        disabled={sendingSymbol === item.symbol}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center gap-1 font-bold transition-colors cursor-pointer text-[11px] disabled:opacity-50"
                        title="إرسال إلى بوت تلغرام فوراً"
                      >
                        <Send className="w-3 h-3" />
                        {sendingSymbol === item.symbol ? 'جاري الإرسال...' : 'تلغرام'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
