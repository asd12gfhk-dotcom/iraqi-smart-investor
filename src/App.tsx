import React, { useState, useEffect } from 'react';
import { Sparkles, X, Bell } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MarketOverview } from './components/MarketOverview';
import { AllCompaniesTable } from './components/AllCompaniesTable';
import { TechnicalAnalysisModule } from './components/TechnicalAnalysisModule';
import { StockScreener } from './components/StockScreener';
import { StockComparison } from './components/StockComparison';
import { TopOpportunities } from './components/TopOpportunities';
import { SectorAnalysis } from './components/SectorAnalysis';
import { WeakeningStocks } from './components/WeakeningStocks';
import { SeasonalCalendar } from './components/SeasonalCalendar';
import { WatchlistAndAlerts } from './components/WatchlistAndAlerts';
import { ReportsModule } from './components/ReportsModule';
import { ProfitCalculator } from './components/ProfitCalculator';
import { DataManager } from './components/DataManager';
import { SettingsModule } from './components/SettingsModule';

import {
  getStoredISXCompanies,
  saveISXCompanies,
  getStoredMarketSummary,
  saveMarketSummary,
  getStoredWatchlist,
  saveWatchlist,
  getStoredPortfolio,
  savePortfolio,
  getStoredAlerts,
  saveAlerts,
  getLastUpdateTimestamp,
  triggerManualSessionUpdate
} from './utils/dataStore';
import { runDataEnginePipeline } from './utils/dataEngine';
import { getAppPreferences } from './utils/configEngine';
import { checkAndTriggerTelegramAlerts } from './utils/telegramService';

import { ISXCompany, MarketSummary, PortfolioItem, AlertRule } from './types/isx';

