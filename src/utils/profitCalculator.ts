export interface CalculationResult {
  buyPrice: number;
  sellPrice: number;
  shares: number;
  commissionRatePct: number; // e.g. 0.6
  
  buyTotalValue: number;
  sellTotalValue: number;
  buyCommission: number;
  sellCommission: number;
  totalCommissions: number;
  grossProfit: number;
  netProfit: number;
  netProfitPct: number;
  breakEvenSellPrice: number;
  
  // Verification check flag matching the prompt's reference example
  isReferenceExampleMatch: boolean;
}

export function calculateISXProfit(
  buyPrice: number,
  sellPrice: number,
  shares: number,
  commissionRatePct: number = 0.6
): CalculationResult {
  const commRate = Math.max(0, commissionRatePct / 100);
  
  const buyTotalValue = buyPrice * shares;
  const sellTotalValue = sellPrice * shares;
  
  const buyCommission = buyTotalValue * commRate;
  const sellCommission = sellTotalValue * commRate;
  
  const totalCommissions = buyCommission + sellCommission;
  
  const grossProfit = sellTotalValue - buyTotalValue;
  const netProfit = grossProfit - totalCommissions;
  
  const netProfitPct = buyTotalValue > 0 ? (netProfit / buyTotalValue) * 100 : 0;
  
  // Exact break-even formula: (Buy Price * (1 + comm)) / (1 - comm)
  const breakEvenSellPrice = commRate < 1 
    ? (buyPrice * (1 + commRate)) / (1 - commRate)
    : buyPrice;

  // Check if inputs match the reference example in prompt
  const isReferenceExampleMatch = 
    Math.abs(buyPrice - 4.32) < 0.001 &&
    Math.abs(sellPrice - 4.38) < 0.001 &&
    shares === 1000 &&
    Math.abs(commissionRatePct - 0.6) < 0.001;

  return {
    buyPrice,
    sellPrice,
    shares,
    commissionRatePct,
    buyTotalValue,
    sellTotalValue,
    buyCommission,
    sellCommission,
    totalCommissions,
    grossProfit,
    netProfit,
    netProfitPct,
    breakEvenSellPrice,
    isReferenceExampleMatch
  };
}
