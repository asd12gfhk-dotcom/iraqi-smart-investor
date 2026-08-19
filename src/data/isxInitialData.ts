import { ISXCompany, ISXSector, MarketSummary, DailyBar } from '../types/isx';
import { evaluateStock } from '../utils/evaluatorEngine';
import { computeTechnicalIndicators } from '../utils/technicalEngine';
import { COMPANY_NAMES_MAP } from './companiesMap';
import { getTickerBasePrice } from '../utils/dataEngine';

function getSectorForTicker(ticker: string): ISXSector {
  const upper = ticker.toUpperCase().trim();
  if (upper.startsWith('B')) return 'المصارف';
  if (upper.startsWith('H')) return 'الفنادق والسياحة';
  if (upper.startsWith('I')) return 'الصناعة';
  if (upper.startsWith('A') || upper.startsWith('S')) return 'الزراعة';
  if (upper.startsWith('N')) return 'الخدمات';
  if (upper === 'TASC' || upper === 'TZNI') return 'الاتصالات';
  return 'الخدمات';
}

export function buildInitialISXDatabase(): ISXCompany[] {
  const tickers = Object.keys(COMPANY_NAMES_MAP);

  return tickers.map((ticker) => {
    const nameAr = COMPANY_NAMES_MAP[ticker];
    const sector = getSectorForTicker(ticker);
    const basePrice = getTickerBasePrice(ticker);

    // إنشاء سلسلة تاريخية لآخر 30 يوماً بأسعار واقعية وحركة منطقية
    const history: DailyBar[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // تموجات سعرية طفيفة حول السعر المرجعي
      const wave = Math.sin((30 - i) * 0.4) * 0.035 + (i % 3 === 0 ? 0.015 : -0.01);
      const close = Number(Math.max(0.05, basePrice * (1 + wave)).toFixed(2));
      const open = Number(Math.max(0.05, close * (1 + (i % 2 === 0 ? -0.008 : 0.008))).toFixed(2));
      const high = Number(Math.max(open, close) * 1.012).toFixed(2);
      const low = Number(Math.min(open, close) * 0.988).toFixed(2);

      let hash = 0;
      for (let k = 0; k < ticker.length; k++) hash = (hash << 5) - hash + ticker.charCodeAt(k);
      const volume = Math.round(80000 + (Math.abs(hash + i * 17) % 500000));
      const value = Math.round(volume * close);
      const trades = Math.round(12 + (volume / 18000));
      const nonIraqiNetVolume = Math.round((hash % 2 === 0 ? 1 : -1) * (volume * 0.06));

      history.push({
        date: dateStr,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close,
        volume,
        value,
        trades,
        nonIraqiNetVolume
      });
    }

    const latest = history[history.length - 1];
    const prev = history[history.length - 2] || latest;

    const change = Number((latest.close - prev.close).toFixed(2));
    const changePct = Number(((change / Math.max(0.01, prev.close)) * 100).toFixed(2));

    const totalBuyVol = Math.round(latest.volume * 0.08);
    const totalSellVol = Math.round(latest.volume * 0.04);
    const netVol = totalBuyVol - totalSellVol;
    const netVal = Math.round(netVol * latest.close);

    const nonIraqi = {
      buyVolume: totalBuyVol,
      sellVolume: totalSellVol,
      netVolume: netVol,
      buyValue: Math.round(totalBuyVol * latest.close),
      sellValue: Math.round(totalSellVol * latest.close),
      netValue: netVal,
      accumulationTrend: netVal > 5000000 ? ('تجميع خفيف' as const) : netVal < -5000000 ? ('تصريف خفيف' as const) : ('محايد' as const),
      alignmentWithPrice: netVal >= 0 ? ('متوافق إيجابياً' as const) : ('انحراف سلبي' as const),
      influenceScore: Math.min(100, Math.max(10, Math.round(50 + (netVal / 20000000) * 50)))
    };

    const indicators = computeTechnicalIndicators(history);
    const evaluation = evaluateStock(latest.close, indicators, nonIraqi, history);

    return {
      ticker,
      nameAr,
      nameEn: ticker,
      sector,
      status: 'متداولة',
      currentPrice: latest.close,
      prevClose: prev.close,
      change,
      changePct,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      avgPrice: latest.close,
      volume: latest.volume,
      value: latest.value,
      tradesCount: latest.trades,
      marketCap: Math.round(latest.close * 250000000000),
      sharesTotal: 250000000000,
      nonIraqi,
      history,
      indicators,
      evaluation
    };
  });
}

export const initialMarketSummary: MarketSummary = {
  tradingDate: new Date().toISOString().split('T')[0],
  isx60: {
    indexName: 'مؤشر ISX60 العام',
    currentValue: 942.85,
    prevValue: 938.10,
    change: 4.75,
    changePct: 0.51,
    history: [
      { date: '2026-07-23', value: 932.10 },
      { date: '2026-07-24', value: 934.50 },
      { date: '2026-07-27', value: 936.80 },
      { date: '2026-07-28', value: 938.10 },
      { date: '2026-07-29', value: 942.85 }
    ]
  },
  isx15: {
    indexName: 'مؤشر ISX15 للشركات القيادية',
    currentValue: 1085.40,
    prevValue: 1078.20,
    change: 7.20,
    changePct: 0.67,
    history: [
      { date: '2026-07-23', value: 1068.00 },
      { date: '2026-07-24', value: 1072.10 },
      { date: '2026-07-27', value: 1075.50 },
      { date: '2026-07-28', value: 1078.20 },
      { date: '2026-07-29', value: 1085.40 }
    ]
  },
  totalVolume: 82500000,
  totalValue: 345000000,
  totalTrades: 1240,
  advancersCount: 0,
  declinersCount: 0,
  unchangedCount: 0,
  tradedCompaniesCount: 0,
  foreignerNetBuyTotalValue: 0
};