export default function App() {
  const [companies, setCompanies] = useState<ISXCompany[]>([]);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedTicker, setSelectedTicker] = useState<string>('BBOB');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toISOString());
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(getAppPreferences().theme);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const isPopStateRef = React.useRef(false);
  const navStackRef = React.useRef<{ tab: string; ticker: string }[]>([{ tab: 'overview', ticker: 'BBOB' }]);

  // مراقبة حالة اتصال الإنترنت وتشغيل فحص التنبيهات تلقائياً عند عودة الاتصال
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToast('📶 عاد اتصال الإنترنت! جاري فحص أسعار الأسهم وإرسال التنبيهات المستهدفة عبر Telegram Bot API...');

      try {
        // إعادة تحديث تقييم الأسعار وتطبيق شروط التنبيهات فور عودة الإنترنت
        const loadedAlerts = getStoredAlerts();
        const currentComps = companies.length > 0 ? companies : getStoredISXCompanies();
        
        const res = await checkAndTriggerTelegramAlerts(currentComps, loadedAlerts, handleUpdateAlerts);
        if (res.triggeredCount > 0) {
          showToast(`📲 تم إرسال ${res.triggeredCount} تنبيه لسعر سهم عبر Telegram Bot API بنجاح!`);
        }
      } catch (err) {
        console.error('Error auto-checking Telegram alerts on network restore:', err);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚠️ انقطع اتصال الإنترنت. ستعمل المنصة بالبيانات المحلية المحفوظة مؤقتاً.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [companies]);


  // Initialize history state on mount & listen to browser back/forward navigation
  useEffect(() => {
    // Replace initial state and push a buffer state so pressing back on phone NEVER exits the application
    window.history.replaceState({ tab: 'overview', ticker: 'BBOB', isRoot: true }, '');
    window.history.pushState({ tab: 'overview', ticker: 'BBOB', depth: 1 }, '');

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;

      // 1. Dispatch custom back event so open modals/popups can close
      window.dispatchEvent(new Event('app-back-pressed'));

      // 2. If popped state was specifically a modal state, do not pop tab navigation
      if (event.state && event.state.modalOpen) {
        setTimeout(() => {
          isPopStateRef.current = false;
        }, 50);
        return;
      }

      // 3. Tab history navigation
      const stack = navStackRef.current;
      if (stack.length > 1) {
        stack.pop(); // remove current view
        const prev = stack[stack.length - 1] || { tab: 'overview', ticker: 'BBOB' };
        setActiveTab(prev.tab);
        setSelectedTicker(prev.ticker);

        // Buffer re-push if at bottom of browser history
        if (!event.state || event.state.isRoot) {
          window.history.pushState({ tab: prev.tab, ticker: prev.ticker, depth: stack.length }, '');
        }
      } else {
        // We are at root screen ('overview')
        setActiveTab('overview');
        // ALWAYS re-push buffer state so hardware back button NEVER exits the web app!
        window.history.pushState({ tab: 'overview', ticker: 'BBOB', isBuffer: true }, '');
      }

      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync dark theme class on document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Helper to show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Initialize data from local storage & auto-sync live endpoints on mount
  useEffect(() => {
    const loadedCompanies = getStoredISXCompanies();
    const loadedMarket = getStoredMarketSummary();
    const loadedWatchlist = getStoredWatchlist();
    const loadedPortfolio = getStoredPortfolio();
    const loadedAlerts = getStoredAlerts();

    setCompanies(loadedCompanies);
    setMarketSummary(loadedMarket);
    setWatchlist(loadedWatchlist);
    setPortfolio(loadedPortfolio);
    setAlerts(loadedAlerts);
    setLastUpdatedTime(getLastUpdateTimestamp());

    // Auto-fetch live market data pipeline from official raw endpoints
    setIsRefreshing(true);
    runDataEnginePipeline()
      .then(async ({ companies: liveCompanies, marketSummary: liveMarket }) => {
        if (liveCompanies && liveCompanies.length > 0) {
          saveISXCompanies(liveCompanies);
          setCompanies(liveCompanies);
          if (liveMarket) {
            saveMarketSummary(liveMarket);
            setMarketSummary(liveMarket);
          }
          setLastUpdatedTime(new Date().toISOString());
          await checkAndTriggerTelegramAlerts(liveCompanies, loadedAlerts, handleUpdateAlerts);
        }
      })
      .catch((err) => {
        console.warn('Auto live data sync failed, using stored local dataset:', err);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  // Handle explicit manual update trigger
  const handleManualUpdate = async () => {
    setIsRefreshing(true);
    try {
      const { companies: liveCompanies, marketSummary: liveMarket } = await runDataEnginePipeline();
      if (liveCompanies && liveCompanies.length > 0) {
        saveISXCompanies(liveCompanies);
        setCompanies(liveCompanies);
        if (liveMarket) {
          saveMarketSummary(liveMarket);
          setMarketSummary(liveMarket);
        }
        showToast(`تم تحديث البيانات المباشرة لـ ${liveCompanies.length} شركة بنجاح من المصادر الرسمية!`);
        await checkAndTriggerTelegramAlerts(liveCompanies, alerts, handleUpdateAlerts);
      } else {
        const updated = triggerManualSessionUpdate(companies);
        setCompanies(updated);
        showToast('تمت إعادة تقييم البيانات المحلية بنجاح.');
        await checkAndTriggerTelegramAlerts(updated, alerts, handleUpdateAlerts);
      }
    } catch (err) {
      console.error('Manual update error:', err);
      const updated = triggerManualSessionUpdate(companies);
      setCompanies(updated);
      showToast('تعذر الجلب المباشر، تم تحديث التقييم المحلي.');
      await checkAndTriggerTelegramAlerts(updated, alerts, handleUpdateAlerts);
    } finally {
      setIsRefreshing(false);
      setLastUpdatedTime(new Date().toISOString());
    }
  };

  // Handle tab change with browser history push
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (!isPopStateRef.current) {
      navStackRef.current.push({ tab: newTab, ticker: selectedTicker });
      window.history.pushState({ tab: newTab, ticker: selectedTicker, depth: navStackRef.current.length }, '');
    }
  };

  // Handle ticker change
  const handleTickerChange = (newTicker: string) => {
    setSelectedTicker(newTicker);
  };

  // Quick select stock & switch to technical analysis tab with history push
  const handleSelectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    if (activeTab !== 'analysis') {
      handleTabChange('analysis');
    }
  };

  const handleUpdateWatchlist = (tickers: string[]) => {
    setWatchlist(tickers);
    saveWatchlist(tickers);
  };

  const handleToggleWatchlist = (ticker: string) => {
    const newW = watchlist.includes(ticker)
      ? watchlist.filter((t) => t !== ticker)
      : [...watchlist, ticker];
    setWatchlist(newW);
    saveWatchlist(newW);
  };

  const handleUpdatePortfolio = (items: PortfolioItem[]) => {
    setPortfolio(items);
    savePortfolio(items);
  };

  const handleUpdateAlerts = (rules: AlertRule[]) => {
    setAlerts(rules);
    saveAlerts(rules);
  };

  if (!marketSummary || companies.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-amber-700 font-bold text-sm">
        جاري تحميل محرك البيانات الفنية لسوق العراق...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col">
      {/* Toast Notification Banner - Compact with Close (X) Icon */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm w-full bg-zinc-900/95 text-white backdrop-blur-md font-sans text-xs p-3.5 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center justify-between gap-3 dir-rtl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="font-medium text-zinc-100 text-xs leading-snug line-clamp-2">
              {toastMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navbar & Ticker Header */}
      <Navbar
        companies={companies}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onManualUpdate={handleManualUpdate}
        lastUpdatedTime={lastUpdatedTime}
        isRefreshing={isRefreshing}
        selectedTicker={selectedTicker}
        onSelectTicker={handleTickerChange}
        alerts={alerts}
        onUpdateAlerts={handleUpdateAlerts}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <MarketOverview
            companies={companies}
            summary={marketSummary}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'all_companies' && (
          <AllCompaniesTable
            companies={companies}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'analysis' && (
          <TechnicalAnalysisModule
            companies={companies}
            selectedTicker={selectedTicker}
            onSelectTicker={handleTickerChange}
            alerts={alerts}
            onUpdateAlerts={handleUpdateAlerts}
          />
        )}

        {activeTab === 'screener' && (
          <StockScreener
            companies={companies}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'comparison' && (
          <StockComparison companies={companies} />
        )}

        {activeTab === 'opportunities' && (
          <TopOpportunities
            companies={companies}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'sectors' && (
          <SectorAnalysis
            companies={companies}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'weakening' && (
          <WeakeningStocks
            companies={companies}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'calendar' && <SeasonalCalendar companies={companies} />}

        {activeTab === 'watchlist' && (
          <WatchlistAndAlerts
            companies={companies}
            watchlistTickers={watchlist}
            onUpdateWatchlist={handleUpdateWatchlist}
            portfolio={portfolio}
            onUpdatePortfolio={handleUpdatePortfolio}
            alerts={alerts}
            onUpdateAlerts={handleUpdateAlerts}
            onSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsModule
            companies={companies}
            selectedTicker={selectedTicker}
            summary={marketSummary}
            portfolio={portfolio}
          />
        )}

        {activeTab === 'calculator' && <ProfitCalculator />}

        {activeTab === 'data' && (
          <DataManager
            companies={companies}
            onUpdateCompanies={setCompanies}
            onManualUpdate={handleManualUpdate}
            lastUpdatedTime={lastUpdatedTime}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModule
            companies={companies}
            onUpdateCompanies={setCompanies}
            onThemeChange={setTheme}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 mt-auto text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            منصة المستثمر الذكي العراقي (Core V2) &copy; {new Date().getFullYear()} - التحليل الفني الرقمي لسوق العراق للأوراق المالية (ISX)
          </div>
          <div className="text-zinc-600 font-mono text-[11px]">
            محرك تقييم حتمي | بدون أخبار | تخزين محلي دائم
          </div>
        </div>
      </footer>
    </div>
  );
}
