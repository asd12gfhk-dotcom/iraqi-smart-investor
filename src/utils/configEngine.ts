import {
  IndicatorSettings,
  AlertsGlobalSettings,
  AppGeneralPreferences,
  SystemBackupPackage
} from '../types/settings';
import {
  getStoredWatchlist,
  saveWatchlist,
  getStoredPortfolio,
  savePortfolio,
  getStoredAlerts,
  saveAlerts,
  getStoredISXCompanies,
  saveISXCompanies
} from './dataStore';

const INDICATOR_SETTINGS_KEY = 'isx_core_v2_indicator_settings';
const ALERTS_SETTINGS_KEY = 'isx_core_v2_alerts_global_settings';
const APP_PREFERENCES_KEY = 'isx_core_v2_app_preferences';

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  emaShort: 20,
  emaLong: 50,
  smaShort: 50,
  smaLong: 200,
  atrPeriod: 14,
  bbPeriod: 20,
  bbStdDev: 2,
  adxPeriod: 14
};

export const DEFAULT_ALERTS_SETTINGS: AlertsGlobalSettings = {
  trendAlertsEnabled: true,
  volumeAlertsEnabled: true,
  liquidityAlertsEnabled: true,
  nonIraqiAlertsEnabled: true,
  compositeScoreAlertsEnabled: true
};

export const DEFAULT_APP_PREFERENCES: AppGeneralPreferences = {
  language: 'ar',
  theme: 'light',
  fontSize: 'normal',
  lastViewedTicker: 'BBOB',
  lastActiveTab: 'overview'
};

// --- Indicator Settings ---
export function getIndicatorSettings(): IndicatorSettings {
  try {
    const raw = localStorage.getItem(INDICATOR_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_INDICATOR_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse indicator settings from localStorage:', err);
  }
  return { ...DEFAULT_INDICATOR_SETTINGS };
}

export function saveIndicatorSettings(settings: IndicatorSettings) {
  try {
    localStorage.setItem(INDICATOR_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save indicator settings:', err);
  }
}

export function resetIndicatorSettingsToDefaults(): IndicatorSettings {
  saveIndicatorSettings(DEFAULT_INDICATOR_SETTINGS);
  return { ...DEFAULT_INDICATOR_SETTINGS };
}

// --- Alerts Global Settings ---
export function getAlertsGlobalSettings(): AlertsGlobalSettings {
  try {
    const raw = localStorage.getItem(ALERTS_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ALERTS_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse alerts settings from localStorage:', err);
  }
  return { ...DEFAULT_ALERTS_SETTINGS };
}

export function saveAlertsGlobalSettings(settings: AlertsGlobalSettings) {
  try {
    localStorage.setItem(ALERTS_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save alerts settings:', err);
  }
}

// --- App Preferences ---
export function getAppPreferences(): AppGeneralPreferences {
  try {
    const raw = localStorage.getItem(APP_PREFERENCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_APP_PREFERENCES, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse app preferences from localStorage:', err);
  }
  return { ...DEFAULT_APP_PREFERENCES };
}

export function saveAppPreferences(prefs: AppGeneralPreferences) {
  try {
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save app preferences:', err);
  }
}

// --- System Backup & Restore ---
export function generateSystemBackupPackage(): SystemBackupPackage {
  return {
    version: '2.0',
    appName: 'منصة المستثمر الذكي العراقي',
    exportDate: new Date().toISOString(),
    indicatorSettings: getIndicatorSettings(),
    alertsGlobalSettings: getAlertsGlobalSettings(),
    appGeneralPreferences: getAppPreferences(),
    watchlist: getStoredWatchlist(),
    portfolio: getStoredPortfolio(),
    alertsRules: getStoredAlerts()
  };
}

export function exportSystemBackupToFile() {
  const pkg = generateSystemBackupPackage();
  const jsonStr = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `isx_smart_investor_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function restoreSystemBackupFromJSON(jsonString: string): { success: boolean; message: string } {
  try {
    const pkg: SystemBackupPackage = JSON.parse(jsonString);
    if (!pkg || typeof pkg !== 'object') {
      return { success: false, message: 'ملف التنسيق غير صالح.' };
    }

    if (pkg.indicatorSettings) saveIndicatorSettings(pkg.indicatorSettings);
    if (pkg.alertsGlobalSettings) saveAlertsGlobalSettings(pkg.alertsGlobalSettings);
    if (pkg.appGeneralPreferences) saveAppPreferences(pkg.appGeneralPreferences);
    if (Array.isArray(pkg.watchlist)) saveWatchlist(pkg.watchlist);
    if (Array.isArray(pkg.portfolio)) savePortfolio(pkg.portfolio);
    if (Array.isArray(pkg.alertsRules)) saveAlerts(pkg.alertsRules);

    return {
      success: true,
      message: 'تم استعادة كافة الإعدادات والمفضلة وقائمة المراقبة وقواعد التنبيهات بنجاح!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'فشل استعادة الملف: ' + (err?.message || 'تنسيق JSON غير صحيح')
    };
  }
}
