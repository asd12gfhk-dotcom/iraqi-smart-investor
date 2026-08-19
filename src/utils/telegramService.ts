import { AlertRule, ISXCompany } from '../types/isx';

const TELEGRAM_CONFIG_KEY = 'isx_telegram_config';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '8950575791:AAG4lrPJ4isLXueM0MQJ0w-t9CHT6pGgyRw',
  chatId: '5562066694',
  enabled: true
};

export function getTelegramConfig(): TelegramConfig {
  try {
    const raw = localStorage.getItem(TELEGRAM_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || DEFAULT_TELEGRAM_CONFIG.botToken,
        chatId: parsed.chatId || DEFAULT_TELEGRAM_CONFIG.chatId,
        enabled: parsed.enabled !== undefined ? parsed.enabled : true
      };
    }
  } catch (err) {
    console.warn('Error loading Telegram config from localStorage:', err);
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

export function saveTelegramConfig(config: TelegramConfig): void {
  try {
    localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving Telegram config to localStorage:', err);
  }
}

/**
 * Sends a raw text message via Telegram Bot API using fetch
 */
export async function sendTelegramMessage(
  text: string,
  customToken?: string,
  customChatId?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();
  const token = (customToken || config.botToken).trim();
  const chatId = (customChatId || config.chatId).trim();

  if (!token || !chatId) {
    return { success: false, error: 'رمز التوكن (Bot Token) أو المعرف (Chat ID) غير مكتمل.' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || 'فشل إرسال الرسالة من Telegram Bot API' };
    }
  } catch (err: any) {
    console.error('Telegram API fetch error:', err);
    return { success: false, error: err?.message || 'خطأ في الاتصال بخوادم تلغرام' };
  }
}

/**
 * Sends a structured price alert message for a stock
 */
