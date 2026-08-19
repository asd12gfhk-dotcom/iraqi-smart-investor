import React from 'react';
import { Bell, Zap, ChevronLeft, AlertTriangle, ShieldAlert, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { ISXCompany } from '../types/isx';
import { generateTechnicalAlerts } from '../utils/alertsEngine';

interface TechnicalAlertsModuleProps {
  companies: ISXCompany[];
  onSelectStock: (ticker: string) => void;
}

export const TechnicalAlertsModule: React.FC<TechnicalAlertsModuleProps> = ({ companies, onSelectStock }) => {
  // Only high-importance alerts (أهمية مرتفعة)
  const highPriorityAlerts = generateTechnicalAlerts(companies).filter(alt => alt.importance === 'مرتفع');

  return (
    <div className="space-y-6 dir-rtl">
      {/* Module Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600" /> التنبيهات الفنية العاجلة (ذات الأهمية المرتفعة فقط)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            قسم مستقل يعرض حتمياً التنبيهات وإشارات التداول الحاسمة فقط (اختراق المقاومات، كسر الدعوم الرئيسية، والقفزات الاستثنائية للسيولة والحجوم).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 bg-rose-600 text-white rounded-xl shadow-xs flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            {highPriorityAlerts.length} تنبيه مرتفع الأهمية
          </span>
        </div>
      </div>

      {/* Alerts Grid Feed */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" /> قائمة التنبيهات الملتقطة للجلسة الحالية
          </h3>
          <span className="text-xs font-mono text-zinc-500">مفلترة آلياً: أهمية مرتفعة فقط</span>
        </div>

        {highPriorityAlerts.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <ShieldAlert className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-zinc-500 text-xs font-semibold">
              لا توجد تنبيهات حادة أو استثنائية ذات أهمية مرتفعة في هذه الجلسة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highPriorityAlerts.map((alt) => (
              <div
                key={alt.id}
                onClick={() => onSelectStock(alt.ticker)}
                className="p-4 bg-zinc-50 hover:bg-amber-50/50 border border-zinc-200 hover:border-amber-300 rounded-xl cursor-pointer transition-all space-y-2.5 group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-700 font-mono text-base">{alt.ticker}</span>
                    <span className="font-bold text-zinc-900 text-sm">{alt.companyName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shadow-xs">
                      أهمية مرتفعة
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{alt.timestamp}</span>
                  </div>
                </div>

                <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs bg-amber-100/60 px-2.5 py-1 rounded-md w-fit">
                  <Zap className="w-3.5 h-3.5 text-amber-700" /> {alt.alertType}
                </div>

                <p className="text-xs text-zinc-700 leading-relaxed bg-white p-3 rounded-lg border border-zinc-200 font-mono">
                  {alt.reason}
                </p>

                <div className="flex items-center justify-end text-[11px] text-amber-800 font-semibold group-hover:underline pt-1">
                  <span>فتح التحليل الفني الكامل بالسهم</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
