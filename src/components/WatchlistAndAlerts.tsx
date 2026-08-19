import React, { useState } from 'react';
import { Bell, Trash2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { AlertRule, ISXCompany, PortfolioItem } from '../types/isx';
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

export const WatchlistAndAlerts: React.FC<WatchlistAndAlertsProps> = ({
  companies,
  alerts,
  onUpdateAlerts,
}) => {
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
