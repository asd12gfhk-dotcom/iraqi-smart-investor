import React, { useState } from 'react';
import { Database, Download, Upload, RefreshCw, Check, AlertTriangle, HardDrive, ShieldCheck, Play, Server, Activity } from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { resetDatabaseToDefaults, saveISXCompanies } from '../utils/dataStore';
import { runDataEnginePipeline, DataEngineLog, DATA_ENGINE_SOURCES } from '../utils/dataEngine';

interface DataManagerProps {
  companies: ISXCompany[];
  onUpdateCompanies: (updated: ISXCompany[]) => void;
  onManualUpdate: () => void;
  lastUpdatedTime: string;
}

export const DataManager: React.FC<DataManagerProps> = ({
  companies,
  onUpdateCompanies,
  onManualUpdate,
  lastUpdatedTime
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [engineLog, setEngineLog] = useState<DataEngineLog | null>(null);

  // Calculate local storage approximate byte size
  const dataJsonStr = JSON.stringify(companies);
  const dataSizeKb = (dataJsonStr.length / 1024).toFixed(1);

  // Total historical bars count
  const totalBarsCount = companies.reduce((acc, c) => acc + c.history.length, 0);

  // Run official Data Engine Pipeline
  const handleRunEnginePipeline = async () => {
    setIsRunningEngine(true);
    setImportStatus(null);
    try {
      const { companies: updatedCompanies, log } = await runDataEnginePipeline();
      if (updatedCompanies.length > 0) {
        saveISXCompanies(updatedCompanies);
        onUpdateCompanies(updatedCompanies);
      }
      setEngineLog(log);
      setImportStatus(log.message);
    } catch (err: any) {
      setImportStatus('خطأ أثناء تشغيل محرك البيانات: ' + (err?.message || 'مشكلة غير متوقعة'));
    } finally {
      setIsRunningEngine(false);
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const blob = new Blob([dataJsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `isx_core_v2_dataset_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          saveISXCompanies(parsed);
          onUpdateCompanies(parsed);
          setImportStatus('تم استيراد بيانات السوق بنجاح وتحديث قاعدة البيانات المحلية!');
        } else {
          setImportStatus('خطأ: تنسيق الملف غير صالح. يجب أن يحتوي الملف على مصفوفة شركات سوق العراق.');
        }
      } catch (err) {
        setImportStatus('خطأ في قراءة ملف JSON المستورد.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (window.confirm('هل أنت أعدت التأكيد لربط البيانات بالنسخة الأصلية وتفريغ التعديلات؟')) {
      const fresh = resetDatabaseToDefaults();
      onUpdateCompanies(fresh);
      setEngineLog(null);
      setImportStatus('تمت إعادة ضبط كافة بيانات السوق إلى النسخة المعتمدة الرسمية.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" /> المحور الأول: نظام إدارة البيانات والتخزين المحلي (Data Engine)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            جمع، تنظيف، توحيد، والتحقق من جودة بيانات سوق العراق للأسعار وتداول غير العراقيين وفق الوثيقة الرسمية الثانية.
          </p>
        </div>
      </div>

      {/* Dataset Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1 font-medium">عدد الشركات المسجلة:</span>
          <span className="text-2xl font-black font-mono text-amber-700">{companies.length}</span>
          <span className="text-[11px] text-zinc-500 block mt-1">تغطي كافة القطاعات الرئيسية</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1 font-medium">إجمالي الجلسات التاريخية:</span>
          <span className="text-2xl font-black font-mono text-emerald-700">{totalBarsCount}</span>
          <span className="text-[11px] text-zinc-500 block mt-1">سلاسل زمنية كاملة للأسعار</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1 font-medium">حجم التخزين المحلي (LocalStorage):</span>
          <span className="text-2xl font-black font-mono text-blue-700">{dataSizeKb} KB</span>
          <span className="text-[11px] text-zinc-500 block mt-1">تخزين محلي دائم بدون خادم</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1 font-medium">تاريخ التحديث الأخير:</span>
          <span className="text-xs font-mono font-bold text-zinc-800 block mt-1">
            {new Date(lastUpdatedTime).toLocaleString('ar-IQ-u-nu-latn')}
          </span>
          <span className="text-[11px] text-emerald-700 font-bold block mt-1">مستقر محلياً دون اتصال</span>
        </div>
      </div>

      {/* Official Data Engine Pipeline Executable Panel */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-600" /> تشغيل محرك البيانات الرقمي (Data Engine Pipeline)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              تنفيذ معالجة جلب البيانات التاريخية وتداول غير العراقيين من المستودع الرسمي مع تنظيف وفحص الشذوذ وحساب الجودة.
            </p>
          </div>

          <button
            onClick={handleRunEnginePipeline}
            disabled={isRunningEngine}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunningEngine ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isRunningEngine ? 'جاري معالجة البيانات...' : 'تشغيل محرك البيانات الآن'}</span>
          </button>
        </div>

        {/* Data Sources Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1">مصدر الأسعار التاريخية الرئيسي</span>
            <code className="text-[11px] font-mono text-zinc-800 block truncate">{DATA_ENGINE_SOURCES.HISTORY_URL}</code>
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1">مصدر تداول غير العراقيين الرسمي</span>
            <code className="text-[11px] font-mono text-zinc-800 block truncate">{DATA_ENGINE_SOURCES.FOREIGN_TRADING_URL}</code>
          </div>
        </div>

        {/* Diagnostic Log Output */}
        {engineLog && (
          <div className="p-4 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs space-y-2 border border-zinc-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> سجل معالجة محرك البيانات (Data Engine Log)
              </span>
              <span className="text-[10px] text-zinc-400">{engineLog.timestamp}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div>الشركات: <strong className="text-white">{engineLog.companiesCount}</strong></div>
              <div>الجلسات: <strong className="text-white">{engineLog.barsCount}</strong></div>
              <div>متوسط الجودة: <strong className="text-emerald-400">{engineLog.qualityAvgScore}%</strong></div>
              <div>حالات الشذوذ: <strong className="text-amber-400">{engineLog.anomaliesCount}</strong></div>
              <div>الزمن: <strong className="text-blue-400">{engineLog.executionTimeMs} ms</strong></div>
              <div>الحالة: <strong className={engineLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}>{engineLog.status}</strong></div>
            </div>
            <div className="text-[11px] text-zinc-300 pt-1 border-t border-zinc-800/80">
              {engineLog.message}
            </div>
          </div>
        )}
      </div>

      {/* JSON Import/Export & Controls Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-200 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-600" /> خيارات التصدير والاستيراد وحفظ النسخ الاحتياطية
        </h3>

        {importStatus && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span className="font-semibold">{importStatus}</span>
            <button onClick={() => setImportStatus(null)} className="text-zinc-500 hover:text-zinc-900 text-xs font-bold cursor-pointer">
              إغلاق
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Export JSON */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-1">
                <Download className="w-4 h-4 text-amber-600" /> تصدير ملف البيانات (Export JSON)
              </h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                قم بتنزيل كافة بيانات الأسعار والسلاسل الزمنية وتداول غير العراقيين كملف JSON مستقل.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              className="w-full py-2 bg-white hover:bg-zinc-100 text-amber-800 font-bold text-xs rounded-lg border border-zinc-300 transition-colors cursor-pointer shadow-xs"
            >
              تنزيل ملف JSON
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-1">
                <Upload className="w-4 h-4 text-teal-600" /> استيراد ملف بيانات (Import JSON)
              </h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                تحميل ملف بيانات JSON خارجي لتحديث قوائم الأسعار والسلاسل التاريخية محلياً.
              </p>
            </div>
            <label className="w-full py-2 bg-white hover:bg-zinc-100 text-teal-800 font-bold text-xs rounded-lg border border-zinc-300 transition-colors cursor-pointer text-center block shadow-xs">
              اختيار ملف JSON...
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>

          {/* Reset to Seed Defaults */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-1">
                <RefreshCw className="w-4 h-4 text-rose-600" /> إعادة الضبط الافتراضي (Reset)
              </h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                استرجاع قاعدة البيانات النموذجية المعتمدة لأسهم سوق العراق للأوراق المالية.
              </p>
            </div>
            <button
              onClick={handleResetDefaults}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-lg border border-rose-300 transition-colors cursor-pointer shadow-xs"
            >
              إعادة الضبط
            </button>
          </div>
        </div>

        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-zinc-800 space-y-2">
          <h4 className="font-bold text-amber-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700" /> ضمانات ومبادئ البنية الأساسية للوثيقة الثانية:
          </h4>
          <ul className="space-y-1 text-zinc-600 text-[11px] leading-relaxed font-medium">
            <li>• يتم الاعتماد حصراً على المستودع الرسمي المباشر لبيانات الأسعار وتداول المستثمرين غير العراقيين.</li>
            <li>• يقوم محرك البيانات بتنظيف التاريخ وتوحيد الصيغ والتحقق الرياضياتي واكتشاف الشذوذ أوتوماتيكياً.</li>
            <li>• البيانات محددة بالأسعار والحجم وصفقات المستثمرين غير العراقيين فقط دون أي أخبار أو إفصاحات.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

