import React, { useState } from 'react';
import { 
  BarChart3, 
  Building2,
  TrendingUp, 
  Filter, 
  ArrowRightLeft, 
  Sparkles, 
  Calendar, 
  Bookmark, 
  FileText, 
  Calculator, 
  Database,
  RefreshCw,
  WifiOff,
  Layers,
  AlertTriangle,
  Settings,
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  X,
  BellRing,
  Trash2
} from 'lucide-react';
import { ISXCompany, AlertRule } from '../types/isx';
import {
  getTelegramConfig,
  sendStockPriceAlertNotification,
  testTelegramConnection
} from '../utils/telegramService';
import { normalizeEnglishDigits } from '../utils/numberUtils';

interface NavbarProps {
  companies: ISXCompany[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onManualUpdate: () => void;
  lastUpdatedTime: string;
  isRefreshing?: boolean;
  selectedTicker?: string;
  onSelectTicker?: (ticker: string) => void;
  alerts?: AlertRule[];
  onUpdateAlerts?: (alerts: AlertRule[]) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  companies,
  activeTab,
  setActiveTab,
  onManualUpdate,
  lastUpdatedTime,
  isRefreshing = false,
  selectedTicker = 'BBOB',
  onSelectTicker,
  alerts = [],
  onUpdateAlerts
}) => {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [modalTicker, setModalTicker] = useState(selectedTicker);
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [alertTypeInput, setAlertTypeInput] = useState<'PRICE_BELOW' | 'PRICE_ABOVE'>('PRICE_BELOW');
  const [alertNoteInput, setAlertNoteInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const currentCompany = companies.find((c) => c.ticker === modalTicker) || companies[0];

  // Update target price when modal opens or ticker changes
  const handleOpenAlertModal = () => {
    const comp = companies.find((c) => c.ticker === selectedTicker) || companies[0];
    setModalTicker(comp ? comp.ticker : 'BBOB');
    setTargetPriceInput('');
    setTestResult(null);
    setIsAlertModalOpen(true);
    // Push history state so back button closes modal
    window.history.pushState({ modalOpen: 'headerAlertModal', tab: activeTab }, '');
  };

  const handleCloseAlertModal = () => {
    setIsAlertModalOpen(false);
    if (window.history.state && window.history.state.modalOpen) {
      window.history.back();
    }
  };

  // Listen to browser back button to close modal automatically
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

  const handleTickerSelectChange = (ticker: string) => {
    setModalTicker(ticker);
    setTargetPriceInput('');
  };

  const handleSaveHeaderAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = normalizeEnglishDigits(targetPriceInput);
    const targetVal = parseFloat(cleanStr);

    if (isNaN(targetVal) || targetVal <= 0 || !currentCompany) return;

    const newRule: AlertRule = {
      id: Date.now().toString(),
      ticker: currentCompany.ticker,
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

    const isConditionMet =
      alertTypeInput === 'PRICE_BELOW'
        ? currentCompany.currentPrice <= targetVal
        : currentCompany.currentPrice >= targetVal;

    if (isConditionMet) {
      setTestResult({
        success: true,
        msg: `تم حفظ التنبيه! السعر الحالي (${currentCompany.currentPrice.toFixed(2)} د.ع) مطبق للشرط الآن، جاري إرسال إشعار تلغرام الفوري...`
      });
      await sendStockPriceAlertNotification(
        currentCompany.nameAr,
        currentCompany.ticker,
        currentCompany.currentPrice,
        targetVal,
        alertTypeInput,
        alertNoteInput
      );
    } else {
      setTestResult({
        success: true,
        msg: `تم حفظ تنبيه السعر لسهم ${currentCompany.nameAr} (${currentCompany.ticker}) بنجاح! سيتم إرسال رسالة تلغرام تلقائياً فور وصول السعر إلى ${targetVal.toFixed(2)} د.ع.`
      });
    }

    setAlertNoteInput('');
  };

  const handleDeleteAlert = (id: string) => {
    if (!onUpdateAlerts) return;
    onUpdateAlerts(alerts.filter((a) => a.id !== id));
  };

  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    const res = await testTelegramConnection();
    setIsSendingTest(false);
    if (res.success) {
      setTestResult({
        success: true,
        msg: 'تم إرسال رسالة اختبار بنجاح عبر Telegram Bot إلى قناتك/حسابك! تحقق من تطبيق تلغرام الآن 📲'
      });
    } else {
      setTestResult({
        success: false,
        msg: `فشل الإرسال: ${res.error || 'تعذر الاتصال بـ Telegram Bot API'}`
      });
    }
  };

  const navItems = [
    { id: 'overview', label: 'مراقبة السوق', icon: BarChart3 },
    { id: 'all_companies', label: 'جدول جميع الشركات (106)', icon: Building2 },
    { id: 'analysis', label: 'التحليل الفني', icon: TrendingUp },
    { id: 'screener', label: 'ماسح الأسهم', icon: Filter },
    { id: 'comparison', label: 'المقارنة الفنية', icon: ArrowRightLeft },
    { id: 'opportunities', label: 'أفضل الفرص', icon: Sparkles },
    { id: 'sectors', label: 'تحليل القطاعات', icon: Layers },
    { id: 'weakening', label: 'الأسهم الضعيفة', icon: AlertTriangle },
    { id: 'calendar', label: 'التقويم الموسمي', icon: Calendar },
    { id: 'watchlist', label: 'المتابعة والمحفظة', icon: Bookmark },
    { id: 'reports', label: 'التقارير الرقمية', icon: FileText },
    { id: 'calculator', label: 'حاسبة الأرباح', icon: Calculator },
    { id: 'data', label: 'إدارة البيانات', icon: Database },
    { id: 'settings', label: 'الإعدادات العامة', icon: Settings }
  ];

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shadow-md font-black text-xl">
              ISX
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 tracking-wide">
                منصة المستثمر الذكي العراقي
              </h1>
            </div>
          </div>

          {/* Controls for Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handleOpenAlertModal}
              className="p-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              title="تحديد سعر مستهدف للتنبيه عبر تلغرام"
            >
              <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
            </button>
            <button
              onClick={onManualUpdate}
              disabled={isRefreshing}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-amber-700 rounded-lg border border-zinc-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Top Header Buttons: Alert Button + Offline Status & Refresh */}
        <div className="hidden md:flex items-center gap-3">
          {/* Top Header Alert Button (زر التنبيه الهيدر) */}
          <button
            onClick={handleOpenAlertModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all border border-sky-400/40 cursor-pointer active:scale-95"
            title="تحديد سعر مستهدف وحفظه لتلقي تنبيهات تلغرام التلقائية"
          >
            <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>زر التنبيه (تحديد سعر مستهدف)</span>
            <Send className="w-3.5 h-3.5 text-sky-200 dir-rtl" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs text-zinc-700">
            <WifiOff className="w-3.5 h-3.5 text-emerald-600" />
            <span>تخزين محلي</span>
          </div>

          <button
            onClick={onManualUpdate}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            title={`آخر تحديث: ${new Date(lastUpdatedTime).toLocaleTimeString('ar-IQ')}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border-t border-zinc-200 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HEADER TELEGRAM PRICE ALERT MODAL (نافذة التنبيه في الهدر العلوي) */}
      {isAlertModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAlertModal();
          }}
        >
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-sm sm:max-w-md w-[92vw] sm:w-full p-3.5 sm:p-5 shadow-2xl space-y-3.5 text-right font-sans relative dir-rtl max-h-[80vh] overflow-y-auto my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Bell className="w-4 h-4 animate-pulse text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                    تنبيه السعر المستهدف (Telegram)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    أدخل الرقم المحدد للسعر لإرسال إشعار فوري عند الوصول
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

            {/* Select Stock Dropdown */}
            <div>
              <label className="text-xs font-bold text-zinc-800 block mb-1">
                اختر السهم المطلوبة متابعته:
              </label>
              <select
                value={modalTicker}
                onChange={(e) => handleTickerSelectChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 font-bold focus:outline-none focus:border-sky-500"
              >
                {companies.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.nameAr} ({c.ticker}) - السعر الحالي: {c.currentPrice.toFixed(2)} د.ع
                  </option>
                ))}
              </select>
            </div>

            {/* Current Price Banner */}
            {currentCompany && (
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-800 font-bold block">السعر الحالي لسهم {currentCompany.nameAr}:</span>
                  <span className="text-2xl font-black text-sky-950 font-mono">
                    {currentCompany.currentPrice.toFixed(2)} <span className="text-xs text-sky-700">د.ع</span>
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[11px] text-zinc-500 block">التغير اليومي:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentCompany.change >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {currentCompany.change >= 0 ? '+' : ''}{currentCompany.change.toFixed(2)} ({currentCompany.changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {/* Bot Connection Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                <span>البوت متصل: <strong className="font-mono text-emerald-950">Telegram Bot API</strong></span>
              </div>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isSendingTest}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? 'جاري الإرسال...' : 'اختبار الاتصال'}</span>
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

            {/* Alert Setup Form - DIRECT SPECIFIC TARGET PRICE NUMBER */}
            <form onSubmit={handleSaveHeaderAlert} className="space-y-4">
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
                  سيتم الفحص يومياً من المصدر، وفور وصول السعر الحالي لهذا الرقم المحدد سيتم إرسال التنبيه تلقائياً عبر تلغرام.
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
                    إذا وصل السعر الحالي إلى الرقم المحدد أو أصبح أقل منه (شراء / دعم)
                  </option>
                  <option value="PRICE_ABOVE">
                    إذا وصل السعر الحالي إلى الرقم المحدد أو أصبح أعلى منه (هدف / مقاومة)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  ملاحظة خاصة (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: الشراء عند نقطة الدعم أو متابعة كسر المقاومة"
                  value={alertNoteInput}
                  onChange={(e) => setAlertNoteInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BellRing className="w-4 h-4 text-amber-300" />
                <span>حفظ التنبيه وإرسال التنبيه الفوري لتلغرام</span>
              </button>
            </form>

            {/* List of Existing Alerts for Modal Ticker */}
            {alerts && alerts.filter((a) => a.ticker === modalTicker).length > 0 && (
              <div className="pt-3 border-t border-zinc-200 space-y-2">
                <span className="text-xs font-bold text-zinc-700 block">التنبيهات المحفوظة للسهم الحالي ({modalTicker}):</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {alerts
                    .filter((a) => a.ticker === modalTicker)
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
                        <button
                          type="button"
                          onClick={() => handleDeleteAlert(rule.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          title="حذف التنبيه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </header>
  );
};

