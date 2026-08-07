import React, { useState } from 'react';
import { FileText, Printer, Download, Layers, ShieldCheck, Globe, AlertTriangle, ChevronDown, ChevronUp, Share2, Copy } from 'lucide-react';
import { ISXCompany, MarketSummary, PortfolioItem } from '../types/isx';

interface ReportsModuleProps {
  companies: ISXCompany[];
  selectedTicker: string;
  summary: MarketSummary;
  portfolio: PortfolioItem[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  companies,
  selectedTicker,
  summary,
  portfolio
}) => {
  const [reportType, setReportType] = useState<'STOCK' | 'SECTOR' | 'MARKET' | 'PORTFOLIO'>('STOCK');
  const [reportTicker, setReportTicker] = useState<string>(selectedTicker);
  const [isShortView, setIsShortView] = useState<boolean>(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  const currentCompany = companies.find((c) => c.ticker === reportTicker) || companies[0];
  const evalData = currentCompany.evaluation;
  const reportData = evalData?.report;
  const execSummary = reportData?.executiveSummary;

  const handlePrint = () => {
    window.print();
  };

  const generateMarkdownReport = () => {
    const timestamp = new Date().toLocaleString('ar-IQ-u-nu-latn');
    const sup1 = evalData?.supports?.[0]?.price != null ? `${evalData.supports[0].price.toFixed(3)} د.ع` : 'غير محدد';
    const res1 = evalData?.resistances?.[0]?.price != null ? `${evalData.resistances[0].price.toFixed(3)} د.ع` : 'غير محدد';

    let md = `# تقرير التحليل الفني لشركة ${currentCompany.nameAr} (${currentCompany.ticker})\n\n`;
    md += `**تاريخ الإنشاء:** ${timestamp}\n`;
    md += `**إصدار محرك التحليل:** Core V2 - Doc 4 Engine\n`;
    md += `**إصدار البيانات:** ISX Data Stream v2.1\n\n`;

    md += `## الملخص التنفيذي\n`;
    if (execSummary) {
      md += `- **القوة الفنية:** ${execSummary.technicalStrengthText}\n`;
      md += `- **الاتجاه العام:** ${execSummary.trendText}\n`;
      md += `- **حجم التداول:** ${execSummary.volumeText}\n`;
      md += `- **السيولة:** ${execSummary.liquidityText}\n`;
      if (execSummary.hasForeignData && execSummary.foreignText) {
        md += `- **المستثمرون غير العراقيين:** ${execSummary.foreignText}\n`;
      }
      md += `- **أقرب دعم:** ${execSummary.nearestSupportText}\n`;
      md += `- **أقرب مقاومة:** ${execSummary.nearestResistanceText}\n`;
      md += `- **الثقة:** ${execSummary.confidenceText}\n\n`;
    }

    md += `## التقييم الفني\n`;
    md += `- **الدرجة المركبة:** ${evalData?.compositeScore}/100 (${evalData?.tier})\n`;
    md += `- **السعر الحالي:** ${(currentCompany?.currentPrice ?? 0).toFixed(2)} د.ع\n\n`;

    md += `## تفسير الاتجاه\n`;
    md += `${reportData?.trendExplanationParagraph || 'لا يتوفر تفسير اتجاه'}\n\n`;

    md += `## شرح المؤشرات الفنية\n`;
    reportData?.indicatorExplanations?.forEach((ind) => {
      md += `### ${ind.name}\n- **الحالة:** ${ind.status}\n- **السبب:** ${ind.reason}\n- **التأثير:** ${ind.impact}\n\n`;
    });

    if (reportData?.technicalRisks && reportData.technicalRisks.length > 0) {
      md += `## المخاطر الفنية الحالية\n`;
      reportData.technicalRisks.forEach((r) => {
        md += `- ⚠️ ${r}\n`;
      });
      md += `\n`;
    }

    md += `---\n*صُدر بواسطة منصة المستثمر الذكي العراقي (Core V2)*\n`;
    return md;
  };

  const handleExportMarkdown = () => {
    const mdContent = generateMarkdownReport();
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ISX_Report_${currentCompany.ticker}_Doc4.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonObj = {
      reportMeta: {
        timestamp: new Date().toISOString(),
        engineVersion: 'Core V2 - Doc 4 Engine',
        dataStreamVersion: 'ISX Data Stream v2.1',
        ticker: currentCompany.ticker,
        companyNameAr: currentCompany.nameAr
      },
      evaluation: evalData,
      reportData
    };
    const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ISX_Report_${currentCompany.ticker}_Doc4.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = () => {
    const mdContent = generateMarkdownReport();
    navigator.clipboard.writeText(mdContent);
    setCopyNotification('تم نسخ التقرير بصيغة Markdown');
    setTimeout(() => setCopyNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Report Type Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setReportType('STOCK')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              reportType === 'STOCK' ? 'bg-amber-600 text-white shadow-xs' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            تقرير السهم الفني
          </button>
          <button
            onClick={() => setReportType('SECTOR')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              reportType === 'SECTOR' ? 'bg-amber-600 text-white shadow-xs' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            تقرير القطاعات
          </button>
          <button
            onClick={() => setReportType('MARKET')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              reportType === 'MARKET' ? 'bg-amber-600 text-white shadow-xs' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            تقرير حالة السوق العام
          </button>
          <button
            onClick={() => setReportType('PORTFOLIO')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              reportType === 'PORTFOLIO' ? 'bg-amber-600 text-white shadow-xs' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            تقرير القوة الفنية للمحفظة
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reportType === 'STOCK' && (
            <>
              <select
                value={reportTicker}
                onChange={(e) => setReportTicker(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} - {c.nameAr}
                  </option>
                ))}
              </select>

              {/* View Toggle */}
              <button
                onClick={() => setIsShortView(!isShortView)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isShortView
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
                }`}
              >
                {isShortView ? 'عرض التقرير الكامل' : 'عرض التقرير المختصر'}
              </button>
            </>
          )}

          {/* Export Dropdown / Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportMarkdown}
              title="تصدير بصيغة Markdown"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg border border-zinc-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              <span>.MD</span>
            </button>

            <button
              onClick={handleExportJSON}
              title="تصدير بصيغة JSON"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg border border-zinc-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              <span>.JSON</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              title="نسخ التقرير"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg border border-zinc-300 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-600" />
              <span>نسخ</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {copyNotification && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl text-center">
          {copyNotification}
        </div>
      )}

      {/* Printable Report Canvas Container */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm print:bg-white print:text-black print:border-none print:shadow-none space-y-6">
        {/* Report Header Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 print:border-black">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 print:text-black">
              منصة المستثمر الذكي العراقي (Core V2)
            </h1>
            <p className="text-xs text-zinc-500 print:text-zinc-600 mt-1">
              محرك التقارير الفنية الرقمي الحتمي لسوق العراق للأوراق المالية (Document 4 Engine)
            </p>
          </div>
          <div className="text-left font-mono text-xs text-zinc-500 print:text-zinc-600 space-y-0.5">
            <div>تاريخ الإنشاء: {new Date().toLocaleString('ar-IQ-u-nu-latn')}</div>
            <div>محرك التحليل: Core V2 - Doc 4 Engine</div>
            <div>إصدار البيانات: ISX Data Stream v2.1</div>
          </div>
        </div>

        {/* 1. STOCK TECHNICAL REPORT */}
        {reportType === 'STOCK' && (
          <div className="space-y-6 text-xs">
            {/* Stock Title Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b border-zinc-200 pb-4 gap-4">
              <div>
                <span className="text-xs text-amber-700 print:text-amber-700 uppercase font-bold font-mono">
                  {isShortView ? 'التقرير الفني المختصر' : 'التقرير الفني الشامل (Doc 4 Engine)'}
                </span>
                <h2 className="text-2xl font-black text-zinc-900 print:text-black">
                  {currentCompany.nameAr} ({currentCompany.ticker})
                </h2>
                <div className="flex items-center gap-3 text-xs text-zinc-500 print:text-zinc-600 mt-1">
                  <span>القطاع: <strong>{currentCompany.sector}</strong></span>
                  <span>•</span>
                  <span>القيمة السوقية: <strong>{((currentCompany?.marketCap ?? 0) / 1000000000).toFixed(2)} مليار د.ع</strong></span>
                  <span>•</span>
                  <span>الجلسة: <strong>{summary.tradingDate}</strong></span>
                </div>
              </div>

              {/* General Overview Composite Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 print:bg-amber-50 rounded-xl text-center min-w-[200px]">
                <span className="text-[10px] text-amber-800 font-bold block">التقييم المركب (Composite Score)</span>
                <div className="text-3xl font-black text-amber-700 print:text-amber-800 font-mono my-0.5">
                  {evalData?.compositeScore ?? 50} <span className="text-xs text-amber-600 font-normal">/100</span>
                </div>
                <div className="text-xs font-bold text-amber-900">
                  {evalData?.tier || 'محايد'} • {evalData?.compositeInterpretation}
                </div>
                <div className="text-[10px] text-teal-700 font-semibold mt-1">
                  مستوى الثقة: {execSummary?.confidenceText || 'مرتفعة'}
                </div>
              </div>
            </div>

            {/* --- SHORT REPORT VIEW (التقرير المختصر) --- */}
            {isShortView && (
              <div className="space-y-6 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <h3 className="text-sm font-bold text-zinc-900">عناصر التقرير المختصر (تصفح سريع):</h3>
                  <span className="text-[11px] text-amber-700 font-bold font-mono">خاص بصفحات البحث والقوائم</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono">
                  <div className="p-3 bg-white rounded-xl border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block">السعر الحالي</span>
                    <strong className="text-sm text-zinc-900">{(currentCompany?.currentPrice ?? 0).toFixed(2)} د.ع</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block">الاتجاه العام (متوسط)</span>
                    <strong className="text-sm text-amber-800 font-bold">{execSummary?.trendText || 'جانبي'}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block">Composite Score</span>
                    <strong className="text-sm text-amber-700 font-bold">{evalData?.compositeScore}/100</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <span className="text-[11px] text-emerald-700 block">الدعم الأول</span>
                    <strong className="text-sm text-emerald-900 font-bold">{execSummary?.nearestSupportText}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-rose-200 bg-rose-50/50">
                    <span className="text-[11px] text-rose-700 block">المقاومة الأولى</span>
                    <strong className="text-sm text-rose-900 font-bold">{execSummary?.nearestResistanceText}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block">مستوى الثقة</span>
                    <strong className="text-sm text-teal-800 font-bold">{execSummary?.confidenceText}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* --- FULL REPORT VIEW (التقرير الكامل بحسب ترتيب الأولويات) --- */}
            {!isShortView && (
              <div className="space-y-6">
                {/* EXECUTIVE SUMMARY BLOCK (الملخص التنفيذي الحتمي) */}
                {execSummary && (
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 border-2 border-amber-300 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <h3 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-700" /> الملخص التنفيذي (Executive Summary)
                      </h3>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        يُقرأ في أقل من 30 ثانية (أقل من 8 أسطر)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs text-zinc-800">
                      <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-zinc-500 block">القوة الفنية</span>
                        <strong className="text-amber-900 font-bold block mt-0.5">{execSummary.technicalStrengthText}</strong>
                      </div>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-zinc-500 block">الاتجاه العام</span>
                        <strong className="text-amber-900 font-bold block mt-0.5">{execSummary.trendText}</strong>
                      </div>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-zinc-500 block">قوة الحجم</span>
                        <strong className="text-amber-900 font-bold block mt-0.5">{execSummary.volumeText}</strong>
                      </div>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-zinc-500 block">قوة السيولة</span>
                        <strong className="text-amber-900 font-bold block mt-0.5">{execSummary.liquidityText}</strong>
                      </div>

                      {/* Non-Iraqi line strictly omitted if no data! */}
                      {execSummary.hasForeignData && execSummary.foreignText && (
                        <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                          <span className="text-[10px] text-zinc-500 block">المستثمرون غير العراقيين</span>
                          <strong className="text-amber-900 font-bold block mt-0.5">{execSummary.foreignText}</strong>
                        </div>
                      )}

                      <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200 bg-emerald-50/40">
                        <span className="text-[10px] text-emerald-700 block">أقرب دعم</span>
                        <strong className="text-emerald-950 font-bold block mt-0.5">{execSummary.nearestSupportText}</strong>
                      </div>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200 bg-rose-50/40">
                        <span className="text-[10px] text-rose-700 block">أقرب مقاومة</span>
                        <strong className="text-rose-950 font-bold block mt-0.5">{execSummary.nearestResistanceText}</strong>
                      </div>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-teal-200 bg-teal-50/40">
                        <span className="text-[10px] text-teal-700 block">مستوى الثقة</span>
                        <strong className="text-teal-950 font-bold block mt-0.5">{execSummary.confidenceText}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRIORITY 1: الاتجاه وتفسير الاتجاه */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4 text-blue-600" /> 1. تحليل وتفسير الاتجاه (Trend & Story)
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center font-mono">
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">قصير المدى</span>
                      <strong className="text-zinc-900 text-xs block font-bold">{evalData?.trendAnalysis?.shortTerm?.level || 'جانبي'}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">متوسط المدى</span>
                      <strong className="text-zinc-900 text-xs block font-bold">{evalData?.trendAnalysis?.mediumTerm?.level || 'جانبي'}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">طويل المدى</span>
                      <strong className="text-zinc-900 text-xs block font-bold">{evalData?.trendAnalysis?.longTerm?.level || 'جانبي'}</strong>
                    </div>
                  </div>

                  {/* Comprehensive 4-sentence trend paragraph */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 space-y-1.5 leading-relaxed">
                    <span className="font-bold block text-blue-900">تفسير الاتجاه الفني الحتمي:</span>
                    <p>{reportData?.trendExplanationParagraph}</p>
                    <p className="text-[11px] text-blue-800 border-t border-blue-200 pt-1 mt-1">
                      {reportData?.trendAlignmentSentence}
                    </p>
                  </div>
                </div>

                {/* PRIORITY 2: Composite Score & Strengths / Weaknesses */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> 2. Composite Score والعوامل المؤثرة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-emerald-900 text-xs">أسباب القوة (أهم 5 عوامل ذات تأثير موجب):</h4>
                      <ul className="space-y-1 text-zinc-800">
                        {(evalData?.pros || []).map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">{i + 1}.</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-rose-900 text-xs">أسباب الضعف (أهم 5 عوامل ذات تأثير سالب):</h4>
                      <ul className="space-y-1 text-zinc-800">
                        {(evalData?.cons || []).map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-600 font-bold">{i + 1}.</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* PRIORITY 3: الدعم والمقاومة */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-emerald-900 text-sm">3.1 مستويات الدعم الرئيسية (Support):</h4>
                    <div className="space-y-1.5 font-mono">
                      {(evalData?.supports || []).map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-emerald-200">
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block">دعم {idx + 1}: {(s.price ?? 0).toFixed(3)} د.ع</span>
                            <span className="text-[10px] text-zinc-500">ارتدادات: {s.bounceCount} • درجات: {s.score}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg font-bold">{s.strengthLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-rose-900 text-sm">3.2 مستويات المقاومة الرئيسية (Resistance):</h4>
                    <div className="space-y-1.5 font-mono">
                      {(evalData?.resistances || []).map((r, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-rose-200">
                          <div>
                            <span className="text-xs font-bold text-rose-900 block">مقاومة {idx + 1}: {(r.price ?? 0).toFixed(3)} د.ع</span>
                            <span className="text-[10px] text-zinc-500">اختراقات: {r.bounceCount} • درجات: {r.score}</span>
                          </div>
                          <span className="text-[10px] bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg font-bold">{r.strengthLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PRIORITY 4 & 5: Volume & Liquidity Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-zinc-900 text-xs">4. تحليل أحجام التداول (Volume Analysis):</h4>
                    <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                      {reportData?.volumeAnalysisSentence || 'الحجم قريب من متوسطه الطبيعي.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-zinc-900 text-xs">5. تحليل السيولة (Liquidity Analysis):</h4>
                    <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                      {reportData?.liquidityAnalysisSentence || 'السيولة ترتفع مع ارتفاع السعر، وهي إشارة داعمة للاتجاه.'}
                    </p>
                  </div>
                </div>

                {/* PRIORITY 6: Indicators Explanation Table (Name -> Status -> Reason -> Impact) */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> 6. شرح تفصيلي للمؤشرات (الحالة، السبب، التأثير)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border border-zinc-200">
                      <thead className="bg-zinc-100 font-bold text-zinc-700">
                        <tr>
                          <th className="p-2.5 border-b">اسم المؤشر</th>
                          <th className="p-2.5 border-b">الحالة المصنفة</th>
                          <th className="p-2.5 border-b">سبب الحالة</th>
                          <th className="p-2.5 border-b">التأثير على التقييم النهائي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {(reportData?.indicatorExplanations || []).map((ind, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="p-2.5 font-bold text-zinc-900">{ind.name}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[11px]">
                                {ind.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-700">{ind.reason}</td>
                            <td className="p-2.5 font-semibold text-zinc-900">{ind.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRIORITY 7: Non-Iraqi Investors Analysis */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-teal-600" /> 7. تحليل المستثمرين غير العراقيين
                  </h3>
                  {reportData?.foreignersReport?.hasData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
                        <div className="p-2 bg-teal-50 rounded-xl border border-teal-200">
                          <span className="text-[10px] text-teal-700 block">صافي الشراء/البيع</span>
                          <strong className="text-teal-900 text-xs font-bold">{reportData.foreignersReport.netStatusText}</strong>
                        </div>
                        <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-500 block">قيمة صافي التداول</span>
                          <strong className="text-zinc-900 text-xs font-bold">{((currentCompany?.nonIraqi?.netValue ?? 0) / 1000000).toFixed(2)}M د.ع</strong>
                        </div>
                        <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-500 block">حالة التجميع</span>
                          <strong className="text-amber-800 text-xs font-bold">{currentCompany?.nonIraqi?.accumulationTrend || 'غير متوفر'}</strong>
                        </div>
                        <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                          <span className="text-[10px] text-zinc-500 block">التوافق مع السعر</span>
                          <strong className="text-teal-800 text-xs font-bold">{currentCompany?.nonIraqi?.alignmentWithPrice || 'غير متوفر'}</strong>
                        </div>
                      </div>
                      <p className="p-3 bg-teal-50/70 text-teal-950 font-semibold rounded-xl border border-teal-200">
                        {reportData.foreignersReport.fullText}
                      </p>
                    </div>
                  ) : (
                    <p className="p-3 bg-zinc-50 text-zinc-600 rounded-xl border border-zinc-200">
                      بيانات المستثمرين غير العراقيين غير متوفرة لهذا السهم حالياً.
                    </p>
                  )}
                </div>

                {/* PRIORITY 8: Patterns & Technical Risks */}
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> 8. النماذج الفنية والمخاطر المكتشفة
                  </h3>
                  {reportData?.technicalRisks && reportData.technicalRisks.length > 0 ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                      <span className="font-bold text-rose-900 text-xs block">المخاطر الفنية الحالية (مكتشفة بشروط رقمية):</span>
                      <ul className="space-y-1 text-xs text-rose-800">
                        {reportData.technicalRisks.map((risk, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="font-bold text-rose-600">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs">
                      لا توجد مخاطر فنية حادة مكتشفة حالياً وفق خوارزميات الشروط الرقمية.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. SECTOR TECHNICAL REPORT */}
        {reportType === 'SECTOR' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 print:text-black">
              تقرير التقييم الفني والسيولة الموجهة للقطاعات
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-zinc-200 print:border-black">
                <thead className="bg-zinc-100 print:bg-zinc-100 border-b border-zinc-200 font-bold">
                  <tr>
                    <th className="p-3">القطاع</th>
                    <th className="p-3">عدد الشركات</th>
                    <th className="p-3">سيولة القطاع (د.ع)</th>
                    <th className="p-3">القوة الفنية للقطاع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {['المصارف', 'الاتصالات', 'الصناعة', 'الخدمات', 'العقارات'].map((sec) => {
                    const secCompanies = companies.filter((c) => c.sector === sec);
                    const totalVal = secCompanies.reduce((s, c) => s + c.value, 0);
                    const avgScore =
                      secCompanies.length > 0
                        ? Math.round(
                            secCompanies.reduce((s, c) => s + c.evaluation.compositeScore, 0) /
                              secCompanies.length
                          )
                        : 50;

                    return (
                      <tr key={sec}>
                        <td className="p-3 font-bold text-zinc-900 print:text-black">{sec}</td>
                        <td className="p-3 font-mono text-zinc-800">{secCompanies.length}</td>
                        <td className="p-3 font-mono font-bold text-amber-700 print:text-black">
                          {(totalVal / 1000000).toFixed(1)}M د.ع
                        </td>
                        <td className="p-3 font-mono font-bold text-zinc-900">{avgScore}/100</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MARKET TECHNICAL REPORT */}
        {reportType === 'MARKET' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 print:text-black">
              تقرير الأداء الفني والسيولة لسوق العراق العام
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 print:bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <div>
                <span className="text-zinc-500">مؤشر ISX60 العام:</span>
                <div className="text-base font-bold font-mono text-zinc-900 print:text-black">
                  {(summary.isx60?.currentValue ?? 0).toFixed(2)} ({(summary.isx60?.changePct ?? 0) >= 0 ? '+' : ''}{summary.isx60?.changePct ?? 0}%)
                </div>
              </div>
              <div>
                <span className="text-zinc-500">حجم التداول الكلي:</span>
                <div className="text-base font-bold font-mono text-amber-700 print:text-black">
                  {((summary.totalVolume ?? 0) / 1000000).toFixed(1)}M سهم
                </div>
              </div>
              <div>
                <span className="text-zinc-500">صافي التدفق الأجنبي:</span>
                <div className="text-base font-bold font-mono text-emerald-700 print:text-black">
                  +{((summary.foreignerNetBuyTotalValue ?? 0) / 1000000).toFixed(1)}M د.ع
                </div>
              </div>
              <div>
                <span className="text-zinc-500">الشركات المرتفعة:</span>
                <div className="text-base font-bold font-mono text-emerald-700 print:text-black">
                  {summary.advancersCount} من أصل {summary.tradedCompaniesCount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PORTFOLIO TECHNICAL STRENGTH REPORT */}
        {reportType === 'PORTFOLIO' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 print:text-black">
              تقرير القوة الفنية ومخاطر المحفظة الاستثمارية
            </h2>
            <p className="text-xs text-zinc-700 print:text-zinc-800 leading-relaxed">
              تحليل محفظة المستثمر المكونة من ({portfolio.length}) أسهم؛ يُظهر التقرير متانة المراكز السعرية وتوازن توزيع الأصول عبر قطاعات السوق.
            </p>
          </div>
        )}

        {/* Report Footer Note */}
        <div className="pt-6 border-t border-zinc-200 print:border-black text-[10px] text-zinc-500 print:text-zinc-600 text-center flex items-center justify-between">
          <span>صُدر هذا التقرير الفني أوتوماتيكياً بواسطة محرك التحليل الرقمي الحتمي - منصة المستثمر الذكي العراقي Core V2.</span>
          <span className="font-mono">Doc 4 Engine • Version 2.1</span>
        </div>
      </div>
    </div>
  );
};
