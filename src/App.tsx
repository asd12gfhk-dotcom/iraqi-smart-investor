import React, { useState, useEffect } from 'react';
import { Sparkles, X, Bell } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MarketOverview } from './components/MarketOverview';
import { AllCompaniesTable } from './components/AllCompaniesTable';
import { TechnicalAnalysisModule } from './components/TechnicalAnalysisModule';
import { StockScreener } from './components/StockScreener';
import { StockComparison } from './components/StockComparison';
import { TopOpportunities } from './components/TopOpportunities';
import { TechnicalAlertsModule } from './components/TechnicalAlertsModule';
import { SectorAnalysis } from './components/SectorAnalysis';
import { WeakeningStocks } from './components/WeakeningStocks';
import { SeasonalCalendar } from './components/SeasonalCalendar';
import { WatchlistAndAlerts } from './components/WatchlistAndAlerts';
import { ReportsModule } from './components/ReportsModule';
import { ProfitCalculator } from './components/ProfitCalculator';
import { SurgeCycleModule } from './components/SurgeCycleModule';
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
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('isx_active_tab') || 'overview';
  });
  const [selectedTicker, setSelectedTicker] = useState<string>(() => {
    return localStorage.getItem('isx_selected_ticker') || 'BBOB';
  });
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toISOString());
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(getAppPreferences().theme);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const isPopStateRef = React.useRef(false);
  const initialSavedTab = localStorage.getItem('isx_active_tab') || 'overview';
  const initialSavedTicker = localStorage.getItem('isx_selected_ticker') || 'BBOB';
  const navStackRef = React.useRef<{ tab: string; ticker: string }[]>([{ tab: initialSavedTab, ticker: initialSavedTicker }]);

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
    const savedTab = localStorage.getItem('isx_active_tab') || 'overview';
    const savedTicker = localStorage.getItem('isx_selected_ticker') || 'BBOB';

    // Replace initial state and push a buffer state so pressing back on phone NEVER exits the application
    window.history.replaceState({ tab: savedTab, ticker: savedTicker, isRoot: true }, '');
    window.history.pushState({ tab: savedTab, ticker: savedTicker, depth: 1 }, '');

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;

      // 1. Dispatch custom back event so open modals/popups can close
      window.dispatchEvent(new Event('app-back-pressed'));

      const stack = navStackRef.current;
      const currentTop = stack[stack.length - 1];

      // 2. If popped state matches the current top of tab stack, we popped an overlay/modal state!
      if (
        event.state &&
        currentTop &&
        event.state.tab === currentTop.tab
      ) {
        setTimeout(() => {
          isPopStateRef.current = false;
        }, 50);
        return;
      }

      // 3. Tab history navigation
      if (stack.length > 1) {
        stack.pop(); // remove current view
        const prev = stack[stack.length - 1] || { tab: savedTab, ticker: savedTicker };
        setActiveTab(prev.tab);
        setSelectedTicker(prev.ticker);
        localStorage.setItem('isx_active_tab', prev.tab);
        localStorage.setItem('isx_selected_ticker', prev.ticker);

        // Buffer re-push if at bottom of browser history
        if (!event.state || event.state.isRoot) {
          window.history.pushState({ tab: prev.tab, ticker: prev.ticker, depth: stack.length }, '');
        }
      } else {
        // We are at root screen saved tab
        const currentTab = localStorage.getItem('isx_active_tab') || 'overview';
        const currentTicker = localStorage.getItem('isx_selected_ticker') || 'BBOB';
        setActiveTab(currentTab);
        // ALWAYS re-push buffer state so hardware back button NEVER exits the web app!
        window.history.pushState({ tab: currentTab, ticker: currentTicker, isBuffer: true }, '');
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

  // Initialize data strictly from local storage on mount (No auto-fetch on entry)
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
  }, []);

  // Handle explicit manual update trigger via refresh icon/button
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
        const nowTimestamp = new Date().toISOString();
        setLastUpdatedTime(nowTimestamp);
        showToast(`تم تحديث البيانات المباشرة لـ ${liveCompanies.length} شركة وتخزينها محلياً بنجاح!`);
        await checkAndTriggerTelegramAlerts(liveCompanies, alerts, handleUpdateAlerts);
      } else {
        const updated = triggerManualSessionUpdate(companies);
        setCompanies(updated);
        const nowTimestamp = new Date().toISOString();
        setLastUpdatedTime(nowTimestamp);
        showToast('تمت إعادة تقييم وتخزين البيانات المحلية بنجاح.');
        await checkAndTriggerTelegramAlerts(updated, alerts, handleUpdateAlerts);
      }
    } catch (err) {
      console.error('Manual update error:', err);
      const updated = triggerManualSessionUpdate(companies);
      setCompanies(updated);
      const nowTimestamp = new Date().toISOString();
      setLastUpdatedTime(nowTimestamp);
      showToast('تعذر الاتصال بالخادم المباشر، تم الاعتماد على البيانات المخزنة وتحديث مؤشراتها.');
      await checkAndTriggerTelegramAlerts(updated, alerts, handleUpdateAlerts);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle tab change with browser history push & localStorage state persistence
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    localStorage.setItem('isx_active_tab', newTab);
    if (!isPopStateRef.current) {
      navStackRef.current.push({ tab: newTab, ticker: selectedTicker });
      window.history.pushState({ tab: newTab, ticker: selectedTicker, depth: navStackRef.current.length }, '');
    }
  };

  // Handle ticker change
  const handleTickerChange = (newTicker: string) => {
    setSelectedTicker(newTicker);
    localStorage.setItem('isx_selected_ticker', newTicker);
  };

  // Quick select stock & switch to technical analysis tab with history push
  const handleSelectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    localStorage.setItem('isx_selected_ticker', ticker);
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

        {activeTab === 'surge_cycle' && (
          <SurgeCycleModule
            companies={companies}
            onSelectStock={handleSelectStock}
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

        {activeTab === 'alerts' && (
          <TechnicalAlertsModule
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
