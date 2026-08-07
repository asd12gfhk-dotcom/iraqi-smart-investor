export interface IndicatorSettings {
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  emaShort: number;
  emaLong: number;
  smaShort: number;
  smaLong: number;
  atrPeriod: number;
  bbPeriod: number;
  bbStdDev: number;
  adxPeriod: number;
}

export interface AlertsGlobalSettings {
  trendAlertsEnabled: boolean;
  volumeAlertsEnabled: boolean;
  liquidityAlertsEnabled: boolean;
  nonIraqiAlertsEnabled: boolean;
  compositeScoreAlertsEnabled: boolean;
}

export interface AppGeneralPreferences {
  language: 'ar';
  theme: 'light' | 'dark' | 'system';
  fontSize: 'normal' | 'medium' | 'large';
  lastViewedTicker?: string;
  lastActiveTab?: string;
}

export interface SystemBackupPackage {
  version: string;
  appName: string;
  exportDate: string;
  indicatorSettings: IndicatorSettings;
  alertsGlobalSettings: AlertsGlobalSettings;
  appGeneralPreferences: AppGeneralPreferences;
  watchlist: string[];
  portfolio: any[];
  alertsRules: any[];
}