export async function sendStockPriceAlertNotification(
  companyName: string,
  ticker: string,
  currentPrice: number,
  targetPrice: number,
  type: 'PRICE_BELOW' | 'PRICE_ABOVE' | string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const nowStr = new Date().toLocaleString('ar-IQ-u-nu-latn', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isBelow = type === 'PRICE_BELOW' || currentPrice <= targetPrice;
  const conditionLabel = isBelow
    ? '⚠️ <b>وصل السعر إلى الرقم المحدد أو أصبح أقل منه!</b>'
    : '🚀 <b>وصل السعر إلى الرقم المحدد أو تجاوز أعلى منه!</b>';

  const message = `
🚨 <b>تنبيه سعر سهم تلقائي - سوق العراق (ISX)</b> 🚨

🏛️ <b>الشركة:</b> ${companyName} (<code>${ticker}</code>)
💰 <b>السعر الحالي:</b> <code>${currentPrice.toFixed(2)} د.ع</code>
🎯 <b>السعر المستهدف:</b> <code>${targetPrice.toFixed(2)} د.ع</code>

${conditionLabel}
${note ? `📝 <b>ملاحظة:</b> ${note}\n` : ''}
⏰ <b>تاريخ ووقت التنبيه:</b> ${nowStr}
⚡ <i>منصة المستثمر الذكي العراقي - ISX Core V2</i>
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * Test button verification
 */
export async function testTelegramConnection(
  token?: string,
  chatId?: string
): Promise<{ success: boolean; error?: string }> {
  const testMsg = `
✅ <b>اختبار الاتصال ببوت تلغرام بنجاح!</b>
🤖 نظام إشعارات الأسعار لسوق العراق للأوراق المالية (ISX) يعمل وجاهز لاستقبال التنبيهات.
⏰ ${new Date().toLocaleString('ar-IQ-u-nu-latn')}
  `.trim();

  return await sendTelegramMessage(testMsg, token, chatId);
}

/**
 * Evaluates active alert rules against updated company prices and sends Telegram messages when triggered
 */
export async function checkAndTriggerTelegramAlerts(
  companies: ISXCompany[],
  alerts: AlertRule[],
  onUpdateAlerts: (rules: AlertRule[]) => void
): Promise<{ triggeredCount: number; messages: string[] }> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { triggeredCount: 0, messages: [] };
  }

  let updated = false;
  const newAlerts = [...alerts];
  const triggeredMessages: string[] = [];
  let triggeredCount = 0;

  for (let i = 0; i < newAlerts.length; i++) {
    const alert = newAlerts[i];
    if (!alert.isActive || alert.telegramNotified) continue;

    const company = companies.find((c) => c.ticker === alert.ticker);
    if (!company) continue;

    const currPrice = company.currentPrice;
    let isTriggered = false;

    if (alert.type === 'PRICE_BELOW' && currPrice <= alert.targetValue) {
      isTriggered = true;
    } else if (alert.type === 'PRICE_ABOVE' && currPrice >= alert.targetValue) {
      isTriggered = true;
    } else if (alert.type === 'RSI_ABOVE' && company.indicators?.rsi14 >= alert.targetValue) {
      isTriggered = true;
    } else if (alert.type === 'RSI_BELOW' && company.indicators?.rsi14 <= alert.targetValue) {
      isTriggered = true;
    } else if (alert.type === 'SCORE_ABOVE' && company.evaluation?.compositeScore >= alert.targetValue) {
      isTriggered = true;
    }

    if (isTriggered) {
      const res = await sendStockPriceAlertNotification(
        company.nameAr,
        company.ticker,
        currPrice,
        alert.targetValue,
        alert.type,
        alert.note
      );

      if (res.success) {
        newAlerts[i] = {
          ...alert,
          telegramNotified: true,
          triggeredAt: new Date().toISOString()
        };
        updated = true;
        triggeredCount++;
        const msg = `تم إرسال تنبيه تلغرام لسهم ${company.nameAr} (${company.ticker}) - السعر الحالي ${currPrice.toFixed(2)} د.ع`;
        triggeredMessages.push(msg);
      }
    }
  }

  if (updated) {
    onUpdateAlerts(newAlerts);
  }

  // إرسال تنبيهات حركة السعر (الارتفاع +3% فأكثر، والانخفاض -20% فأكثر) تلقائياً
  const largeChangeRes = await checkPriceMovementAlerts(companies);
  triggeredCount += largeChangeRes.count;
  triggeredMessages.push(...largeChangeRes.messages);

  // إرسال تنبيهات محرك القرار التاريخي (BUY/BUY_WATCH/EXIT) مع عدم التكرار
  const historicalRes = await checkAndTriggerHistoricalSignals(companies);
  triggeredCount += historicalRes.count;
  triggeredMessages.push(...historicalRes.messages);

  // إرسال تنبيهات محرك دورات الصعود والتصويت (ISX Surge Cycle Engine)
  const surgeCycleRes = await checkAndTriggerSurgeCycleAlerts(companies);
  triggeredCount += surgeCycleRes.count;
  triggeredMessages.push(...surgeCycleRes.messages);

  return { triggeredCount, messages: triggeredMessages };
}

/**
 * فحص وإرسال تنبيهات محرك دورات الصعود (ISX Surge Cycle Engine) تلقائياً
 */
export async function checkAndTriggerSurgeCycleAlerts(
  companies: ISXCompany[]
): Promise<{ count: number; messages: string[] }> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { count: 0, messages: [] };
  }

  const { runIsxEngine } = await import('./isxEngine');

  const isxHistoryData: Record<string, any[]> = {};
  for (const c of companies) {
    if (c.history && c.history.length > 0) {
      isxHistoryData[c.ticker] = c.history.map((row) => ({
        ...row,
        nameAr: c.nameAr,
        symbol: c.ticker
      }));
    }
  }

  const { alerts } = runIsxEngine(isxHistoryData, {
    threshold: 0.03,
    votesRequired: 2,
    minVolume: 500000 // شرط حجم التداول اليومي في آخر يوم تداول: أكثر من 500,000 سهم
  });

  let count = 0;
  const messages: string[] = [];

  for (const a of alerts) {
    // التأكد من تجاوز شرط حجم التداول اليومي في آخر يوم تداول (أكثر من 500,000 سهم)
    if (a.lastVolume !== undefined && a.lastVolume < 500000) {
      continue;
    }

    const storageKey = `isx_tg_notified_surge_cycle_${a.symbol}_${a.date}`;
    const alreadyNotified = localStorage.getItem(storageKey);

    if (!alreadyNotified) {
      const msgContent = a.message;
      const res = await sendTelegramMessage(msgContent);

      if (res.success) {
        localStorage.setItem(storageKey, 'true');
        count++;
        const alertDesc = `تم إرسال تنبيه دورة الصعود لسهم ${a.symbol} (اتفاق ${a.votesCount}/5 محركات، حجم التداول: ${Math.round(a.lastVolume || 0).toLocaleString()} سهم)`;
        messages.push(alertDesc);
      }
    }
  }

  return { count, messages };
}

/**
 * فحص وإرسال تنبيهات محرك القرار التاريخي (Historical Decision Engine) تلقائياً
 * يضمن منع تكرار التنبيهات باستخدام Signal ID و Cooldown
 */
export async function checkAndTriggerHistoricalSignals(
  companies: ISXCompany[]
): Promise<{ count: number; messages: string[] }> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { count: 0, messages: [] };
  }

  // Import dynamically to avoid circular dependencies if any
  const { evaluateHistoricalDecision, formatTelegramHistoricalSignalMessage } = await import(
    './historicalDecisionEngine'
  );

  let count = 0;
  const messages: string[] = [];

  for (const company of companies) {
    const decision = evaluateHistoricalDecision(company);

    // Only alert on BUY, BUY_WATCH, or EXIT signals
    if (decision.signal === 'BUY' || decision.signal === 'BUY_WATCH' || decision.signal === 'EXIT') {
      const storageKey = `isx_tg_notified_hist_${decision.signalId}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (!alreadyNotified) {
        const msgContent = formatTelegramHistoricalSignalMessage(decision);
        const res = await sendTelegramMessage(msgContent);

        if (res.success) {
          localStorage.setItem(storageKey, 'true');
          count++;
          const alertDesc = `تم إرسال إشعار المحرك التاريخي لسهم ${company.nameAr} (${company.ticker}) - الإشارة [${decision.signalBadgeAr}]`;
          messages.push(alertDesc);
        }
      }
    }
  }

  return { count, messages };
}

