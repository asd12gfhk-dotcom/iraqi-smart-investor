import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Check,
  BarChart2,
  Zap,
  RotateCcw,
  History,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { ISXCompany } from '../types/isx';
import {
  evaluateHistoricalDecision,
  formatTelegramHistoricalSignalMessage
} from '../utils/historicalDecisionEngine';
import { sendTelegramMessage } from '../utils/telegramService';

interface HistoricalDecisionCardProps {
  company: ISXCompany;
}

export const HistoricalDecisionCard: React.FC<HistoricalDecisionCardProps> = ({ company }) => {
  const decision = evaluateHistoricalDecision(company);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSendTelegramSignal = async () => {
    setIsSendingTelegram(true);
    setTelegramStatus(null);

    const msg = formatTelegramHistoricalSignalMessage(decision);
    const res = await sendTelegramMessage(msg);

    setIsSendingTelegram(false);
    if (res.success) {
      setTelegramStatus({
        success: true,
        message: `تم إرسال إشعار المحرك التاريخي لسهم ${company.nameAr} (${company.ticker}) بنجاح إلى تلغرام!`
      });
    } else {
      setTelegramStatus({
        success: false,
        message: res.error || 'فشل إرسال الإشعار إلى تلغرام.'
      });
    }
  };

  // Badge Color Styles
  const getBadgeStyle = () => {
    switch (decision.signal) {
      case 'BUY':
        return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-950/20';
      case 'BUY_WATCH':
        return 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-amber-950/20';
      case 'EXIT':
        return 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-rose-950/20';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 md:p-7 shadow-2xl space-y-6 dir-rtl font-sans text-zinc-100 my-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              محرك القرار التاريخي لمستثمر العراق الذكي
            </h2>
            <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
              ISX Spec v1
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400">
            تحليل التاريخ الكامل لـ <strong className="text-white">{company.nameAr} ({company.ticker})</strong> واستكشاف الدورات والحالات المشابهة وبوابات الأدلة.
          </p>
        </div>

        {/* Signal Badge & Score */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border ${getBadgeStyle()} flex items-center gap-2 shadow-lg`}>
            <span className="font-bold text-sm md:text-base">{decision.signalBadgeAr}</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl px-3.5 py-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <span className="text-zinc-400 block text-[10px]">درجة الثقة:</span>
              <span className="font-mono font-bold text-amber-300">{decision.confidenceScore}%</span>
            </div>
          </div>

          {/* Telegram Direct Test Trigger Button */}
          <button
            onClick={handleSendTelegramSignal}
            disabled={isSendingTelegram}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingTelegram ? 'جاري الإرسال...' : 'إرسال التنبيه إلى Telegram'}</span>
          </button>
        </div>
      </div>

      {telegramStatus && (
        <div
          className={`p-3 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
            telegramStatus.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {telegramStatus.success ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{telegramStatus.message}</span>
        </div>
      )}

      {/* 5 Evidence Gates Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>اختبار بوابات الأدلة التاريخية والحالية (Evidence Gates):</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Gate 1 */}
          <div
            className={`p-3 rounded-2xl border ${
              decision.gates.gate1DataQuality.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Gate 1: جودة البيانات</span>
              {decision.gates.gate1DataQuality.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <p className="text-[11px] opacity-90">{decision.gates.gate1DataQuality.message}</p>
            <span className="text-[10px] text-zinc-400 block mt-1">{decision.gates.gate1DataQuality.details}</span>
          </div>

          {/* Gate 2 */}
          <div
            className={`p-3 rounded-2xl border ${
              decision.gates.gate2HistoricalPattern.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Gate 2: النمط التاريخي</span>
              {decision.gates.gate2HistoricalPattern.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className="text-[11px] opacity-90">{decision.gates.gate2HistoricalPattern.message}</p>
            <span className="text-[10px] text-zinc-400 block mt-1">{decision.gates.gate2HistoricalPattern.details}</span>
          </div>

          {/* Gate 3 */}
          <div
            className={`p-3 rounded-2xl border ${
              decision.gates.gate3CurrentState.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Gate 3: إنهاك البيع</span>
              {decision.gates.gate3CurrentState.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <p className="text-[11px] opacity-90">{decision.gates.gate3CurrentState.message}</p>
            <span className="text-[10px] text-zinc-400 block mt-1">{decision.gates.gate3CurrentState.details}</span>
          </div>

          {/* Gate 4 */}
          <div
            className={`p-3 rounded-2xl border ${
              decision.gates.gate4LiquidityReversal.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Gate 4: تدفق السيولة</span>
              {decision.gates.gate4LiquidityReversal.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <p className="text-[11px] opacity-90">{decision.gates.gate4LiquidityReversal.message}</p>
            <span className="text-[10px] text-zinc-400 block mt-1">{decision.gates.gate4LiquidityReversal.details}</span>
          </div>

          {/* Gate 5 */}
          <div
            className={`p-3 rounded-2xl border ${
              decision.gates.gate5Validation.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Gate 5: استقرار النموذج</span>
              {decision.gates.gate5Validation.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <p className="text-[11px] opacity-90">{decision.gates.gate5Validation.message}</p>
            <span className="text-[10px] text-zinc-400 block mt-1">{decision.gates.gate5Validation.details}</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left Column: Reasons & Cancellation */}
        <div className="space-y-4">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>أسباب القرار والأدلة المباشرة:</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
              {decision.reasons.map((reason, idx) => (
                <li key={idx} className="leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>شروط إلغاء الإشارة وحماية رأس المال (Cancellation Rules):</span>
            </h4>
            <ul className="space-y-1 text-xs text-zinc-300 list-disc list-inside">
              {decision.cancellationConditions.map((cond, idx) => (
                <li key={idx} className="leading-relaxed">
                  {cond}
                </li>
              ))}
            </ul>
          </div>

          {/* Historical Cycle Info Box */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>الدورة الزمانية المكتشفة للسهم:</span>
              </h4>
              <span className="text-[11px] font-mono text-zinc-400">{decision.cycle.statusLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">طول الدورة الوسيط:</span>
                <span className="text-amber-300 font-bold">{decision.cycle.medianPeriodBars} جلسة</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">موقع السهم بالدورة:</span>
                <span className="text-emerald-400 font-bold">{decision.cycle.cycleProgressPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 col-span-2 sm:col-span-1">
                <span className="text-zinc-500 block text-[10px]">نافذة القاع:</span>
                <span className={decision.cycle.isInTroughWindow ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                  {decision.cycle.isInTroughWindow ? 'نعم (مباشرة)' : 'غير مكتملة'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Matches & Backtest Performance */}
        <div className="space-y-4">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <History className="w-4 h-4" />
                <span>نتائج الأنماط التاريخية المطابقة:</span>
              </h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                نسبة النجاح: {decision.similarity.winRate20dPct}%
              </span>
            </div>

            <p className="text-xs text-zinc-300">{decision.similarity.summaryText}</p>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">متوسط العائد (+20d):</span>
                <span className="text-emerald-400 font-bold">+{decision.similarity.medianPost20dReturnPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">أعلى عائد محقق:</span>
                <span className="text-emerald-300 font-bold">+{decision.similarity.maxPost20dReturnPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">أكبر تراجع بعد الإشارة:</span>
                <span className="text-rose-400 font-bold">{decision.similarity.minPost20dReturnPct}%</span>
              </div>
            </div>

            {/* Matched Instances List */}
            {decision.similarity.matches.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-400 font-bold block">أبرز التواريخ المطابقة في السجل:</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {decision.similarity.matches.slice(0, 4).map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 text-[11px] flex justify-between items-center font-mono"
                    >
                      <span className="text-zinc-300">{m.matchDate}</span>
                      <span className="text-amber-400">تشابه {m.similarityScore}%</span>
                      <span className={m.post20dReturnPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                        {m.post20dReturnPct >= 0 ? '+' : ''}
                        {m.post20dReturnPct}% (+20d)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Out-of-Sample Backtest Validation Box */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" />
              <span>نتائج الاختبار خارج العينة (Out-of-Sample Backtest):</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">نسبة نجاح التجربة:</span>
                <span className="text-emerald-400 font-bold">{decision.backtest.outOfSampleWinRatePct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">العائد الوسيط:</span>
                <span className="text-amber-300 font-bold">+{decision.backtest.medianReturnPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">أقصى تراجع:</span>
                <span className="text-rose-400 font-bold">{decision.backtest.maxDrawdownPct}%</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">حالة النموذج:</span>
                <span
                  className={decision.backtest.isUnstableModel ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}
                >
                  {decision.backtest.isUnstableModel ? 'UNSTABLE' : 'مستقر'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
