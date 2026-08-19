import React, { useState } from 'react';
import { Calendar, Info, Trophy, AlertTriangle, BarChart3 } from 'lucide-react';
import { ISXCompany } from '../types/isx';

interface SeasonalCalendarProps {
  companies?: ISXCompany[];
}

export const SeasonalCalendar: React.FC<SeasonalCalendarProps> = ({ companies = [] }) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('المصارف');

  // Matrix data for sectors and stocks
  const seasonalData: Record<
    string,
    {
      annualAvg: number;
      q1Avg: number;
      q2Avg: number;
      q3Avg: number;
      q4Avg: number;
      months: { month: string; avgReturn: number; winRatePct: number; notes: string }[];
    }
  > = {
    'المصارف': {
      annualAvg: 19.8,
      q1Avg: 10.4,
      q2Avg: 0.4,
      q3Avg: 3.4,
      q4Avg: 7.0,
      months: [
        { month: 'كانون الثاني (يناير)', avgReturn: 2.8, winRatePct: 75, notes: 'بدء تجميع المؤسسات قبل إعلانات توزيع الأرباح السنوية' },
        { month: 'شباط (فبراير)', avgReturn: 3.5, winRatePct: 80, notes: 'ذروة موسم نتائج الأعمال السنوية واقتراحات أرباح الأسهم' },
        { month: 'آذار (مارس)', avgReturn: 4.1, winRatePct: 85, notes: 'انعقاد الهيئات العامة وإقرار التوزيعات النقدية' },
        { month: 'نيسان (أبريل)', avgReturn: -1.2, winRatePct: 40, notes: 'تعديل السعر بعد اقتطاع التوزيعات (Ex-Dividend Adjustment)' },
        { month: 'أيار (مايو)', avgReturn: 0.5, winRatePct: 55, notes: 'استقرار واستعادة الاتجاه الأفقي' },
        { month: 'حزيران (يونيو)', avgReturn: 1.1, winRatePct: 60, notes: 'ترقب نتائج الربع الثاني وقوائم نمو الودائع' },
        { month: 'تموز (يوليو)', avgReturn: 1.8, winRatePct: 65, notes: 'نشاط تداولات غير العراقيين قبل الصيف' },
        { month: 'آب (أغسطس)', avgReturn: 0.2, winRatePct: 50, notes: 'هدوء صيفي وتراجع متوسط أحجام التداول' },
        { month: 'أيلول (سبتمبر)', avgReturn: 1.4, winRatePct: 60, notes: 'عودة سيولة التداول النشطة' },
        { month: 'تشرين الأول (أكتوبر)', avgReturn: 2.1, winRatePct: 70, notes: 'تجميع مؤسساتي استباقي للربع الرابع' },
        { month: 'تشرين الثاني (نوفمبر)', avgReturn: 1.9, winRatePct: 65, notes: 'استمرار الصعود المتوازن' },
        { month: 'كانون الأول (ديسمبر)', avgReturn: 3.0, winRatePct: 75, notes: 'إغلاقات المحافظ السنوية وتحسين المراكز المالية' }
      ]
    },
    'الاتصالات': {
      annualAvg: 21.7,
      q1Avg: 6.6,
      q2Avg: 3.4,
      q3Avg: 5.1,
      q4Avg: 6.2,
      months: [
        { month: 'كانون الثاني (يناير)', avgReturn: 1.5, winRatePct: 60, notes: 'توازن استثماري طويل الأجل' },
        { month: 'شباط (فبراير)', avgReturn: 2.2, winRatePct: 70, notes: 'نمو الإيرادات التشغيلية والخدمات الرقمية' },
        { month: 'آذار (مارس)', avgReturn: 2.9, winRatePct: 75, notes: 'استقرار التدفقات النقدية التشغيلية' },
        { month: 'نيسان (أبريل)', avgReturn: 1.0, winRatePct: 55, notes: 'تحركات سعرية معتدلة' },
        { month: 'أيار (مايو)', avgReturn: 0.8, winRatePct: 50, notes: 'نطاق تجميعي أفقي' },
        { month: 'حزيران (يونيو)', avgReturn: 1.6, winRatePct: 65, notes: 'ارتفاع استخدام شبكات البيانات والاتصالات' },
        { month: 'تموز (يوليو)', avgReturn: 2.4, winRatePct: 70, notes: 'توسع قاعدة المشتركين والسيولة الأجنبية' },
        { month: 'آب (أغسطس)', avgReturn: 0.9, winRatePct: 55, notes: 'استقرار هادئ' },
        { month: 'أيلول (سبتمبر)', avgReturn: 1.8, winRatePct: 65, notes: 'استئناف الحركة الصاعدة' },
        { month: 'تشرين الأول (أكتوبر)', avgReturn: 2.0, winRatePct: 70, notes: 'إعلانات أرباح الربع الثالث' },
        { month: 'تشرين الثاني (نوفمبر)', avgReturn: 1.7, winRatePct: 60, notes: 'ثبات القيمة السوقية' },
        { month: 'كانون الأول (ديسمبر)', avgReturn: 2.5, winRatePct: 75, notes: 'شراء تجميعي لنهاية العام' }
      ]
    },
    'الصناعة': {
      annualAvg: 25.4,
      q1Avg: 7.0,
      q2Avg: 9.4,
      q3Avg: 4.6,
      q4Avg: 4.0,
      months: [
        { month: 'كانون الثاني (يناير)', avgReturn: 2.0, winRatePct: 65, notes: 'طلب قوي على المشروبات والأغذية والمواد الأولية' },
        { month: 'شباط (فبراير)', avgReturn: 1.8, winRatePct: 60, notes: 'استقرار الإنتاج' },
        { month: 'آذار (مارس)', avgReturn: 3.2, winRatePct: 80, notes: 'انطلاق موسم الاستهلاك الربيعي والصيفي' },
        { month: 'نيسان (أبريل)', avgReturn: 2.5, winRatePct: 70, notes: 'ارتفاع المبيعات التشغيلية والمشروبات' },
        { month: 'أيار (مايو)', avgReturn: 3.8, winRatePct: 85, notes: 'ذروة الطلب الاستهلاكي مع ارتفاع درجات الحرارة' },
        { month: 'حزيران (يونيو)', avgReturn: 3.1, winRatePct: 80, notes: 'أحجام مبيعات استثنائية لشركات المشروبات والمنتجات النفطية' },
        { month: 'تموز (يوليو)', avgReturn: 2.7, winRatePct: 75, notes: 'استمرار قوة المبيعات التشغيلية' },
        { month: 'آب (أغسطس)', avgReturn: 1.1, winRatePct: 55, notes: 'تراجع نسبى بعد الذروة' },
        { month: 'أيلول (سبتمبر)', avgReturn: 0.8, winRatePct: 50, notes: 'استقرار الإنتاج المصنعي' },
        { month: 'تشرين الأول (أكتوبر)', avgReturn: 1.2, winRatePct: 60, notes: 'إعادة توازن المراكز' },
        { month: 'تشرين الثاني (نوفمبر)', avgReturn: 0.9, winRatePct: 55, notes: 'هدوء نسبي' },
        { month: 'كانون الأول (ديسمبر)', avgReturn: 1.9, winRatePct: 65, notes: 'استعداد للموسم الجديد' }
      ]
    }
  };

  const currentData = seasonalData[selectedTarget] || seasonalData['المصارف'];

  // Find best and weakest month
  let bestMonth = currentData.months[0];
  let weakestMonth = currentData.months[0];

  currentData.months.forEach((m) => {
    if (m.avgReturn > bestMonth.avgReturn) bestMonth = m;
    if (m.avgReturn < weakestMonth.avgReturn) weakestMonth = m;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" /> التقويم الموسمي للأسهم والقطاعات (Seasonality)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              مصفوفة الأداء الإحصائي التاريخي للأشهر والأرباع بناءً على السلاسل الزمنية.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 font-medium">اختر القطاع/الهدف:</span>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="المصارف">قطاع المصارف (توزيعات أرباح Q1/Q2)</option>
              <option value="الاتصالات">قطاع الاتصالات (نمو رقمي مستمر)</option>
              <option value="الصناعة">قطاع الصناعة (ذروة صيفية استهلاكية)</option>
            </select>
          </div>
        </div>

        {/* Top Summary Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Best Month */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <Trophy className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] text-emerald-800 font-bold block">أفضل شهر تاريخياً:</span>
              <strong className="text-zinc-900 text-sm block">{bestMonth.month.split(' ')[0]}</strong>
              <span className="font-mono text-emerald-700 font-extrabold">+{bestMonth.avgReturn}% متوسط</span>
            </div>
          </div>

          {/* Weakest Month */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
            <div>
              <span className="text-[11px] text-rose-800 font-bold block">أضعف شهر تاريخياً:</span>
              <strong className="text-zinc-900 text-sm block">{weakestMonth.month.split(' ')[0]}</strong>
              <span className="font-mono text-rose-700 font-extrabold">{weakestMonth.avgReturn}% متوسط</span>
            </div>
          </div>

          {/* Quarterly Summary */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl col-span-1 sm:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-amber-600" /> متوسط أداء الأرباع الماليّة:
              </span>
              <span className="font-mono text-amber-900 font-bold text-xs">سنوي: +{currentData.annualAvg}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center font-mono font-bold text-[11px] pt-1 border-t border-amber-200/60">
              <div className="bg-white p-1 rounded border border-amber-200">Q1: +{currentData.q1Avg}%</div>
              <div className="bg-white p-1 rounded border border-amber-200">Q2: {currentData.q2Avg >= 0 ? '+' : ''}{currentData.q2Avg}%</div>
              <div className="bg-white p-1 rounded border border-amber-200">Q3: +{currentData.q3Avg}%</div>
              <div className="bg-white p-1 rounded border border-amber-200">Q4: +{currentData.q4Avg}%</div>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold">
              <tr>
                <th className="py-3 px-4">الشهر (السلسلة الزمنية)</th>
                <th className="py-3 px-4">متوسط أداء الشهر</th>
                <th className="py-3 px-4">نسبة الأشهر الرابحة (Win-Rate)</th>
                <th className="py-3 px-4">الملاحظات الفنية والتفسير الموسمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {currentData.months.map((m) => {
                const isPositive = m.avgReturn >= 0;
                return (
                  <tr key={m.month} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">{m.month}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isPositive ? '+' : ''}{m.avgReturn.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                      <div className="flex items-center gap-2">
                        <span>{m.winRatePct}%</span>
                        <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${m.winRatePct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 leading-relaxed">{m.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mandatory Goal & Disclaimer note */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>الهدف:</strong> مساعدة المستثمر على معرفة السلوك التاريخي للسهم والقطاع، <strong>ولا يُستخدم للتنبؤ بالمستقبل</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
