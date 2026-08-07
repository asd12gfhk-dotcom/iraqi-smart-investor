import React, { useState } from 'react';
import { Calculator, CheckCircle2, Info, ArrowLeftRight, Percent, RefreshCw } from 'lucide-react';
import { calculateISXProfit } from '../utils/profitCalculator';
import { normalizeEnglishDigits } from '../utils/numberUtils';

export const ProfitCalculator: React.FC = () => {
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [commissionRatePct, setCommissionRatePct] = useState<string>('');

  const buyPriceNum = parseFloat(normalizeEnglishDigits(buyPrice)) || 0;
  const sellPriceNum = parseFloat(normalizeEnglishDigits(sellPrice)) || 0;
  const sharesNum = parseInt(normalizeEnglishDigits(shares), 10) || 0;
  const commissionRateNum = commissionRatePct.trim() === '' ? 0.6 : (parseFloat(normalizeEnglishDigits(commissionRatePct)) || 0);

  const result = calculateISXProfit(buyPriceNum, sellPriceNum, sharesNum, commissionRateNum);

  // Quick preset loader for benchmark reference test example
  const loadReferenceExample = () => {
    setBuyPrice('4.32');
    setSellPrice('4.38');
    setShares('1000');
    setCommissionRatePct('0.6');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" /> حاسبة صافي الأرباح الدقيقة وفق عمولة بورسـة العراق (ISX)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            أداة مستقلة لحساب الربح/الخسارة الفعلية الصافية وسعر التعادل بعد خصم عمولتي الشراء والبيع بشكل منفصل.
          </p>
        </div>

        <button
          onClick={loadReferenceExample}
          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحميل المثال المرجعي للاختبار (4.32 / 4.38)</span>
        </button>
      </div>

      {/* Main Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Parameters Panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-200 flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-600" /> مدخلات الصفقة المالية
          </h3>

          <div className="space-y-4 text-xs">
            {/* Buy Price */}
            <div>
              <label className="text-zinc-700 font-bold block mb-1.5">
                سعر الشراء للسهم (د.ع):
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="أدخل سعر الشراء (مثال: 4.32)"
                value={buyPrice}
                onChange={(e) => setBuyPrice(normalizeEnglishDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 dir-ltr text-right"
              />
            </div>

            {/* Sell Price */}
            <div>
              <label className="text-zinc-700 font-bold block mb-1.5">
                سعر البيع المتوقع/الفعلي للسهم (د.ع):
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="أدخل سعر البيع (مثال: 4.38)"
                value={sellPrice}
                onChange={(e) => setSellPrice(normalizeEnglishDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 dir-ltr text-right"
              />
            </div>

            {/* Shares Count */}
            <div>
              <label className="text-zinc-700 font-bold block mb-1.5">
                عدد الأسهم في الصفقة:
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="أدخل عدد الأسهم (مثال: 1000)"
                value={shares}
                onChange={(e) => setShares(normalizeEnglishDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 dir-ltr text-right"
              />
            </div>

            {/* Commission Rate */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-zinc-700 font-bold">
                  نسبة عمولة الوساطة (% لكل طرف):
                </label>
                <span className="text-amber-700 font-mono font-bold">
                  {commissionRateNum}% ({commissionRateNum * 10} بالألف)
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="النسبة الافتراضية: 0.6"
                value={commissionRatePct}
                onChange={(e) => setCommissionRatePct(normalizeEnglishDigits(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 dir-ltr text-right"
              />
              <span className="text-[11px] text-zinc-500 block mt-1">
                العمولة الافتراضية في سوق العراق: 0.6% (6 بالألف لكل جانب من الشراء والبيع بشكل مستقل).
              </span>
            </div>
          </div>
        </div>

        {/* Output Calculation Results Panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-200 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-amber-600" /> نتائج الحساب التفصيلية
            </h3>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-zinc-600">قيمة الشراء الكلية:</span>
                <span className="font-mono font-bold text-zinc-900">{result.buyTotalValue.toLocaleString()} د.ع</span>
              </div>

              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-zinc-600">قيمة البيع الكلية:</span>
                <span className="font-mono font-bold text-zinc-900">{result.sellTotalValue.toLocaleString()} د.ع</span>
              </div>

              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-zinc-600">إجمالي العمولات (الشراء {result.buyCommission.toFixed(2)} + البيع {result.sellCommission.toFixed(2)}):</span>
                <span className="font-mono font-bold text-rose-700">{result.totalCommissions.toFixed(2)} د.ع</span>
              </div>

              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-zinc-600">الربح الإجمالي (قبل العمولات):</span>
                <span className="font-mono font-bold text-zinc-900">{result.grossProfit.toFixed(2)} د.ع</span>
              </div>

              {/* Net Profit Highlight Box */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  result.netProfit >= 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div>
                  <span className="text-xs uppercase font-bold block">الربح الصافي الفعلي النهائي:</span>
                  <span className="text-2xl font-black font-mono mt-0.5 block">
                    {result.netProfit >= 0 ? '+' : ''}{result.netProfit.toFixed(2)} د.ع
                  </span>
                </div>
                <div className="text-left font-mono font-bold text-sm">
                  ({result.netProfitPct >= 0 ? '+' : ''}{result.netProfitPct.toFixed(2)}%)
                </div>
              </div>

              {/* Break-even Sell Price Highlight Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-800 font-bold block">سعر التعادل للبيع (Break-even):</span>
                  <span className="text-[11px] text-zinc-500">السعر الدقيق للبيع دون تحقيق أي خسارة صافية</span>
                </div>
                <span className="text-lg font-black font-mono text-amber-700">
                  {result.breakEvenSellPrice.toFixed(4)} د.ع
                </span>
              </div>
            </div>
          </div>

          {/* Reference Example Verification Card */}
          {result.isReferenceExampleMatch && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-emerald-950 mb-0.5">
                  تأكيد التحقق المرجعي: مطابقة تامة مع المثال القياسي للوثيقة!
                </strong>
                سعر شراء 4.32 | سعر بيع 4.38 | 1000 سهم | عمولة 0.6% &larr; إجمالي العمولات المخصومة: <strong>52.20 د.ع</strong> | والربح الصافي الفعلي المستلم: <strong>7.80 د.ع</strong> (وليس 60.00 د.ع قبل الخصم).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
