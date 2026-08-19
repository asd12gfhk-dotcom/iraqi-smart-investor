import React, { useState } from 'react';
import { Search, ArrowUpDown, Star, Building2, Filter } from 'lucide-react';
import { ISXCompany } from '../types/isx';

interface AllCompaniesTableProps {
  companies: ISXCompany[];
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
}

type SortField =
  | 'starred'
  | 'ticker'
  | 'name'
  | 'price'
  | 'change'
  | 'score'
  | 'trades'
  | 'value'
  | 'date';

export const AllCompaniesTable: React.FC<AllCompaniesTableProps> = ({
  companies,
  watchlist = [],
  onToggleWatchlist,
  onSelectStock
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('ticker');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Toggle sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For starred, default to false so starred (1) appears at top
      setSortAsc(field === 'name' || field === 'ticker');
    }
  };

  // Filter companies
  const filtered = companies.filter((c) => {
    if (starredOnly && !watchlist.includes(c.ticker)) return false;
    if (selectedSector !== 'ALL' && c.sector !== selectedSector) return false;
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      const match =
        c.ticker.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort companies
  const sorted = [...filtered].sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;

    switch (sortField) {
      case 'starred':
        valA = watchlist.includes(a.ticker) ? 1 : 0;
        valB = watchlist.includes(b.ticker) ? 1 : 0;
        break;
      case 'ticker':
        valA = a.ticker;
        valB = b.ticker;
        break;
      case 'name':
        valA = a.nameAr;
        valB = b.nameAr;
        break;
      case 'price':
        valA = a.currentPrice ?? 0;
        valB = b.currentPrice ?? 0;
        break;
      case 'change':
        valA = a.changePct ?? 0;
        valB = b.changePct ?? 0;
        break;
      case 'score':
        valA = a.evaluation?.compositeScore ?? 0;
        valB = b.evaluation?.compositeScore ?? 0;
        break;
      case 'trades':
        valA = a.tradesCount ?? 0;
        valB = b.tradesCount ?? 0;
        break;
      case 'value':
        valA = a.value ?? 0;
        valB = b.value ?? 0;
        break;
      case 'date':
        valA = a.history && a.history.length > 0 ? a.history[a.history.length - 1].date : '';
        valB = b.history && b.history.length > 0 ? b.history[b.history.length - 1].date : '';
        break;
      default:
        valA = a.ticker;
        valB = b.ticker;
    }

    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB, 'ar') : valB.localeCompare(valA, 'ar');
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  // Format Date DD/MM/YYYY
  const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Check if trading date is recent (within ~60 days of 2026-08-01)
  const isRecentDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date('2026-08-01');
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 60;
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Counter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن اسم الشركة أو الرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Sector Selector */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="ALL">جميع القطاعات ({companies.length})</option>
              <option value="المصارف">المصارف</option>
              <option value="الاتصالات">الاتصالات</option>
              <option value="الصناعة">الصناعة</option>
              <option value="الخدمات">الخدمات</option>
              <option value="الزراعة">الزراعة</option>
              <option value="الفنادق والسياحة">الفنادق والسياحة</option>
              <option value="الاستثمار">الاستثمار</option>
              <option value="العقارات">العقارات</option>
            </select>
          </div>

          {/* Star / Watchlist Filter Button */}
          <button
            type="button"
            onClick={() => setStarredOnly(!starredOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              starredOnly
                ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
            title="تصفية وعرض الأسهم المميزة بالنجمة فقط"
          >
            <Star className={`w-3.5 h-3.5 ${starredOnly ? 'fill-zinc-950 text-zinc-950' : 'fill-amber-400 text-amber-500'}`} />
            <span>المفضلة بالنجمة ({watchlist.length})</span>
          </button>
        </div>

        {/* Counter Badge */}
        <div className="text-xs font-bold text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200 text-center self-start sm:self-center">
          عرض <span className="text-amber-700 font-mono text-sm">{sorted.length}</span> شركة من أصل <span className="font-mono">{companies.length}</span>
        </div>
      </div>

      {/* Main Companies Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[78vh] overflow-y-auto relative">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold whitespace-nowrap sticky top-0 z-20 shadow-sm">
              <tr>
                <th
                  onClick={() => handleSort('starred')}
                  className={`py-3.5 px-3 w-12 text-center sticky top-0 z-20 cursor-pointer transition-colors select-none ${
                    sortField === 'starred' ? 'bg-amber-100 text-amber-950' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                  title="ترتيب وتصفية حسب النجمة (المفضلة)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className={`w-4 h-4 ${sortField === 'starred' ? 'fill-amber-500 text-amber-500' : 'text-zinc-500'}`} />
                    <ArrowUpDown className={`w-2.5 h-2.5 ${sortField === 'starred' ? 'text-amber-700 font-bold' : 'text-zinc-400'}`} />
                  </div>
                </th>
                
                <th
                  onClick={() => handleSort('ticker')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1">
                    <span>الرمز</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'ticker' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1">
                    <span>الشركة</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'name' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span>السعر الحالي</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'price' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('change')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span>% التغيير</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'change' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('score')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-center">
                    <span>التقييم الفني</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'score' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('trades')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span>عدد الصفقات</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'trades' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('value')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span>القيمة المتداولة</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'value' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 sticky top-0 z-20"
                >
                  <div className="flex items-center gap-1 justify-center">
                    <span>تاريخ التداول</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'date' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-sans">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-500">
                    لا توجد شركات تطابق شروط البحث الفنية.
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const isFav = watchlist.includes(c.ticker);
                  const price = c.currentPrice ?? 0;
                  const changePct = c.changePct ?? 0;
                  const score = c.evaluation?.compositeScore ?? 50;
                  const trades = c.tradesCount ?? 0;
                  const value = c.value ?? 0;
                  const lastBar = c.history && c.history.length > 0 ? c.history[c.history.length - 1] : null;
                  const rawDate = lastBar?.date || '';
                  const formattedDate = formatDateDDMMYYYY(rawDate);
                  const recent = isRecentDate(rawDate);

                  let scoreBg = 'bg-rose-100 text-rose-800 border-rose-200';
                  let scoreDot = 'bg-rose-500';
                  if (score >= 60) {
                    scoreBg = 'bg-emerald-100 text-emerald-900 border-emerald-200';
                    scoreDot = 'bg-emerald-500';
                  } else if (score >= 40) {
                    scoreBg = 'bg-amber-100 text-amber-900 border-amber-200';
                    scoreDot = 'bg-amber-500';
                  }

                  return (
                    <tr
                      key={c.ticker}
                      onClick={() => onSelectStock(c.ticker)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Watchlist Toggle */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleWatchlist) onToggleWatchlist(c.ticker);
                        }}
                      >
                        <button className="p-1 rounded-md hover:bg-zinc-200/60 transition-colors">
                          <Star
                            className={`w-4 h-4 ${
                              isFav
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-zinc-300 group-hover:text-amber-400'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Ticker */}
                      <td className="py-3 px-4 font-mono font-black text-zinc-900 text-sm">
                        {c.ticker}
                      </td>

                      {/* Company Name */}
                      <td className="py-3 px-4 text-zinc-900 font-bold max-w-[220px] leading-snug">
                        {c.nameAr}
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-4 text-left font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {price.toFixed(3)} <span className="text-zinc-500 font-sans text-[11px]">د.ع</span>
                      </td>

                      {/* Change % */}
                      <td className="py-3 px-4 text-left font-mono whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md font-bold text-xs inline-block ${
                            changePct > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : changePct < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {changePct > 0 ? '+' : ''}
                          {changePct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Composite Technical Score */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-xs border ${scoreBg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${scoreDot}`}></span>
                          {score}
                        </span>
                      </td>

                      {/* Trades Count */}
                      <td className="py-3 px-4 text-left font-mono text-zinc-800 font-semibold whitespace-nowrap">
                        {trades.toLocaleString()}{' '}
                        <span className="text-[10px] text-zinc-500 font-sans">صفقة</span>
                      </td>

                      {/* Traded Value */}
                      <td className="py-3 px-4 text-left font-mono text-zinc-900 font-bold whitespace-nowrap">
                        {value.toLocaleString()}{' '}
                        <span className="text-[10px] text-zinc-500 font-sans">د.ع</span>
                      </td>

                      {/* Trading Date */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-zinc-700 text-[11px]">{formattedDate}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              recent
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {recent ? '📅 نشط مؤخراً' : '📅 غير نشط مؤخراً'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
