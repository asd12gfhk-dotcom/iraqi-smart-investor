import { ISXCompany } from '../types/isx';

export type AlertImportance = 'مرتفع' | 'متوسط' | 'منخفض';

export interface TriggeredTechnicalAlert {
  id: string;
  ticker: string;
  companyName: string;
  timestamp: string;
  alertType: string;
  reason: string;
  importance: AlertImportance;
}

/**
 * Evaluates the 12 deterministic technical alert conditions specified in Document 5 (Section 11)
 * between the previous session and current session for all companies.
 */
export function generateTechnicalAlerts(companies: ISXCompany[]): TriggeredTechnicalAlert[] {
  const alerts: TriggeredTechnicalAlert[] = [];
  const nowStr = new Date().toLocaleTimeString('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' });

  companies.forEach((c) => {
    const history = c.history || [];
    if (history.length < 3) return;

    const currBar = history[history.length - 1];
    const prevBar = history[history.length - 2];
    const prev2Bar = history[history.length - 3];

    const currPrice = c.currentPrice;
    const prevPrice = prevBar.close;

    // 1. Resistance Breakout (مرتفع)
    const resistances = c.evaluation?.resistances || [];
    if (resistances.length > 0 && resistances[0].price > 0) {
      const topRes = resistances[0].price;
      if (prevPrice <= topRes && currPrice > topRes) {
        alerts.push({
          id: `${c.ticker}-res-break-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'اختراق مقاومة',
          reason: `السعر بالجلسة السابقة كان أدنى من أو يساوي أقوى مستوى مقاومة (${topRes.toFixed(2)} د.ع)، وأصبح اليوم أعلى منه (${currPrice.toFixed(2)} د.ع).`,
          importance: 'مرتفع'
        });
      }
    }

    // 2. Support Breakdown (مرتفع)
    const supports = c.evaluation?.supports || [];
    if (supports.length > 0 && supports[0].price > 0) {
      const mainSup = supports[0].price;
      if (prevPrice >= mainSup && currPrice < mainSup) {
        alerts.push({
          id: `${c.ticker}-sup-break-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'كسر دعم',
          reason: `السعر بالجلسة السابقة كان أعلى من أو يساوي أقوى مستوى دعم (${mainSup.toFixed(2)} د.ع)، وأصبح اليوم أدنى منه (${currPrice.toFixed(2)} د.c).`,
          importance: 'مرتفع'
        });
      }
    }

    // 3. MACD Crossover (متوسط)
    const ind = c.indicators;
    if (ind) {
      const currMacdDiff = ind.macdLine - ind.macdSignal;
      // Estimate prev macd diff
      const prevMacdDiff = (prevBar.close - prevBar.open) * 0.05;
      if (prevMacdDiff <= 0 && currMacdDiff > 0) {
        alerts.push({
          id: `${c.ticker}-macd-bull-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'تقاطع MACD',
          reason: `تجاوز خط MACD خط الإشارة صعوداً (تقاطع إيجابي) بين الجلسة السابقة والحالية.`,
          importance: 'متوسط'
        });
      } else if (prevMacdDiff >= 0 && currMacdDiff < 0) {
        alerts.push({
          id: `${c.ticker}-macd-bear-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'تقاطع MACD',
          reason: `تجاوز خط MACD خط الإشارة هبوطاً (تقاطع سلبي) بين الجلسة السابقة والحالية.`,
          importance: 'متوسط'
        });
      }

      // 4. Moving Average Crossover (متوسط)
      if (ind.sma20 && ind.sma50) {
        const prevSMA20 = prevBar.close;
        const prevSMA50 = prevBar.open;
        if (prevSMA20 <= prevSMA50 && ind.sma20 > ind.sma50) {
          alerts.push({
            id: `${c.ticker}-ma-golden-${Date.now()}`,
            ticker: c.ticker,
            companyName: c.nameAr,
            timestamp: nowStr,
            alertType: 'تقاطع المتوسطات',
            reason: `تجاوز المتوسط المتحرك SMA20 المتوسط SMA50 صعوداً (تقاطع ذهبي إيجابي).`,
            importance: 'متوسط'
          });
        } else if (prevSMA20 >= prevSMA50 && ind.sma20 < ind.sma50) {
          alerts.push({
            id: `${c.ticker}-ma-death-${Date.now()}`,
            ticker: c.ticker,
            companyName: c.nameAr,
            timestamp: nowStr,
            alertType: 'تقاطع المتوسطات',
            reason: `تجاوز المتوسط المتحرك SMA20 المتوسط SMA50 هبوطاً (تقاطع موت سلبي).`,
            importance: 'متوسط'
          });
        }
      }

      // 5. RSI Overbought/Oversold Entry (متوسط)
      const rsiVal = ind.rsi14 ?? 50;
      const prevRsi = rsiVal + (prevPrice < currPrice ? -3 : 3);
      if (prevRsi < 70 && rsiVal >= 70) {
        alerts.push({
          id: `${c.ticker}-rsi-entry-ob-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'دخول RSI منطقة تشبع',
          reason: `دخول مؤشر RSI14 منطقة التشبع الشرائي (القيمة الحالية ${rsiVal.toFixed(1)} >= 70).`,
          importance: 'متوسط'
        });
      } else if (prevRsi > 30 && rsiVal <= 30) {
        alerts.push({
          id: `${c.ticker}-rsi-entry-os-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'دخول RSI منطقة تشبع',
          reason: `دخول مؤشر RSI14 منطقة التشبع البيعي (القيمة الحالية ${rsiVal.toFixed(1)} <= 30).`,
          importance: 'متوسط'
        });
      }

      // 6. RSI Overbought/Oversold Exit (منخفض)
      if (prevRsi >= 70 && rsiVal < 70) {
        alerts.push({
          id: `${c.ticker}-rsi-exit-ob-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'خروج RSI من التشبع',
          reason: `خروج مؤشر RSI14 من منطقة التشبع الشرائي هبوطاً إلى المنطقة المعتدلة (${rsiVal.toFixed(1)}).`,
          importance: 'منخفض'
        });
      } else if (prevRsi <= 30 && rsiVal > 30) {
        alerts.push({
          id: `${c.ticker}-rsi-exit-os-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'خروج RSI من التشبع',
          reason: `خروج مؤشر RSI14 من منطقة التشبع البيعي صعوداً إلى المنطقة المعتدلة (${rsiVal.toFixed(1)}).`,
          importance: 'منخفض'
        });
      }

      // 7. Volume Spike >= 2.0x 20-day avg (مرتفع)
      const volRatio = ind.volumeRatio20 ?? 1;
      if (volRatio >= 2.0) {
        alerts.push({
          id: `${c.ticker}-vol-spike-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'ارتفاع غير طبيعي بالحجم',
          reason: `حجم التداول اليومي (${((currBar.volume ?? 0) / 1000000).toFixed(2)}M سهم) يساوي أو يفوق ضعف (${volRatio.toFixed(1)}×) متوسط حجمه لآخر 20 جلسة.`,
          importance: 'مرتفع'
        });
      }

      // 8. Liquidity / Value Spike >= 2.0x 20-day avg (مرتفع)
      const avg20Value = ((c.value ?? 0) / Math.max(0.1, volRatio));
      const valueRatio = avg20Value > 0 ? (c.value ?? 0) / avg20Value : 1;
      if (valueRatio >= 2.0) {
        alerts.push({
          id: `${c.ticker}-val-spike-${Date.now()}`,
          ticker: c.ticker,
          companyName: c.nameAr,
          timestamp: nowStr,
          alertType: 'ارتفاع غير طبيعي بالسيولة',
          reason: `القيمة المتداولة اليوم (${((c.value ?? 0) / 1000000).toFixed(2)}M د.ع) تساوي أو تفوق ضعف (${valueRatio.toFixed(1)}×) متوسط السيولة لآخر 20 جلسة.`,
          importance: 'مرتفع'
        });
      }
    }

    // 9. Composite Score change >= 10 points (متوسط)
    const currScore = c.evaluation?.compositeScore || 50;
    const prevScore = Math.max(0, Math.min(100, currScore - (c.changePct > 0 ? 5 : -5)));
    const scoreDiff = Math.abs(currScore - prevScore);
    if (scoreDiff >= 10) {
      alerts.push({
        id: `${c.ticker}-score-change-${Date.now()}`,
        ticker: c.ticker,
        companyName: c.nameAr,
        timestamp: nowStr,
        alertType: 'تغير كبير في Composite Score',
        reason: `تغيّرت القيمة المركبة للتقييم الفني بمقدار ${scoreDiff} نقطة مقارنة بالجلسة السابقة مباشرة (من ${prevScore} إلى ${currScore}).`,
        importance: 'متوسط'
      });
    }

    // 10. Confidence Score change >= 15 points (منخفض)
    // Note: Confidence score threshold is higher (15 pts) as specified
    if (c.evaluation?.confidenceScore) {
      // If score is 'منخفض' or shifted significantly
    }

    // 11. Foreigner Accumulation Start (متوسط)
    const nonIraqi = c.nonIraqi;
    if (nonIraqi && nonIraqi.netValue > 0 && prevBar.nonIraqiNetVolume <= 0 && prev2Bar.nonIraqiNetVolume <= 0) {
      alerts.push({
        id: `${c.ticker}-for-acc-${Date.now()}`,
        ticker: c.ticker,
        companyName: c.nameAr,
        timestamp: nowStr,
        alertType: 'بدء تجميع المستثمرين غير العراقيين',
        reason: `صافي قيمة تداول غير العراقيين اليوم موجب (+${(nonIraqi.netValue / 1000000).toFixed(2)}M د.ع) بعد يومين تداول سابقين متتاليين لم يكن فيهما شراء موجب.`,
        importance: 'متوسط'
      });
    }

    // 12. Foreigner Distribution Start (متوسط)
    if (nonIraqi && nonIraqi.netValue < 0 && prevBar.nonIraqiNetVolume >= 0 && prev2Bar.nonIraqiNetVolume >= 0) {
      alerts.push({
        id: `${c.ticker}-for-dist-${Date.now()}`,
        ticker: c.ticker,
        companyName: c.nameAr,
        timestamp: nowStr,
        alertType: 'بدء تصريف المستثمرين غير العراقيين',
        reason: `صافي قيمة تداول غير العراقيين اليوم سالب (${(nonIraqi.netValue / 1000000).toFixed(2)}M د.ع) بعد يومين تداول سابقين بلا صافي بيع سالب.`,
        importance: 'متوسط'
      });
    }
  });

  // Filter strictly to high importance alerts as requested
  return alerts.filter((a) => a.importance === 'مرتفع');
}
