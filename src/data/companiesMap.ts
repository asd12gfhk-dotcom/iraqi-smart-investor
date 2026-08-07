import companiesJson from './companies.json';

export const COMPANY_NAMES_MAP: Record<string, string> = companiesJson;

export function getCompanyNameAr(ticker: string, fallback?: string): string {
  const upper = ticker.toUpperCase().trim();
  return COMPANY_NAMES_MAP[upper] || fallback || ticker;
}
