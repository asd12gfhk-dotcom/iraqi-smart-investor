import { buildInitialISXDatabase, initialMarketSummary } from '../data/isxInitialData';
import { AlertRule, ISXCompany, MarketSummary, PortfolioItem } from '../types/isx';
import { evaluateStock } from './evaluatorEngine';
import { computeTechnicalIndicators } from './technicalEngine';

const ISX_STORAGE_KEY = 'isx_core_v2_companies_db';
const ISX_MARKET_KEY = 'isx_core_v2_market_summary';
const ISX_WATCHLIST_KEY = 'isx_core_v2_watchlist';
const ISX_PORTFOLIO_KEY = 'isx_core_v2_portfolio';
const ISX_ALERTS_KEY = 'isx_core_v2_alerts';
const ISX_LAST_UPDATE_KEY = 'isx_core_v2_last_update_timestamp';

export function getStoredISXCompanies(): ISXCompany[] {
  try {
    const raw = localStorage.getItem(ISX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // فحص ما إذا كانت البيانات المخزنة سابقاً تحتوي أسعاراً صفرية أو افتراضية 1.0 مجردة
        const zeroOrDefaultCount = parsed.filter(
          (c: any) => !c.currentPrice || c.currentPrice <= 0.05 || (c.currentPrice === 1.0 && (!c.history || c.history.length <= 1))
        ).length;

        if (zeroOrDefaultCount < parsed.length * 0.4) {
          return parsed.map((c: any) => {
            const history = c.history || [];
            const currentPrice = c.currentPrice || (history.length > 0 ? history[history.length - 1].close : 1.0);
            const indicators = computeTechnicalIndicators(history.length > 0 ? history : [{ close: currentPrice, high: currentPrice, low: currentPrice, open: currentPrice, volume: 1, trades: 1, value: currentPrice, date: '2026-01-01' }]);
            const evaluation = evaluateStock(
              currentPrice,
              indicators,
              c.nonIraqi || { netVolume: 0, netValue: 0, buysCount: 0, sellsCount: 0, netDirection: 'محايد' },
              history
            );
            return {
              ...c,
              currentPrice,
              history,
              indicators,
              evaluation
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('Error reading ISX companies from localStorage, using initial dataset:', err);
  }

  // Fallback & initial seed with realistic market dataset
  const initial = buildInitialISXDatabase();
  saveISXCompanies(initial);
  return initial;
}

export function saveISXCompanies(companies: ISXCompany[]) {
  if (!companies || companies.length === 0) return;

  const prepareSlim = (comps: ISXCompany[], maxBars = 35) => {
    return comps.map((c) => {
      const { indicators, evaluation, ...rest } = c;
      const history = rest.history && rest.history.length > maxBars
        ? rest.history.slice(-maxBars)
        : (rest.history || []);
      return {
        ...rest,
        history
      };
    });
  };

  try {
    const slim = prepareSlim(companies, 35);
    localStorage.setItem(ISX_STORAGE_KEY, JSON.stringify(slim));
    localStorage.setItem(ISX_LAST_UPDATE_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('First save attempt failed, trying ultra-slim dataset:', err);
    try {
      const ultraSlim = prepareSlim(companies, 20);
      localStorage.setItem(ISX_STORAGE_KEY, JSON.stringify(ultraSlim));
      localStorage.setItem(ISX_LAST_UPDATE_KEY, new Date().toISOString());
    } catch (e) {
      console.warn('Could not persist ISX database to localStorage due to browser quota limits:', e);
    }
  }
}

export function getStoredMarketSummary(): MarketSummary {
  try {
    const raw = localStorage.getItem(ISX_MARKET_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading market summary from localStorage:', err);
  }
  return initialMarketSummary;
}

export function saveMarketSummary(summary: MarketSummary) {
  try {
    localStorage.setItem(ISX_MARKET_KEY, JSON.stringify(summary));
  } catch (err) {
    console.error('Failed to save market summary:', err);
  }
}

// Watchlist
export function getStoredWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(ISX_WATCHLIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Default watchlist
  }
  return ['BBOB', 'TASC', 'IBSD'];
}

export function saveWatchlist(tickers: string[]) {
  try {
    localStorage.setItem(ISX_WATCHLIST_KEY, JSON.stringify(tickers));
  } catch (err) {
    console.error('Failed to save watchlist:', err);
  }
}

// Portfolio
export function getStoredPortfolio(): PortfolioItem[] {
  try {
    const raw = localStorage.getItem(ISX_PORTFOLIO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Default sample portfolio
  }
  return [
    { id: '1', ticker: 'BBOB', shares: 100000, avgBuyPrice: 4.10, notes: 'تجميع مع تداول غير العراقيين' },
    { id: '2', ticker: 'TASC', shares: 25000, avgBuyPrice: 13.20, notes: 'سهم قيادي توزيعات' },
    { id: '3', ticker: 'IBSD', shares: 50000, avgBuyPrice: 5.30, notes: 'اختراق مقاومة فنية' }
  ];
}

export function savePortfolio(items: PortfolioItem[]) {
  try {
    localStorage.setItem(ISX_PORTFOLIO_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save portfolio:', err);
  }
}

// Alerts
export function getStoredAlerts(): AlertRule[] {
  try {
    const raw = localStorage.getItem(ISX_ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Default sample alert
  }
  return [
    {
      id: 'alt-1',
      ticker: 'BBOB',
      type: 'PRICE_ABOVE',
      targetValue: 4.50,
      isActive: true,
      createdAt: '2026-07-28'
    },
    {
      id: 'alt-2',
      ticker: 'TASC',
      type: 'RSI_ABOVE',
      targetValue: 70,
      isActive: true,
      createdAt: '2026-07-28'
    }
  ];
}

export function saveAlerts(alerts: AlertRule[]) {
  try {
    localStorage.setItem(ISX_ALERTS_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to save alerts:', err);
  }
}

export function getLastUpdateTimestamp(): string {
  return localStorage.getItem(ISX_LAST_UPDATE_KEY) || new Date().toISOString();
}

/**
 * Re-evaluate stock indicators and evaluation without adding fake synthetic prices
 */
export function triggerManualSessionUpdate(companies: ISXCompany[]): ISXCompany[] {
  const updated = companies.map((c) => {
    const history = c.history || [];
    const indicators = computeTechnicalIndicators(history);
    const evaluation = evaluateStock(
      c.currentPrice,
      indicators,
      c.nonIraqi,
      history
    );
    return {
      ...c,
      indicators,
      evaluation
    };
  });

  saveISXCompanies(updated);
  return updated;
}

export function resetDatabaseToDefaults(): ISXCompany[] {
  try {
    localStorage.removeItem(ISX_STORAGE_KEY);
    localStorage.removeItem(ISX_MARKET_KEY);
    localStorage.removeItem(ISX_LAST_UPDATE_KEY);
  } catch (e) {
    console.error('Error clearing localStorage keys:', e);
  }
  const fresh = buildInitialISXDatabase();
  return fresh;
}
