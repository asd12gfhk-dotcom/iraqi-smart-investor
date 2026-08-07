import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, Bell, Wallet, FolderPlus, Check, ChevronLeft, Zap, ShieldAlert, Sparkles, Send, CheckCircle2, XCircle } from 'lucide-react';
import { AlertRule, ISXCompany, PortfolioItem } from '../types/isx';
import { generateTechnicalAlerts, TriggeredTechnicalAlert } from '../utils/alertsEngine';
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  TelegramConfig
} from '../utils/telegramService';
import { normalizeEnglishDigits } from '../utils/numberUtils';

interface WatchlistAndAlertsProps {
  companies: ISXCompany[];
  watchlistTickers: string[];
  onUpdateWatchlist: (tickers: string[]) => void;
  portfolio: PortfolioItem[];
  onUpdatePortfolio: (items: PortfolioItem[]) => void;
  alerts: AlertRule[];
  onUpdateAlerts: (alerts: AlertRule[]) => void;
  onSelectStock: (ticker: string) => void;
}

interface CustomWatchlistGroup {
  id: string;
  name: string;
  tickers: string[];
}

export const WatchlistAndAlerts: React.FC<WatchlistAndAlertsProps> = ({
  companies,
  watchlistTickers,
  onUpdateWatchlist,
  portfolio,
  onUpdatePortfolio,
  alerts,
  onUpdateAlerts,
  onSelectStock
}) => {
  // Multiple Watchlists state
  const [watchlists, setWatchlists] = useState<CustomWatchlistGroup[]>([
    { id: 'fav', name: 'الأسهم المفضلة (الرئيسية)', tickers: watchlistTickers },
    { id: 'speculation', name: 'أسهم المضاربة', tickers: ['BBOB', 'IBRF', 'VKHF'] },
    { id: 'investment', name: 'أسهم الاستثمار طويل المدى', tickers: ['TROW', 'BNOI', 'IIDP'] },
    { id: 'banks', name: 'قطاع البنوك', tickers: ['BBOB', 'IBRF', 'BNOI', 'BMNS'] },
    { id: 'industry', name: 'قطاع الصناعة', tickers: ['IIDP', 'AISI', 'IMIB'] }
  ]);

  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('fav');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [addTickerInput, setAddTickerInput] = useState<string>('BBOB');

  // Portfolio Form State
  const [newPortTicker, setNewPortTicker] = useState('BBOB');
  const [newPortShares, setNewPortShares] = useState(10000);
  const [newPortBuyPrice, setNewPortBuyPrice] = useState(4.20);
  const [newPortNotes, setNewPortNotes] = useState('');

  // Alert Form State
  const [newAlertTicker, setNewAlertTicker] = useState('BBOB');
  const [newAlertType, setNewAlertType] = useState<AlertRule['type']>('PRICE_BELOW');
  const [newAlertValue, setNewAlertValue] = useState<string>('');

  // Telegram Bot State
  const [tgConfig, setTgConfig] = useState<TelegramConfig>(getTelegramConfig());
  const [tgTestStatus, setTgTestStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTestingTg, setIsTestingTg] = useState(false);

  const handleTestTelegramInWatchlist = async () => {
    setIsTestingTg(true);
    setTgTestStatus(null);
    const res = await testTelegramConnection(tgConfig.botToken, tgConfig.chatId);
    setIsTestingTg(false);
    if (res.success) {
      setTgTestStatus({
        success: true,
        msg: 'تم إرسال رسالة اختبار بنجاح عبر Telegram Bot API! تحقق من تطبيق تلغرام الآن 📲'
      });
    } else {
      setTgTestStatus({
        success: false,
        msg: `فشل الإرسال: ${res.error || 'تعذر الاتصال بـ Telegram Bot'}`
      });
    }
  };

  const handleSaveTgSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelegramConfig(tgConfig);
    setTgTestStatus({
      success: true,
      msg: 'تم حفظ بيانات واجهة Telegram Bot API بنجاح!'
    });
  };

  const activeGroup = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];
  const activeCompanies = companies.filter((c) => activeGroup.tickers.includes(c.ticker));

  // Generate real-time deterministic technical alerts
  const triggeredTechAlerts = generateTechnicalAlerts(companies);

  // Add new watchlist category group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup: CustomWatchlistGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      tickers: []
    };
    setWatchlists([...watchlists, newGroup]);
    setActiveWatchlistId(newGroup.id);
    setNewGroupName('');
  };

  // Add stock to active group
  const handleAddStockToActiveGroup = () => {
    if (activeGroup.tickers.includes(addTickerInput)) return;
    const updated = watchlists.map((w) => {
      if (w.id === activeWatchlistId) {
        return { ...w, tickers: [...w.tickers, addTickerInput] };
      }
      return w;
    });
    setWatchlists(updated);
    if (activeWatchlistId === 'fav') {
      onUpdateWatchlist([...watchlistTickers, addTickerInput]);
    }
  };

  // Remove stock from active group
  const handleRemoveStockFromActiveGroup = (ticker: string) => {
    const updated = watchlists.map((w) => {
      if (w.id === activeWatchlistId) {
        return { ...w, tickers: w.tickers.filter((t) => t !== ticker) };
      }
      return w;
    });
    setWatchlists(updated);
    if (activeWatchlistId === 'fav') {
      onUpdateWatchlist(watchlistTickers.filter((t) => t !== ticker));
    }
  };

  // Add Portfolio Item
  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      ticker: newPortTicker,
      shares: Number(newPortShares),
      avgBuyPrice: Number(newPortBuyPrice),
      notes: newPortNotes
    };
    onUpdatePortfolio([...portfolio, newItem]);
    setNewPortNotes('');
  };

  const handleRemovePortfolio = (id: string) => {
    onUpdatePortfolio(portfolio.filter((p) => p.id !== id));
  };

  // Portfolio Aggregates
  let totalInvestedValue = 0;
  let totalCurrentValue = 0;
  let weightedScoreSum = 0;

  const portfolioEnriched = portfolio.map((item) => {
    const comp = companies.find((c) => c.ticker === item.ticker);
    const currentPrice = comp ? comp.currentPrice : item.avgBuyPrice;
    const invested = item.shares * item.avgBuyPrice;
    const currentVal = item.shares * currentPrice;
    const gainLoss = currentVal - invested;
    const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0;
    const score = comp ? comp.evaluation.compositeScore : 50;

    totalInvestedValue += invested;
    totalCurrentValue += currentVal;
    weightedScoreSum += score * currentVal;

    return {
      ...item,
      company: comp,
      currentPrice,
      invested,
      currentVal,
      gainLoss,
      gainLossPct,
      score
    };
  });

  const totalGainLoss = totalCurrentValue - totalInvestedValue;
  const totalGainLossPct = totalInvestedValue > 0 ? (totalGainLoss / totalInvestedValue) * 100 : 0;
  const portfolioWeightedScore =
    totalCurrentValue > 0 ? Math.round(weightedScoreSum / totalCurrentValue) : 0;

  // Add Alert Rule
  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = normalizeEnglishDigits(newAlertValue);
    const targetVal = parseFloat(cleanStr);
    if (isNaN(targetVal) || targetVal <= 0) return;

    const newAlert: AlertRule = {
      id: Date.now().toString(),
      ticker: newAlertTicker,
      type: newAlertType,
      targetValue: targetVal,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    onUpdateAlerts([...alerts, newAlert]);
  };

  const handleRemoveAlert = (id: string) => {
    onUpdateAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Tracker Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" /> متابعة أداء المحفظة الاستثمارية وتقييم القوة الفنية
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              حساب القيمة الإجمالية للمحفظة، الأرباح/الخسائر، والدرجة الفنية المركبة الموزونة.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center min-w-[120px]">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">قوة المحفظة الفنية</span>
              <span className="text-lg font-black font-mono text-amber-700">{portfolioWeightedScore}/100</span>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center min-w-[150px]">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">ربح / خسارة المحفظة</span>
              <span
                className={`text-base font-black font-mono ${
                  totalGainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {totalGainLoss >= 0 ? '+' : ''}{(totalGainLoss / 1000).toFixed(1)}K د.ع ({totalGainLossPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Add Portfolio Form */}
        <form onSubmit={handleAddPortfolio} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
          <div>
            <label className="text-zinc-600 font-medium block mb-1">الشركة</label>
            <select
              value={newPortTicker}
              onChange={(e) => setNewPortTicker(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-800 font-bold focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.ticker} - {c.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-zinc-600 font-medium block mb-1">عدد الأسهم</label>
            <input
              type="number"
              value={newPortShares}
              onChange={(e) => setNewPortShares(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-zinc-600 font-medium block mb-1">سعر الشراء (د.ع)</label>
            <input
              type="number"
              step="0.01"
              value={newPortBuyPrice}
              onChange={(e) => setNewPortBuyPrice(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-zinc-600 font-medium block mb-1">ملاحظات/استراتيجية</label>
            <input
              type="text"
              placeholder="مثال: هدف 4.80 د.ع"
              value={newPortNotes}
              onChange={(e) => setNewPortNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              إضافة صفقة محفظة
            </button>
          </div>
        </form>

        {/* Portfolio Items Table */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">الرمز</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">الاسم</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">العدد</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">سعر الشراء</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">السعر الحالي</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">القيمة الحالية</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">الربح / الخسارة</th>
                <th className="py-2.5 px-3 bg-zinc-100 sticky top-0 z-20">التقييم المركب</th>
                <th className="py-2.5 px-3 text-center bg-zinc-100 sticky top-0 z-20">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {portfolioEnriched.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className="py-3 px-3 font-extrabold text-amber-700 font-mono">{item.ticker}</td>
                  <td className="py-3 px-3 font-bold text-zinc-900">{item.company?.nameAr}</td>
                  <td className="py-3 px-3 font-mono">{item.shares.toLocaleString()}</td>
                  <td className="py-3 px-3 font-mono">{(item.avgBuyPrice ?? 0).toFixed(2)} د.ع</td>
                  <td className="py-3 px-3 font-mono font-bold text-zinc-900">{(item.currentPrice ?? 0).toFixed(2)} د.ع</td>
                  <td className="py-3 px-3 font-mono font-bold">{(item.currentVal ?? 0).toLocaleString()} د.ع</td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={(item.gainLoss ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {(item.gainLoss ?? 0) >= 0 ? '+' : ''}{(item.gainLoss ?? 0).toFixed(0)} د.ع ({(item.gainLossPct ?? 0).toFixed(2)}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-700">{item.score}/100</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleRemovePortfolio(item.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MULTI-WATCHLIST MANAGEMENT SECTION */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-600" /> قوائم المراقبة المتعددة والأسهم المفضلة (Multiple Watchlists)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              أنشئ قوائم مراقبة مخصصة (المضاربة، الاستثمار، البنوك، الصناعة) مع تحديث فوري بالأسعار والدرجات الفنية.
            </p>
          </div>

          {/* Create New Group Form */}
          <form onSubmit={handleCreateGroup} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="اسم قائمة جديدة..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" /> إنشاء قائمة
            </button>
          </form>
        </div>

        {/* Watchlist Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {watchlists.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWatchlistId(w.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeWatchlistId === w.id
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
              }`}
            >
              <span>{w.name}</span>
              <span className="px-1.5 py-0.2 bg-white/60 rounded text-[10px] font-mono font-bold">
                {w.tickers.length}
              </span>
            </button>
          ))}
        </div>

        {/* Add stock to current active group bar */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-700">إضافة سهم لـ ({activeGroup.name}):</span>
            <select
              value={addTickerInput}
              onChange={(e) => setAddTickerInput(e.target.value)}
              className="px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-bold focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.ticker} - {c.nameAr}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddStockToActiveGroup}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
            >
              إضافة السهم
            </button>
          </div>
          <span className="text-zinc-500 text-[11px]">
            تاريخ التحديث الحالي: <strong className="font-mono text-zinc-800">{new Date().toLocaleTimeString()}</strong>
          </span>
        </div>

        {/* Active Group Companies Table */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">الرمز / اسم الشركة</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">القطاع</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">السعر الحقيقي</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">التغير اليومي %</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">Composite Score</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">الاتجاه الحسابي</th>
                <th className="py-2.5 px-4 bg-zinc-100 sticky top-0 z-20">آخر تحديث</th>
                <th className="py-2.5 px-4 text-center bg-zinc-100 sticky top-0 z-20">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {activeCompanies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500">
                    هذه القائمة فارغة حالياً. أضف أسهم إليها للبدء في المتابعة.
                  </td>
                </tr>
              ) : (
                activeCompanies.map((c) => (
                  <tr key={c.ticker} className="hover:bg-zinc-50 cursor-pointer" onClick={() => onSelectStock(c.ticker)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-700 font-mono text-sm">{c.ticker}</span>
                        <span className="font-bold text-zinc-900">{c.nameAr}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{c.sector}</td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{(c.currentPrice ?? 0).toFixed(2)} د.ع</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={(c.changePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {(c.changePct ?? 0) >= 0 ? '+' : ''}{(c.changePct ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-700">{c.evaluation.compositeScore}/100</td>
                    <td className="py-3 px-4 font-semibold text-zinc-800">{c.evaluation.trendAnalysis?.mediumTerm?.level || c.indicators.trendDirection}</td>
                    <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{new Date().toLocaleTimeString()}</td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRemoveStockFromActiveGroup(c.ticker)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUTOMATIC TECHNICAL ALERTS FEED (التنبيهات الفنية التلقائية - 12 قاعدة حتمية) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" /> التنبيهات الفنية التلقائية المشتقة آلياً (12 قاعدة حتمية)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              تنبيهات فورية ناتجة عن التغيرات بين الجلسة السابقة والحالية (اختراق المقاومات/الدعوم، تقاطع MACD/SMA، RSI، ارتفاع السيولة، وتجميع غير العراقيين).
            </p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full border border-amber-200">
            {triggeredTechAlerts.length} تنبيه ملتقط
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {triggeredTechAlerts.map((alt) => (
            <div
              key={alt.id}
              onClick={() => onSelectStock(alt.ticker)}
              className="p-3.5 bg-zinc-50 hover:bg-amber-50/50 border border-zinc-200 rounded-xl cursor-pointer transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-700 font-mono text-sm">{alt.ticker}</span>
                  <span className="font-bold text-zinc-900">{alt.companyName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      alt.importance === 'مرتفع'
                        ? 'bg-rose-600 text-white'
                        : alt.importance === 'متوسط'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    أهمية {alt.importance}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{alt.timestamp}</span>
                </div>
              </div>

              <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                <Bell className="w-3.5 h-3.5 text-amber-600" /> {alt.alertType}
              </div>

              <p className="text-[11px] text-zinc-700 leading-relaxed bg-white p-2 rounded border border-zinc-200/80">
                {alt.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* TELEGRAM BOT INTEGRATION SETTINGS & TESTING CARD */}
      <div className="bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg space-y-4 border border-sky-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
              <Send className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2 text-white">
                ربط إشعارات التلغرام (Telegram Bot API)
              </h3>
              <p className="text-xs text-sky-200">
                إرسال تنبيهات فورية إلى حسابك/قناتك في تلغرام عند وصول السعر إلى الرقم المستهدف
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-300">متصل وجاهز</span>
          </div>
        </div>

        <form onSubmit={handleSaveTgSettings} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-sky-200 font-bold block mb-1">Bot Token:</label>
            <input
              type="text"
              value={tgConfig.botToken}
              onChange={(e) => setTgConfig({ ...tgConfig, botToken: e.target.value })}
              required
              className="w-full px-3 py-2 bg-sky-950/80 border border-sky-600/60 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sky-200 font-bold block mb-1">Chat ID / Channel ID:</label>
            <input
              type="text"
              value={tgConfig.chatId}
              onChange={(e) => setTgConfig({ ...tgConfig, chatId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-sky-950/80 border border-sky-600/60 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm text-xs"
            >
              حفظ الإعدادات
            </button>
            <button
              type="button"
              onClick={handleTestTelegramInWatchlist}
              disabled={isTestingTg}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-colors cursor-pointer shadow-md text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTestingTg ? 'جاري الاختبار...' : 'اختبار إرسال رسالة تجريبية 📲'}</span>
            </button>
          </div>
        </form>

        {tgTestStatus && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              tgTestStatus.success
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500'
                : 'bg-rose-950/90 text-rose-200 border-rose-500'
            }`}
          >
            {tgTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{tgTestStatus.msg}</span>
          </div>
        )}
      </div>

      {/* MANUAL USER ALERTS FORM (تنبيهات الأسعار والمؤشرات الخاصة) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" /> إنشاء تنبيهات مخصصة من المستخدم (Custom User Rules)
          </h3>
          <span className="text-xs text-zinc-500">{alerts.length} تنبيه يدوِي</span>
        </div>

        {/* Add Alert Form */}
        <form onSubmit={handleAddAlert} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
          <select
            value={newAlertTicker}
            onChange={(e) => setNewAlertTicker(e.target.value)}
            className="px-2 py-1.5 bg-white border border-zinc-300 rounded text-zinc-800 font-bold focus:outline-none focus:border-amber-500"
          >
            {companies.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.ticker} - {c.nameAr}
              </option>
            ))}
          </select>

          <select
            value={newAlertType}
            onChange={(e) => setNewAlertType(e.target.value as AlertRule['type'])}
            className="px-2 py-1.5 bg-white border border-zinc-300 rounded text-zinc-800 focus:outline-none focus:border-amber-500"
          >
            <option value="PRICE_ABOVE">السعر يرتفع فوق</option>
            <option value="PRICE_BELOW">السعر ينخفض أسفل</option>
            <option value="RSI_ABOVE">RSI يرتفع فوق</option>
            <option value="RSI_BELOW">RSI ينخفض أسفل</option>
          </select>

          <input
            type="text"
            inputMode="decimal"
            placeholder="مثال: 3.13"
            value={newAlertValue}
            onChange={(e) => setNewAlertValue(normalizeEnglishDigits(e.target.value))}
            className="px-2 py-1.5 bg-white border border-zinc-300 rounded text-zinc-800 font-mono font-bold focus:outline-none focus:border-amber-500 dir-ltr text-right"
          />

          <button
            type="submit"
            className="py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded cursor-pointer transition-colors shadow-xs"
          >
            إضافة تنبيه جديد
          </button>
        </form>

        {/* Active Custom Alerts List */}
        <div className="space-y-2">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-700 font-mono">{alt.ticker}</span>
                <span className="text-zinc-700">
                  {alt.type === 'PRICE_ABOVE'
                    ? 'ارتفاع السعر فوق'
                    : alt.type === 'PRICE_BELOW'
                    ? 'انخفاض السعر أسفل'
                    : alt.type === 'RSI_ABOVE'
                    ? 'ارتفاع RSI فوق'
                    : 'انخفاض RSI أسفل'}
                </span>
                <span className="font-mono font-bold text-zinc-900">{alt.targetValue}</span>
              </div>

              <button
                onClick={() => handleRemoveAlert(alt.id)}
                className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
