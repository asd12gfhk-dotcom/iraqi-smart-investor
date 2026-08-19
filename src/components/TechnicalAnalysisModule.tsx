import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import {
  CheckCircle2,
  XCircle,
  Globe,
  Sliders,
  TrendingUp,
  Layers,
  Search,
  Zap,
  Info,
  BarChart3,
  ShieldCheck,
  Award,
  Activity,
  ArrowUpDown,
  FileText,
  Flame,
  Bell,
  Send,
  Check,
  Trash2,
  AlertTriangle,
  Sparkles,
  X,
  BellRing
} from 'lucide-react';
import { ISXCompany, AlertRule } from '../types/isx';
import { computeTechnicalIndicators } from '../utils/technicalEngine';
import { computeCoreV22Systems, calculateMajorMoves } from '../utils/evaluatorEngine';
import {
  getTelegramConfig,
  sendStockPriceAlertNotification,
  testTelegramConnection
} from '../utils/telegramService';
import { normalizeEnglishDigits } from '../utils/numberUtils';
import { HistoricalDecisionCard } from './HistoricalDecisionCard';

interface TechnicalAnalysisModuleProps {
  companies: ISXCompany[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  alerts?: AlertRule[];
  onUpdateAlerts?: (alerts: AlertRule[]) => void;
}

// Custom Tooltip component for Chart replicating user's exact popup card with highlighted Liquidity box
const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const valueFormatted = (data.value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return (
      <div className="bg-[#181d28] text-white p-4 rounded-2xl shadow-2xl border border-zinc-700/80 text-xs w-[280px] dir-rtl font-sans select-none pointer-events-none">
        {/* Date Header */}
        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-700/60 font-mono text-zinc-300">
          <span className="text-[11px] text-zinc-400">التاريخ:</span>
          <span className="font-bold text-sm text-white">{data.fullDate || data.date}</span>
        </div>

        {/* Price Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2.5 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-400">فتح:</span>
            <span className="text-emerald-400 font-bold">{data.open?.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">إغلاق:</span>
            <span className="text-emerald-400 font-bold">{data.close?.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">أعلى:</span>
            <span className="text-zinc-200 font-bold">{data.high?.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">أدنى:</span>
            <span className="text-zinc-200 font-bold">{data.low?.toFixed(3)}</span>
          </div>
        </div>

        {/* Highlighted Green Liquidity Box - مربع خاص بالسيولة */}
        <div className="bg-[#0f2e28] border-2 border-emerald-500/80 rounded-xl p-3 my-2 text-center shadow-inner">
          <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold text-[12px] mb-1">
            <span>السيولة (قيمة التداول):</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
          </div>
          <div className="text-emerald-300 font-mono font-black text-lg tracking-wide">
            {valueFormatted} <span className="text-xs text-emerald-400 font-normal">د.ع</span>
          </div>
        </div>

        {/* Number of Trades */}
        <div className="flex justify-between items-center py-1 border-b border-zinc-700/50 mb-2 font-mono text-[11px]">
          <span className="text-zinc-400">عدد الصفقات:</span>
          <span className="font-bold text-white">{data.trades || 0} صفقة</span>
        </div>

        {/* Technical Indicators */}
        <div className="space-y-1 text-[11px] font-mono text-zinc-300 pt-0.5">
          {data.sma20 !== undefined && (
            <div className="flex justify-between">
              <span className="text-blue-400 font-semibold">:SMA 20</span>
              <span>{data.sma20.toFixed(3)}</span>
            </div>
          )}
          {data.sma50 !== undefined && (
            <div className="flex justify-between">
              <span className="text-amber-400 font-semibold">:SMA 50</span>
              <span>{data.sma50.toFixed(3)}</span>
            </div>
          )}
          {data.sma200 !== undefined && (
            <div className="flex justify-between">
              <span className="text-purple-400 font-semibold">:SMA 200</span>
              <span>{data.sma200.toFixed(3)}</span>
            </div>
          )}
          {data.rsi14 !== undefined && (
            <div className="flex justify-between">
              <span className="text-rose-400 font-semibold">:RSI 14</span>
              <span>{data.rsi14.toFixed(2)}</span>
            </div>
          )}
          {data.macdLine !== undefined && (
            <div className="flex justify-between">
              <span className="text-cyan-400 font-semibold">:MACD / Signal</span>
              <span>{data.macdLine?.toFixed(3)} / {data.macdSignal?.toFixed(3)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TechnicalAnalysisModule: React.FC<TechnicalAnalysisModuleProps> = ({
  companies,
  selectedTicker,
  onSelectTicker,
  alerts = [],
  onUpdateAlerts
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // Chart Controls
  const [chartType, setChartType] = useState<'LINE' | 'AREA' | 'CANDLE'>('AREA');
  const [chartPeriod, setChartPeriod] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | '2y' | '5y' | 'ALL'>('3m');

  // Chart Overlay Toggles
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showSupports, setShowSupports] = useState(true);
  const [showResistances, setShowResistances] = useState(true);

  // Subchart Toggle: 'RSI' | 'MACD' | 'VOLUME'
  const [activeSubchart, setActiveSubchart] = useState<'RSI' | 'MACD' | 'VOLUME'>('RSI');

  // Telegram Alert Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [alertTypeInput, setAlertTypeInput] = useState<'PRICE_BELOW' | 'PRICE_ABOVE'>('PRICE_BELOW');
  const [alertNoteInput, setAlertNoteInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const company = companies.find((c) => c.ticker === selectedTicker) || companies[0];

  const handleOpenAlertModal = () => {
    setTargetPriceInput('');
    setTestResult(null);
    setIsAlertModalOpen(true);
    window.history.pushState({ modalOpen: 'techAlertModal', tab: 'analysis', ticker: selectedTicker }, '');
  };

  const handleCloseAlertModal = () => {
    setIsAlertModalOpen(false);
    if (window.history.state && window.history.state.modalOpen) {
      window.history.back();
    }
  };

  // Close modal when hardware back button is pressed
  React.useEffect(() => {
    const handlePopStateModal = () => {
      if (isAlertModalOpen) {
        setIsAlertModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopStateModal);
    window.addEventListener('app-back-pressed', handlePopStateModal);
    return () => {
      window.removeEventListener('popstate', handlePopStateModal);
      window.removeEventListener('app-back-pressed', handlePopStateModal);
    };
  }, [isAlertModalOpen]);

  const telegramConfig = getTelegramConfig();

  // Save new stock price alert rule
  const handleSaveTelegramAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = normalizeEnglishDigits(targetPriceInput);
    const targetVal = parseFloat(cleanStr);

    if (isNaN(targetVal) || targetVal <= 0 || !company) return;

    const newRule: AlertRule = {
      id: Date.now().toString(),
      ticker: company.ticker,
      type: alertTypeInput,
      targetValue: targetVal,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      note: alertNoteInput.trim() || undefined
    };

    const updatedAlerts = [...alerts, newRule];
    if (onUpdateAlerts) {
      onUpdateAlerts(updatedAlerts);
    }

    // Check if price condition is ALREADY satisfied right now
    const isConditionMet =
      alertTypeInput === 'PRICE_BELOW'
        ? company.currentPrice <= targetVal
        : company.currentPrice >= targetVal;

    if (isConditionMet) {
      setTestResult({
        success: true,
        msg: `تم حفظ التنبيه! السعر الحالي (${company.currentPrice.toFixed(2)} د.ع) أوفى بالشرط بالفعل، جاري إرسال إشعار تلغرام الفوري...`
      });
      await sendStockPriceAlertNotification(
        company.nameAr,
        company.ticker,
        company.currentPrice,
        targetVal,
        alertTypeInput,
        alertNoteInput
      );
    } else {
      setTestResult({
        success: true,
        msg: `تم حفظ تنبيه السعر لسهم ${company.nameAr} (${company.ticker}) بنجاح! سيتم إرسال رسالة تلغرام فور وصول السعر إلى ${targetVal.toFixed(2)} د.ع.`
      });
    }

    setAlertNoteInput('');
  };

  const handleToggleAlertRule = (id: string) => {
    if (!onUpdateAlerts) return;
    const updated = alerts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    onUpdateAlerts(updated);
  };

  const handleDeleteAlertRule = (id: string) => {
    if (!onUpdateAlerts) return;
    const updated = alerts.filter((a) => a.id !== id);
    onUpdateAlerts(updated);
  };

  const handleSendTestTelegramMessage = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    const res = await testTelegramConnection();
    setIsSendingTest(false);
    if (res.success) {
      setTestResult({
        success: true,
        msg: 'تم إرسال رسالة اختبار بنجاح عبر Telegram Bot إلى حسابك/قناتك! تحقق من تطبيق تلغرام الآن 📲'
      });
    } else {
      setTestResult({
        success: false,
        msg: `فشل الإرسال: ${res.error || 'تعذر الاتصال بـ Telegram Bot API'}`
      });
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameAr.includes(searchQuery) ||
      c.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const indicators = company?.indicators || computeTechnicalIndicators(company?.history || []);
  const evaluation = company?.evaluation;
  const nonIraqi = company?.nonIraqi || {
    accumulationTrend: 'توازن / لا يوجد صافي المؤشر',
    influenceScore: 50,
    alignmentWithPrice: 'حيادي',
    buyVolume: 0,
    buyValue: 0,
    sellVolume: 0,
    sellValue: 0,
    netValue: 0
  };
  const history = company?.history || [];

  // Safe fallback extractions
  const weightsUsed = evaluation?.weightsUsed || {
    trend: 0.28,
    momentum: 0.18,
    volume: 0.14,
    liquidity: 0.14,
    pattern: 0.08,
    foreign: 0.18
  };

  const trendAnalysis = evaluation?.trendAnalysis || {
    shortTerm: { level: 'جانبي' as const, priceDiffPct: 0, slopePct: 0 },
    mediumTerm: { level: 'جانبي' as const, priceDiffPct: 0, slopePct: 0 },
    longTerm: { level: 'جانبي' as const, priceDiffPct: 0, slopePct: 0 },
    strengthScore: 50,
    alignment: 'مرحلة انتقالية / تباين' as const
  };

  const supports = evaluation?.supports || [];
  const resistances = evaluation?.resistances || [];
  const recentMajorMoves = (evaluation?.recentMajorMoves && evaluation.recentMajorMoves.length > 0)
    ? evaluation.recentMajorMoves
    : calculateMajorMoves(history).moves;

  const scoreBreakdown = evaluation?.scoreBreakdown || {
    trendScore: 50,
    momentumScore: 50,
    volumeScore: 50,
    liquidityScore: 50,
    patternScore: 50,
    foreignScore: 50,
    total: evaluation?.compositeScore || 50
  };

  // Filter history based on selected chartPeriod
  let periodDays = 60; // default 3m (~60 active bars)
  if (chartPeriod === '1w') periodDays = 5;
  if (chartPeriod === '1m') periodDays = 20;
  if (chartPeriod === '3m') periodDays = 60;
  if (chartPeriod === '6m') periodDays = 120;
  if (chartPeriod === '1y') periodDays = 240;
  if (chartPeriod === '2y') periodDays = 480;
  if (chartPeriod === '5y' || chartPeriod === 'ALL') periodDays = history.length;

  const filteredHistory = history.slice(-periodDays);

  // Prepare chart data with calculated indicators
  const chartData = filteredHistory.map((bar, index) => {
    const subHistory = filteredHistory.slice(0, index + 1);
    const closes = subHistory.map((b) => b.close);

    const sum20 = closes.slice(Math.max(0, closes.length - 20)).reduce((a, b) => a + b, 0);
    const sma20 = subHistory.length >= 20 ? sum20 / Math.min(20, subHistory.length) : bar.close;

    const sum50 = closes.slice(Math.max(0, closes.length - 50)).reduce((a, b) => a + b, 0);
    const sma50 = subHistory.length >= 50 ? sum50 / Math.min(50, subHistory.length) : bar.close;

    const sum200 = closes.slice(Math.max(0, closes.length - 200)).reduce((a, b) => a + b, 0);
    const sma200 = subHistory.length >= 200 ? sum200 / 200 : indicators.sma200 || bar.close;

    const ema12 = indicators.ema12 || bar.close;

    return {
      date: bar.date.substring(5), // MM-DD
      fullDate: bar.date,
      close: bar.close,
      high: bar.high,
      low: bar.low,
      open: bar.open,
      volume: bar.volume,
      value: bar.value || (bar.close * bar.volume),
      trades: bar.trades || Math.max(1, Math.round(bar.volume / 12000)),
      nonIraqiNet: bar.nonIraqiNetVolume,
      sma20: Number(sma20.toFixed(3)),
      sma50: Number(sma50.toFixed(3)),
      sma200: Number(sma200.toFixed(3)),
      ema12: Number(ema12.toFixed(3)),
      rsi14: Number((indicators.rsi14 ?? 50).toFixed(2)),
      macdLine: Number((indicators.macdLine ?? 0).toFixed(3)),
      macdSignal: Number((indicators.macdSignal ?? 0).toFixed(3)),
      vwap: Number((indicators?.vwap ?? bar.close).toFixed(3)),
      pivot: indicators?.pivots?.p ?? bar.close,
      r1: indicators?.pivots?.r1 ?? bar.close,
      s1: indicators?.pivots?.s1 ?? bar.close,
      bollingerUpper: indicators?.bollingerUpper ?? bar.close,
      bollingerLower: indicators?.bollingerLower ?? bar.close
    };
  });

  return (
    <div className="space-y-6">
      {/* Ticker & Sector Selector Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالرمز أو اسم الشركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-amber-500"
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

        {/* Quick Company Pills */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar py-1">
          {filteredCompanies.slice(0, 10).map((c) => (
            <button
              key={c.ticker}
              onClick={() => onSelectTicker(c.ticker)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                c.ticker === selectedTicker
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
              }`}
            >
              {c.ticker} - {c.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. السعر (Price Summary & Header) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 text-xs font-bold text-amber-800">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">1</span>
          <span>السعر والسوق (Price Summary)</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-amber-700 font-mono">{company.ticker}</span>
              <h1 className="text-xl font-bold text-zinc-900">{company.nameAr}</h1>
              <span className="text-xs text-zinc-500 font-mono">({company.nameEn})</span>
              <span className="px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs rounded-full font-semibold">
                قطاع {company.sector}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>حالة التداول: <strong className="text-emerald-700">{company.status}</strong></span>
              <span>•</span>
              <span>القيمة السوقية: <strong className="text-zinc-800 font-mono">{(company.marketCap / 1000000000).toFixed(2)} مليار د.ع</strong></span>
              <span>•</span>
              <span>الأسهم المدرجة: <strong className="text-zinc-800 font-mono">{(company.sharesCount / 1000000).toFixed(0)}M سهم</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Telegram Alert Button - زر التنبيه */}
            <button
              onClick={handleOpenAlertModal}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all border border-sky-400/40 cursor-pointer active:scale-95"
              title="تحديد سعر مستهدف وتلقي إشعارات فورية عبر Telegram Bot"
            >
              <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>زر التنبيه (تحديد سعر مستهدف)</span>
              <Send className="w-3.5 h-3.5 text-sky-200 dir-rtl" />
            </button>

            <div className="text-right">
              <span className="text-xs text-zinc-500 block">آخر سعر إغلاق:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 font-mono">{company.currentPrice.toFixed(2)}</span>
                <span className="text-xs text-zinc-500 font-semibold">د.ع</span>
                <span
                  className={`text-sm font-bold font-mono px-2.5 py-0.5 rounded border ${
                    company.change >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {company.change >= 0 ? '+' : ''}{company.change.toFixed(2)} ({company.changePct.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border ${evaluation.badgeBg} flex flex-col items-center justify-center min-w-[120px]`}>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">التقييم الفني</span>
              <span className={`text-xl font-black ${evaluation.badgeTextColor} my-0.5`}>
                {evaluation.tier}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-800">
                {evaluation.compositeScore}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🟢 Smart Iraqi Investor - Historical Decision Engine Component */}
      {/* ========================================================================= */}
      {company && <HistoricalDecisionCard company={company} />}

      {/* ========================================================================= */}
      {/* 2. الرسم البياني (Interactive Chart & Overlays) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">2</span>
            <span className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              حركة الأسعار (الشموع) والسيولة المتدفقة (د.ع)
            </span>
          </div>

          {/* Time periods: 1w, 1m, 3m, 6m, 1y, 2y, 5y, ALL */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs overflow-x-auto">
            {(['1w', '1m', '3m', '6m', '1y', '2y', '5y', 'ALL'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  chartPeriod === p ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {p === '1w' ? 'أسبوع' : p === '1m' ? 'شهر' : p === '3m' ? '3 أشهر' : p === '6m' ? '6 أشهر' : p === '1y' ? 'سنة' : p === '2y' ? 'سنتان' : p === '5y' ? '5 سنوات' : 'الكل'}
              </button>
            ))}
          </div>
        </div>

        {/* 🟢 Dedicated Liquidity Card (مربع خاص بالسيولة المتدفقة) */}
        <div className="bg-[#101827] border-2 border-emerald-500/80 rounded-2xl p-4 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                <Flame className="w-5 h-5 animate-pulse text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span>السيولة (قيمة التداول):</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-300 mt-0.5 tracking-tight">
                  {(company.value || 0).toLocaleString('en-US')} <span className="text-xs text-emerald-400 font-normal">د.ع</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">حالة السيولة:</span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {scoreBreakdown.liquidityScore >= 70 ? 'سيولة تدفقية مرتفعة 🔥' : scoreBreakdown.liquidityScore >= 40 ? 'سيولة متوازنة ⚖️' : 'سيولة منخفضة ⚠️'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">حجم التداول اليومي:</span>
              <span className="font-bold text-emerald-400 text-sm">{(company.volume || 0).toLocaleString()} سهم</span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">عدد الصفقات المنفذة:</span>
              <span className="font-bold text-white text-sm">{(company.tradesCount || 0).toLocaleString()} صفقة</span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">معدل حجم الصفقة:</span>
              <span className="font-bold text-amber-400 text-sm">
                {company.tradesCount > 0 ? Math.round(company.volume / company.tradesCount).toLocaleString() : 0} سهم
              </span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">درجة تقييم السيولة:</span>
              <span className="font-bold text-emerald-300 text-sm">{scoreBreakdown.liquidityScore}/100</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-700">نمط الرسم:</span>
            <button
              onClick={() => setChartType('AREA')}
              className={`px-2.5 py-1 rounded font-bold ${chartType === 'AREA' ? 'bg-amber-500 text-zinc-950' : 'bg-white text-zinc-700 border'}`}
            >
              مساحي (Area)
            </button>
            <button
              onClick={() => setChartType('LINE')}
              className={`px-2.5 py-1 rounded font-bold ${chartType === 'LINE' ? 'bg-amber-500 text-zinc-950' : 'bg-white text-zinc-700 border'}`}
            >
              خطي (Line)
            </button>
            <button
              onClick={() => setChartType('CANDLE')}
              className={`px-2.5 py-1 rounded font-bold ${chartType === 'CANDLE' ? 'bg-amber-500 text-zinc-950' : 'bg-white text-zinc-700 border'}`}
            >
              شموع / بارات
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-zinc-700">أدوات الرسم والتركيب:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showSMA} onChange={(e) => setShowSMA(e.target.checked)} className="accent-amber-500" />
              <span>SMA (20/50)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showEMA} onChange={(e) => setShowEMA(e.target.checked)} className="accent-amber-500" />
              <span>EMA12</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} className="accent-amber-500" />
              <span>Bollinger</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showVWAP} onChange={(e) => setShowVWAP(e.target.checked)} className="accent-amber-500" />
              <span>VWAP</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showSupports} onChange={(e) => setShowSupports(e.target.checked)} className="accent-amber-500" />
              <span>الدعم</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showResistances} onChange={(e) => setShowResistances(e.target.checked)} className="accent-amber-500" />
              <span>المقاومة</span>
            </label>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="h-72 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#52525b', fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" tick={{ fill: '#52525b', fontSize: 11 }} orientation="right" />
              <Tooltip content={<CustomChartTooltip />} />

              {chartType === 'AREA' ? (
                <Area type="monotone" dataKey="close" stroke="#d97706" fill="#fef3c7" fillOpacity={0.6} strokeWidth={2.5} name="سعر الإغلاق" />
              ) : (
                <Line type="monotone" dataKey="close" stroke="#d97706" strokeWidth={2.5} dot={false} name="سعر الإغلاق" />
              )}

              {showSMA && <Line type="monotone" dataKey="sma20" stroke="#2563eb" strokeWidth={1.5} dot={false} name="SMA 20" />}
              {showSMA && <Line type="monotone" dataKey="sma50" stroke="#9333ea" strokeWidth={1.5} dot={false} name="SMA 50" />}
              {showEMA && <Line type="monotone" dataKey="ema12" stroke="#059669" strokeWidth={1.5} dot={false} name="EMA 12" />}
              {showVWAP && <Line type="monotone" dataKey="vwap" stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="VWAP" />}

              {showBollinger && <Line type="monotone" dataKey="bollingerUpper" stroke="#dc2626" strokeWidth={1} strokeDasharray="2 2" dot={false} name="بولينجر علوي" />}
              {showBollinger && <Line type="monotone" dataKey="bollingerLower" stroke="#16a34a" strokeWidth={1} strokeDasharray="2 2" dot={false} name="بولينجر سفلي" />}

              {/* Support Reference Lines */}
              {showSupports && supports.slice(0, 2).map((s, idx) => (
                <ReferenceLine key={`sup-${idx}`} y={s.price} stroke="#16a34a" strokeDasharray="3 3" label={{ value: `دعم: ${(s.price ?? 0).toFixed(2)}`, fill: '#15803d', fontSize: 10, position: 'right' }} />
              ))}

              {/* Resistance Reference Lines */}
              {showResistances && resistances.slice(0, 2).map((r, idx) => (
                <ReferenceLine key={`res-${idx}`} y={r.price} stroke="#dc2626" strokeDasharray="3 3" label={{ value: `مقاومة: ${(r.price ?? 0).toFixed(2)}`, fill: '#b91c1c', fontSize: 10, position: 'right' }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Subchart Selector */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-700">المخطط التكميلي السفلي:</span>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setActiveSubchart('RSI')}
              className={`px-3 py-1 rounded font-bold ${activeSubchart === 'RSI' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-100 text-zinc-700'}`}
            >
              RSI (14)
            </button>
            <button
              onClick={() => setActiveSubchart('MACD')}
              className={`px-3 py-1 rounded font-bold ${activeSubchart === 'MACD' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-100 text-zinc-700'}`}
            >
              MACD
            </button>
            <button
              onClick={() => setActiveSubchart('VOLUME')}
              className={`px-3 py-1 rounded font-bold ${activeSubchart === 'VOLUME' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-100 text-zinc-700'}`}
            >
              الحجم اليومي
            </button>
          </div>
        </div>

        {/* Subchart Render */}
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f4f4f5" />
              <XAxis dataKey="date" hide />
              <YAxis domain={activeSubchart === 'RSI' ? [0, 100] : ['auto', 'auto']} stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 10 }} orientation="right" />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />

              {activeSubchart === 'RSI' && (
                <>
                  <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey={() => indicators.rsi14} stroke="#d97706" strokeWidth={2} dot={false} name="RSI (14)" />
                </>
              )}

              {activeSubchart === 'MACD' && (
                <>
                  <ReferenceLine y={0} stroke="#a1a1aa" />
                  <Bar dataKey={() => indicators.macdHist} fill="#3b82f6" name="MACD Hist" />
                </>
              )}

              {activeSubchart === 'VOLUME' && (
                <Bar dataKey="volume" fill="#f59e0b" name="الحجم" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. القوة الفنية (Composite Score & Technical Strength) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">3</span>
            <span className="text-sm text-zinc-900">القوة الفنية والتقييم المركب (Composite Technical Score)</span>
          </div>
          <span className="text-xs text-zinc-500 font-semibold">درجة ثقة التقييم: <strong className="text-amber-700 font-mono">{evaluation.confidenceScore}</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">الاتجاه (28%)</span>
            <span className="text-base font-bold text-amber-700 font-mono">{scoreBreakdown.trendScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: `${scoreBreakdown.trendScore}%` }}></div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">الزخم (18%)</span>
            <span className="text-base font-bold text-blue-700 font-mono">{scoreBreakdown.momentumScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${scoreBreakdown.momentumScore}%` }}></div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">الحجم (14%)</span>
            <span className="text-base font-bold text-purple-700 font-mono">{scoreBreakdown.volumeScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full" style={{ width: `${scoreBreakdown.volumeScore}%` }}></div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">السيولة (14%)</span>
            <span className="text-base font-bold text-emerald-700 font-mono">{scoreBreakdown.liquidityScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${scoreBreakdown.liquidityScore}%` }}></div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">النماذج (8%)</span>
            <span className="text-base font-bold text-amber-700 font-mono">{scoreBreakdown.patternScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: `${scoreBreakdown.patternScore}%` }}></div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">تدفق غير العراقيين (18%)</span>
            <span className="text-base font-bold text-teal-700 font-mono">{scoreBreakdown.foreignScore}/100</span>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full" style={{ width: `${scoreBreakdown.foreignScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. الاتجاه (Trend Analysis) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">4</span>
            <span className="text-sm text-zinc-900">تحليل الاتجاه متعدد الآفاق (Multi-Timeframe Trend)</span>
          </div>
          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg font-bold">
            التنسيق: {trendAnalysis.alignment}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">قصير المدى (SMA20)</span>
            <strong className="text-zinc-900 block font-bold text-sm">{trendAnalysis.shortTerm.level}</strong>
            <div className="text-[10px] text-zinc-600 font-mono">
              فرق السعر: {trendAnalysis.shortTerm.priceDiffPct}% • الميل: {trendAnalysis.shortTerm.slopePct}%
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">متوسط المدى (SMA50)</span>
            <strong className="text-zinc-900 block font-bold text-sm">{trendAnalysis.mediumTerm.level}</strong>
            <div className="text-[10px] text-zinc-600 font-mono">
              فرق السعر: {trendAnalysis.mediumTerm.priceDiffPct}% • الميل: {trendAnalysis.mediumTerm.slopePct}%
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">طويل المدى (SMA200)</span>
            <strong className="text-zinc-900 block font-bold text-sm">{trendAnalysis.longTerm.level}</strong>
            <div className="text-[10px] text-zinc-600 font-mono">
              فرق السعر: {trendAnalysis.longTerm.priceDiffPct}% • الميل: {trendAnalysis.longTerm.slopePct}%
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
          <span className="text-zinc-600 font-medium">مقياس قوة الاتجاه الرقمي (Trend Strength):</span>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div className="bg-amber-600 h-full rounded-full" style={{ width: `${trendAnalysis.strengthScore}%` }}></div>
            </div>
            <span className="font-mono font-bold text-zinc-900">{trendAnalysis.strengthScore}/100</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. الدعم والمقاومة (Support & Resistance) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">5</span>
            <span className="text-sm text-zinc-900">مستويات الدعم والمقاومة الحتمية (Support & Resistance Top 3)</span>
          </div>
          <span className="text-xs text-zinc-500">مكتشفة بحساب النقاط المفصلية والارتدادات الحجمية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Supports */}
          <div className="space-y-2">
            <h4 className="font-bold text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> مستويات الدعم (Support):
            </h4>
            {supports.length === 0 ? (
              <p className="text-zinc-500 text-[11px] py-2">لا توجد مستويات دعم مؤكدة قريبة.</p>
            ) : (
              supports.map((s, idx) => (
                <div key={idx} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-emerald-900 text-sm block">{(s.price ?? 0).toFixed(2)} د.ع</span>
                    <span className="text-[10px] text-emerald-700">ارتدادات: {s.bounceCount} • قوة النقاط: {s.score}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    {s.strengthLabel}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Resistances */}
          <div className="space-y-2">
            <h4 className="font-bold text-rose-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> مستويات المقاومة (Resistance):
            </h4>
            {resistances.length === 0 ? (
              <p className="text-zinc-500 text-[11px] py-2">لا توجد مستويات مقاومة مؤكدة قريبة.</p>
            ) : (
              resistances.map((r, idx) => (
                <div key={idx} className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-rose-900 text-sm block">{(r.price ?? 0).toFixed(2)} د.ع</span>
                    <span className="text-[10px] text-rose-700">ارتدادات: {r.bounceCount} • قوة النقاط: {r.score}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                    {r.strengthLabel}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. المؤشرات (Detailed Indicators Grid) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">7</span>
            <span className="text-sm text-zinc-900">شبكة المؤشرات الفنية الرقمية (Technical Indicators Grid)</span>
          </div>
          <span className="text-xs text-zinc-500">حساب حتمي بدون تقدير بشري</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">RSI (14)</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{(indicators?.rsi14 ?? 0).toFixed(2)}</strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">{indicators?.rsiStatus || '-'}</span>
          </div>

          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">MACD Hist</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{(indicators?.macdHist ?? 0).toFixed(3)}</strong>
            <span className="text-[10px] text-blue-700 block mt-0.5">{indicators?.macdSignalType || '-'}</span>
          </div>

          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">Stochastic %K/%D</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{(indicators?.stochasticK ?? 0).toFixed(1)} / {(indicators?.stochasticD ?? 0).toFixed(1)}</strong>
            <span className="text-[10px] text-zinc-600 block mt-0.5">{indicators?.stochasticStatus || '-'}</span>
          </div>

          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">ADX (14)</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{(indicators?.adx14 ?? 0).toFixed(1)}</strong>
            <span className="text-[10px] text-zinc-600 block mt-0.5">قوة الاتجاه العام</span>
          </div>

          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">ATR (14) - المدى الحقيقي</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{(indicators?.atr14 ?? 0).toFixed(3)} د.ع</strong>
            <span className="text-[10px] text-zinc-600 block mt-0.5">مقياس التذبذب السعري</span>
          </div>

          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-zinc-500 block text-[11px]">موقع قناة بولينجر</span>
            <strong className="text-zinc-900 font-mono font-bold text-sm block">{indicators?.bollingerPosition || '-'}</strong>
            <span className="text-[10px] text-zinc-600 block mt-0.5">العرض: {((indicators?.bollingerUpper ?? 0) - (indicators?.bollingerLower ?? 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 10. المستثمرون غير العراقيين (Non-Iraqi Trading Data) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono">10</span>
            <span className="text-sm text-zinc-900">تداولات المستثمرين غير العراقيين (Non-Iraqi Investors)</span>
          </div>
          <span className="text-xs px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-bold">
            {nonIraqi.accumulationTrend}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">حجم شراء الأجانب</span>
            <span className="text-sm font-mono font-bold text-emerald-800 block">{((nonIraqi?.buyValue ?? 0) / 1000000).toFixed(2)}M د.ع</span>
            <span className="text-[10px] text-zinc-500 font-mono">({(nonIraqi?.buyVolume ?? 0).toLocaleString()} سهم)</span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">حجم بيع الأجانب</span>
            <span className="text-sm font-mono font-bold text-rose-800 block">{((nonIraqi?.sellValue ?? 0) / 1000000).toFixed(2)}M د.ع</span>
            <span className="text-[10px] text-zinc-500 font-mono">({(nonIraqi?.sellVolume ?? 0).toLocaleString()} سهم)</span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">صافي التداول للأجانب</span>
            <span className={`text-sm font-mono font-extrabold block ${(nonIraqi?.netValue ?? 0) >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
              {(nonIraqi?.netValue ?? 0) >= 0 ? '+' : ''}{((nonIraqi?.netValue ?? 0) / 1000000).toFixed(2)}M د.ع
            </span>
            <span className="text-[10px] text-zinc-600">{nonIraqi?.alignmentWithPrice || '-'}</span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 block">مؤشر التأثير النسبي</span>
            <span className="text-sm font-mono font-bold text-amber-700 block">{nonIraqi.influenceScore}/100</span>
            <span className="text-[10px] text-zinc-600">درجة أثر تداول الأجانب بالسعر</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* آخر التحركات الحادة المكتشفة (ZigZag 8% Threshold) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <Activity className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-zinc-900 font-bold">آخر التحركات الحادة المكتشفة (ZigZag 8% Threshold)</span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">تحليل موجات السعر الفردية</span>
        </div>

        {recentMajorMoves.length === 0 ? (
          <p className="text-zinc-500 text-[11px] py-2">لا توجد موجات تغير حاد تتجاوز 8% في تاريخ هذا السهم.</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {recentMajorMoves.slice(0, 8).map((move, idx) => {
              const pct = move.changePct ?? (move as any).pctChange ?? 0;
              const isUp = move.type === 'صعود' || (move as any).direction === 'BULLISH' || pct >= 0;
              const startP = move.startPrice ?? 0;
              const endP = move.endPrice ?? 0;
              const diffIQD = endP - startP;
              const days = move.activeTradingDays ?? 0;

              return (
                <div key={idx} className="p-3 bg-zinc-50 hover:bg-zinc-100/80 transition-colors rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${isUp ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                      {isUp ? 'موجة صاعدة 📈' : 'موجة هابطة 📉'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-700 bg-white px-2.5 py-1 rounded-md border border-zinc-200">
                      <span>من <strong className="text-zinc-900">{startP.toFixed(2)} د.ع</strong></span>
                      <span className="text-zinc-400">←</span>
                      <span>إلى <strong className="text-zinc-900">{endP.toFixed(2)} د.ع</strong></span>
                    </div>

                    <span dir="ltr" className="text-zinc-600 font-mono text-[11px] bg-white px-2 py-1 rounded-md border border-zinc-200">
                      {move.startDate} → {move.endDate}
                    </span>

                    {days > 0 && (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        ⏱️ {days} {days === 1 ? 'جلسة' : days === 2 ? 'جلستان' : days <= 10 ? 'جلسات' : 'جلسة'} تداول
                        {move.calendarDays ? ` (${move.calendarDays} يوم)` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center font-mono">
                    {move.maxPriceInLeg !== undefined && move.minPriceInLeg !== undefined && (
                      <span className="text-[10px] text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200 hidden lg:inline-block">
                        نطاق الموجة: {move.minPriceInLeg.toFixed(2)} - {move.maxPriceInLeg.toFixed(2)} د.ع
                      </span>
                    )}

                    <span className={`text-[11px] font-semibold ${diffIQD >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ({diffIQD >= 0 ? '+' : ''}{diffIQD.toFixed(2)} د.ع)
                    </span>
                    <strong className={`font-bold text-sm px-2.5 py-1 rounded-md ${pct >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TELEGRAM PRICE ALERT MODAL (زر التنبيه) */}
      {/* ========================================================================= */}
      {isAlertModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAlertModal();
          }}
        >
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-sm sm:max-w-md w-[92vw] sm:w-full p-3.5 sm:p-5 shadow-2xl space-y-3.5 text-right font-sans relative dir-rtl max-h-[80vh] overflow-y-auto my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                    تنبيه سعر سهم {company.nameAr} ({company.ticker})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    تحديد سعر مستهدف للحصول على إشعار تلقائي فور وصول السعر إليه
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAlertModal}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Price Banner */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-800 font-bold block">السعر الحالي للسهم بالسوق:</span>
                <span className="text-2xl font-black text-sky-950 font-mono">
                  {company.currentPrice.toFixed(2)} <span className="text-xs text-sky-700">د.ع</span>
                </span>
              </div>
              <div className="text-left font-mono">
                <span className="text-[11px] text-zinc-500 block">التغير اليومي:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${company.change >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {company.change >= 0 ? '+' : ''}{company.change.toFixed(2)} ({company.changePct.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Bot Active Status Indicator */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                <span>البوت متصل ومفعل: <strong className="font-mono text-emerald-950">@ISX_Alerts_Bot</strong></span>
              </div>
              <button
                type="button"
                onClick={handleSendTestTelegramMessage}
                disabled={isSendingTest}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? 'جاري الاختبار...' : 'تجربة الإرسال الآن'}</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}

            {/* Alert Setup Form */}
            <form onSubmit={handleSaveTelegramAlert} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  السعر المستهدف المحدد (أدخل السعر المطلوب بنفسك):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="مثال: 3.13"
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(normalizeEnglishDigits(e.target.value))}
                    required
                    className="flex-1 px-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-base text-zinc-900 font-bold focus:outline-none focus:border-sky-500 text-left dir-ltr"
                  />
                  <span className="px-3.5 py-2.5 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 flex items-center">
                    د.ع
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  تنبيه رقمي مباشر: فور وصول السعر الحالي لهذا الرقم المحدد (أو تجاوزه حسب الشرط) يرسل البوت إشعاراً فورياً.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  شرط إرسال التنبيه:
                </label>
                <select
                  value={alertTypeInput}
                  onChange={(e) => setAlertTypeInput(e.target.value as 'PRICE_BELOW' | 'PRICE_ABOVE')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 font-bold focus:outline-none focus:border-sky-500"
                >
                  <option value="PRICE_BELOW">
                    إذا وصل السعر الحالي إلى الرقم المحدد أو أصبح أقل منه (سعر شراء / دعم)
                  </option>
                  <option value="PRICE_ABOVE">
                    إذا وصل السعر الحالي إلى الرقم المحدد أو أصبح أعلى منه (سعر هدف / مقاومة)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  ملاحظة خاصة للتنبيه (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: الهدف عند الدعم الأول أو الشراء للمحفظة"
                  value={alertNoteInput}
                  onChange={(e) => setAlertNoteInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BellRing className="w-4 h-4 text-amber-300" />
                <span>حفظ التنبيه وتفعيل إشعارات تلغرام</span>
              </button>
            </form>

            {/* List of Existing Alerts for this Ticker */}
            {alerts && alerts.filter((a) => a.ticker === company.ticker).length > 0 && (
              <div className="pt-3 border-t border-zinc-200 space-y-2">
                <span className="text-xs font-bold text-zinc-700 block">التنبيهات المحفوظة لهذا السهم:</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {alerts
                    .filter((a) => a.ticker === company.ticker)
                    .map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-zinc-900">
                            {rule.type === 'PRICE_BELOW' ? 'أدنى من أو يساوي:' : 'أعلى من أو يساوي:'}{' '}
                            <strong className="text-sky-700">{rule.targetValue.toFixed(2)} د.ع</strong>
                          </span>
                          {rule.note && <p className="text-[10px] text-zinc-500 mt-0.5">{rule.note}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAlertRule(rule.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {rule.isActive ? 'مفعل' : 'معطل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAlertRule(rule.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