/**
 * فحص وإرسال تنبيهات التغير المئوي في الأسعار:
 * - الارتفاع: من +3% أو أكثر
 * - الانخفاض: من -20% أو أكثر
 */
export async function checkPriceMovementAlerts(
  companies: ISXCompany[]
): Promise<{ count: number; messages: string[] }> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { count: 0, messages: [] };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const nowStr = new Date().toLocaleString('ar-IQ-u-nu-latn', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let count = 0;
  const messages: string[] = [];

  for (const company of companies) {
    const prev = company.prevClose > 0 ? company.prevClose : company.open > 0 ? company.open : company.currentPrice;
    const changePct = company.changePct !== undefined && !isNaN(company.changePct) && company.changePct !== 0
      ? company.changePct
      : ((company.currentPrice - prev) / prev) * 100;

    const isGainAlert = changePct >= 3;
    const isDropAlert = changePct <= -20;

    // إرسال التنبيه عند الارتفاع 3% فأكثر أو الانخفاض 20% فأكثر
    if (isGainAlert || isDropAlert) {
      const typeTag = isGainAlert ? 'gain3pct' : 'drop20pct';
      const storageKey = `isx_tg_notified_${typeTag}_${company.ticker}_${todayStr}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (!alreadyNotified) {
        const directionEmoji = isGainAlert ? '🚀' : '📉';
        const directionTitle = isGainAlert
          ? 'صعود سعري إيجابي (+3% فأكثر)'
          : 'هبوط حاد في السعر (-20% فأكثر)';

        const alertHeader = isGainAlert
          ? '🚨 <b>تنبيه ارتفاع سعر السهم (+3% فأكثر) - سوق العراق (ISX)</b> 🚨'
          : '🚨 <b>تنبيه انخفاض سعر السهم (-20% فأكثر) - سوق العراق (ISX)</b> 🚨';

        const msgContent = `
${alertHeader}

🏛️ <b>الشركة:</b> ${company.nameAr} (<code>${company.ticker}</code>)
📊 <b>نسبة التغير:</b> <code>${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%</code>
💰 <b>السعر الحالي:</b> <code>${company.currentPrice.toFixed(2)} د.ع</code>
🏷️ <b>السعر السابق/الأساسي:</b> <code>${prev.toFixed(2)} د.ع</code>
${directionEmoji} <b>طبيعة الحركة:</b> <b>${directionTitle}</b>

⏰ <b>وقت التنبيه:</b> ${nowStr}
⚡ <i>مراقبة آليّة فورية عبر Telegram Bot API - منصة المستثمر الذكي</i>
        `.trim();

        const res = await sendTelegramMessage(msgContent);

        if (res.success) {
          localStorage.setItem(storageKey, 'true');
          count++;
          const alertDesc = `تم إرسال إشعار تلغرام لحركة سهم ${company.nameAr} (${company.ticker}) بنسبة ${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`;
          messages.push(alertDesc);
        }
      }
    }
  }

  return { count, messages };
}

// Export alias for backward compatibility
export const check20PercentChangeAlerts = checkPriceMovementAlerts;

