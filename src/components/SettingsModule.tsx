import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Bell,
  Palette,
  Download,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
  HardDrive,
  Info,
  Layers,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { ISXCompany } from '../types/isx';
import {
  IndicatorSettings,
  AlertsGlobalSettings,
  AppGeneralPreferences
} from '../types/settings';
import {
  getIndicatorSettings,
  saveIndicatorSettings,
  resetIndicatorSettingsToDefaults,
  getAlertsGlobalSettings,
  saveAlertsGlobalSettings,
  getAppPreferences,
  saveAppPreferences,
  exportSystemBackupToFile,
  restoreSystemBackupFromJSON
} from '../utils/configEngine';
import { computeTechnicalIndicators } from '../utils/technicalEngine';
import { evaluateStock } from '../utils/evaluatorEngine';

interface SettingsModuleProps {
  companies: ISXCompany[];
  onUpdateCompanies: (updated: ISXCompany[]) => void;
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  companies,
  onUpdateCompanies,
  onThemeChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'indicators' | 'alerts' | 'appearance' | 'backup'>('indicators');

  // Local state for indicators settings
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(getIndicatorSettings());
  // Local state for alerts global settings
  const [alertsSettings, setAlertsSettings] = useState<AlertsGlobalSettings>(getAlertsGlobalSettings());
  // Local state for app general preferences
  const [appPrefs, setAppPrefs] = useState<AppGeneralPreferences>(getAppPreferences());

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync preference changes
  const handleSaveIndicators = () => {
    saveIndicatorSettings(indicatorSettings);

    // Recalculate indicators for all stored companies with new parameters
    const updated = companies.map((comp) => {
      if (!comp.history || comp.history.length === 0) return comp;
      try {
        const newIndicators = computeTechnicalIndicators(comp.history, indicatorSettings);
        const newEval = evaluateStock(comp.currentPrice, newIndicators, comp.nonIraqiTrading, comp.history);
        return {
          ...comp,
          indicators: newIndicators,
          evaluation: newEval
        };
      } catch {
        return comp;
      }
    });

    onUpdateCompanies(updated);
    setStatusMessage('تم حفظ إعدادات المؤشرات وإعادة حساب كافة الشركات وفق المعايير الجديدة بنجاح!');
  };

  const handleResetIndicators = () => {
    if (window.confirm('هل أنت أعدت التأكيد لإعادة إعدادات المؤشرات الفنية إلى القيم الافتراضية؟')) {
      const resetSet = resetIndicatorSettingsToDefaults();
      setIndicatorSettings(resetSet);

      const updated = companies.map((comp) => {
        if (!comp.history || comp.history.length === 0) return comp;
        try {
          const newIndicators = computeTechnicalIndicators(comp.history, resetSet);
          const newEval = evaluateStock(comp.currentPrice, newIndicators, comp.nonIraqiTrading, comp.history);
          return {
            ...comp,
            indicators: newIndicators,
            evaluation: newEval
          };
        } catch {
          return comp;
        }
      });

      onUpdateCompanies(updated);
      setStatusMessage('تمت إعادة إعدادات المؤشرات الفنية إلى القيم الافتراضية بنجاح.');
    }
  };

  const handleAlertsToggle = (key: keyof AlertsGlobalSettings) => {
    const updated = { ...alertsSettings, [key]: !alertsSettings[key] };
    setAlertsSettings(updated);
    saveAlertsGlobalSettings(updated);
    setStatusMessage('تم تحديث خيارات التنبيهات العامة.');
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    const updated = { ...appPrefs, theme: newTheme };
    setAppPrefs(updated);
    saveAppPreferences(updated);
    if (onThemeChange) onThemeChange(newTheme);
    setStatusMessage(`تم تغيير المظهر إلى (${newTheme === 'dark' ? 'الوضع الليلي' : newTheme === 'light' ? 'الوضع الفاتح' : 'تلقائي'}).`);
  };

  const handleFontSizeChange = (size: 'normal' | 'medium' | 'large') => {
    const updated = { ...appPrefs, fontSize: size };
    setAppPrefs(updated);
    saveAppPreferences(updated);
    setStatusMessage('تم حفظ قياس الخط المطلوب.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = restoreSystemBackupFromJSON(text);
      if (res.success) {
        setIndicatorSettings(getIndicatorSettings());
        setAlertsSettings(getAlertsGlobalSettings());
        setAppPrefs(getAppPreferences());
        setStatusMessage(res.message);
      } else {
        setStatusMessage(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" /> المحور السادس: النظام العام والإعدادات (Core V2 Architecture)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            إدارة إعدادات المؤشرات الفنية، تنبيهات النظام، تخصيص المظهر والواجهة، والنسخ الاحتياطي وفق معايير الوثيقة السادسة.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
          <Layers className="w-4 h-4 text-amber-600" />
          <span>استقلالية المحركات 100%</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-medium">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> {statusMessage}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-zinc-900 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveSubTab('indicators')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'indicators'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات المؤشرات الفنية</span>
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'alerts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>إعدادات التنبيهات</span>
        </button>

        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'appearance'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>المظهر والواجهة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'backup'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>النسخ الاحتياطي والاستعادة</span>
        </button>
      </div>

      {/* TAB 1: Indicators Settings */}
      {activeSubTab === 'indicators' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" /> ضبط معاملات المؤشرات الفنية (Technical Indicators Parameters)
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                تعديل فترات الحساب لمؤشرات RSI, MACD, Moving Averages, ATR, Bollinger Bands, ADX.
              </p>
            </div>

            <button
              onClick={handleResetIndicators}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-300 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-600" />
              <span>إعادة الإعدادات الافتراضية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* RSI */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">مؤشر القوة النسبية RSI Period</label>
              <input
                type="number"
                min={2}
                max={50}
                value={indicatorSettings.rsiPeriod}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, rsiPeriod: Number(e.target.value) || 14 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الفترة الافتراضية الموصى بها: 14 جلسة</span>
            </div>

            {/* MACD Fast */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">MACD Fast Period (المتوسط السريع)</label>
              <input
                type="number"
                min={2}
                max={50}
                value={indicatorSettings.macdFast}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, macdFast: Number(e.target.value) || 12 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 12</span>
            </div>

            {/* MACD Slow */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">MACD Slow Period (المتوسط البطيء)</label>
              <input
                type="number"
                min={5}
                max={100}
                value={indicatorSettings.macdSlow}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, macdSlow: Number(e.target.value) || 26 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 26</span>
            </div>

            {/* MACD Signal */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">MACD Signal Period (خط الإشارة)</label>
              <input
                type="number"
                min={2}
                max={30}
                value={indicatorSettings.macdSignal}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, macdSignal: Number(e.target.value) || 9 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 9</span>
            </div>

            {/* EMA Short */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">EMA Short Period (المتوسط الأسّي القصير)</label>
              <input
                type="number"
                min={5}
                max={100}
                value={indicatorSettings.emaShort}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, emaShort: Number(e.target.value) || 20 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 20</span>
            </div>

            {/* EMA Long */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">EMA Long Period (المتوسط الأسّي الطويل)</label>
              <input
                type="number"
                min={10}
                max={200}
                value={indicatorSettings.emaLong}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, emaLong: Number(e.target.value) || 50 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 50</span>
            </div>

            {/* SMA Short */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">SMA Short Period (المتوسط البسيط المتوسط)</label>
              <input
                type="number"
                min={10}
                max={100}
                value={indicatorSettings.smaShort}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, smaShort: Number(e.target.value) || 50 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 50</span>
            </div>

            {/* SMA Long */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">SMA Long Period (المتوسط البسيط الرئيسي)</label>
              <input
                type="number"
                min={50}
                max={300}
                value={indicatorSettings.smaLong}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, smaLong: Number(e.target.value) || 200 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 200</span>
            </div>

            {/* ATR Period */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">ATR Period (مؤشر مدى التذبذب)</label>
              <input
                type="number"
                min={2}
                max={50}
                value={indicatorSettings.atrPeriod}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, atrPeriod: Number(e.target.value) || 14 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 14</span>
            </div>

            {/* ADX Period */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">ADX Period (قوة الاتجاه العام)</label>
              <input
                type="number"
                min={2}
                max={50}
                value={indicatorSettings.adxPeriod}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, adxPeriod: Number(e.target.value) || 14 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 14</span>
            </div>

            {/* Bollinger Bands Period */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">Bollinger Bands Period</label>
              <input
                type="number"
                min={5}
                max={50}
                value={indicatorSettings.bbPeriod}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, bbPeriod: Number(e.target.value) || 20 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 20</span>
            </div>

            {/* Bollinger Bands StdDev */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-zinc-900 block">Bollinger Bands StdDev (الانحراف)</label>
              <input
                type="number"
                step="0.1"
                min={1}
                max={4}
                value={indicatorSettings.bbStdDev}
                onChange={(e) => setIndicatorSettings({ ...indicatorSettings, bbStdDev: Number(e.target.value) || 2 })}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold text-zinc-900"
              />
              <span className="text-[10px] text-zinc-500 block">الافتراضي: 2.0</span>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end">
            <button
              onClick={handleSaveIndicators}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الإعدادات وإعادة حساب التحليل الفني</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Alerts Configuration */}
      {activeSubTab === 'alerts' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" /> إدارة التنبيهات الذكية للنظام (Alerts Configuration)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              تفعيل أو إيقاف محركات التنبيه التلقائية لحركات الاتجاه، الحجم، السيولة، وتداول غير العراقيين.
            </p>
          </div>

          <div className="space-y-4">
            {/* Trend Alerts */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">تنبيهات الاتجاه الفني (Trend Alerts)</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  إشعارات عند حدوث تقاطعات متوسطات متحركة صاعدة/هابطة وتوافق الأطر الزمنية.
                </p>
              </div>
              <button
                onClick={() => handleAlertsToggle('trendAlertsEnabled')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  alertsSettings.trendAlertsEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    alertsSettings.trendAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Alerts */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">تنبيهات أحجام التداول (Volume Alerts)</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  إشعارات عند تجاوز أحجام التداول اليومية ضعف متوسط 20 جلسة.
                </p>
              </div>
              <button
                onClick={() => handleAlertsToggle('volumeAlertsEnabled')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  alertsSettings.volumeAlertsEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    alertsSettings.volumeAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Liquidity Alerts */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">تنبيهات السيولة وقيمة التداول (Liquidity Alerts)</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  إشعارات عند تدفق سيولة استثنائية أو انعدام السيولة الحاد بالأسهم القيادية.
                </p>
              </div>
              <button
                onClick={() => handleAlertsToggle('liquidityAlertsEnabled')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  alertsSettings.liquidityAlertsEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    alertsSettings.liquidityAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Non-Iraqi Alerts */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">تنبيهات تداول غير العراقيين (Foreign Investors Alerts)</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  إشعارات عند تسجيل صافي شراء أو شراء مكثف من المستثمرين غير العراقيين.
                </p>
              </div>
              <button
                onClick={() => handleAlertsToggle('nonIraqiAlertsEnabled')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  alertsSettings.nonIraqiAlertsEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    alertsSettings.nonIraqiAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Composite Score Alerts */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900">تنبيهات الدرجة المركبة Composite Score</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  إشعارات دخول الأسهم فئة (ممتاز) بمجموع نقاط يتجاوز 80/100.
                </p>
              </div>
              <button
                onClick={() => handleAlertsToggle('compositeScoreAlertsEnabled')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  alertsSettings.compositeScoreAlertsEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    alertsSettings.compositeScoreAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Appearance & App Options */}
      {activeSubTab === 'appearance' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-600" /> خيارات المظهر والخطوط وخصائص التشغيل (Appearance)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              تكييف واجهة المستخدم للعمل بالوضع الفاتح أو الليلي وتعديل حجم الخطوط.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-900 block">مظهر الشاشة (Theme Mode)</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    appPrefs.theme === 'light'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-600" />
                  <span className="text-xs">فاتح (Light)</span>
                </button>

                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    appPrefs.theme === 'dark'
                      ? 'border-amber-600 bg-zinc-900 text-white font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs">ليلي (Dark)</span>
                </button>

                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    appPrefs.theme === 'system'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Monitor className="w-5 h-5 text-zinc-600" />
                  <span className="text-xs">تلقائي</span>
                </button>
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-900 block">حجم الخطوط (Font Size)</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleFontSizeChange('normal')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    appPrefs.fontSize === 'normal'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-xs">عادي (Default)</span>
                </button>

                <button
                  onClick={() => handleFontSizeChange('medium')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    appPrefs.fontSize === 'medium'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-sm">متوسط (Medium)</span>
                </button>

                <button
                  onClick={() => handleFontSizeChange('large')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    appPrefs.fontSize === 'large'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-base font-bold">كبير (Large)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs text-zinc-700">
            <h4 className="font-bold text-zinc-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600" /> قيود التشغيل والاستقرار المنصوص عليها بالوثيقة السادسة:
            </h4>
            <ul className="space-y-1 text-zinc-600 text-[11px] leading-relaxed">
              <li>• عدم وجود أي تحديث تلقائي دوري خلفي (No Auto-Refresh Cron/Timer) لمنع استنزاف البطارية والترافيك.</li>
              <li>• التحديث يحدث حصراً بضغطة زر يدوي صريحة من المستخدم أعلى التطبيق.</li>
              <li>• التخزين يعمل بشكل دائم عبر IndexedDB / LocalStorage للاستخدام الكامل دون الحاجة لشبكة الإنترنت.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: Backup & Restore */}
      {activeSubTab === 'backup' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-600" /> النسخ الاحتياطي الشامل واستعادة التفضيلات (Backup & Restore)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              تصدير كافة إعدادات النظام، قائمة المراقبة، المحفظة، والتنبيهات المخصصة كملف JSON آمن لاستعادتها بأي وقت.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export System Package */}
            <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-amber-600" /> تصدير ملف النسخة الاحتياطية الشاملة
                </h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  حفظ إعداداتك الخاصة (المؤشرات، التنبيهات، القوائم المفضلة، والمحفظة) في ملف JSON واحد.
                </p>
              </div>

              <button
                onClick={exportSystemBackupToFile}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف النسخة الاحتياطية JSON</span>
              </button>
            </div>

            {/* Import System Package */}
            <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-teal-600" /> استعادة ملف النسخة الاحتياطية
                </h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  رفع ملف JSON احتياطي مستخرج سابقاً لاسترجاع كافة خياراتك وقوائمك تلقائياً.
                </p>
              </div>

              <label className="w-full py-2.5 bg-white hover:bg-zinc-100 text-teal-800 border border-zinc-300 font-bold text-xs rounded-xl shadow-xs transition-colors text-center block cursor-pointer">
                اختيار ملف النسخة الاحتياطية...
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
            <h4 className="font-bold text-amber-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" /> ضمانات الأمان والخصوصية (Document 6 Principles):
            </h4>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              لا يقوم التطبيق بجمع أي حسابات بنكية أو كلمات مرور أو بيانات شخصية. كافة المعلومات والإعدادات تُحفظ محلياً 100% على جهازك الشخصي ولا يتم إرسالها لأي خادم خارجي.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
