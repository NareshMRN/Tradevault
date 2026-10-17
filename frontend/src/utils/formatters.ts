/**
 * Indian Rupee (INR) and Number Formatters for TradeVault Indian Market Agent
 */

export function formatINR(
  amount: number | null | undefined,
  options?: {
    compact?: boolean;
    decimals?: number;
    showSign?: boolean;
  }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const { compact = false, decimals = 2, showSign = false } = options || {};
  const sign = showSign && amount > 0 ? '+' : '';

  if (compact) {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '-₹' : sign ? `+₹` : '₹';

    if (abs >= 10000000) {
      // Crores
      return `${prefix}${(abs / 10000000).toFixed(decimals)} Cr`;
    }
    if (abs >= 100000) {
      // Lakhs
      return `${prefix}${(abs / 100000).toFixed(decimals)} L`;
    }
    if (abs >= 1000) {
      // Thousands
      return `${prefix}${(abs / 1000).toFixed(1)}k`;
    }
    return `${prefix}${abs.toFixed(decimals)}`;
  }

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);

    return showSign && amount > 0 ? `+${formatted}` : formatted;
  } catch {
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${sign}₹${formatted}`;
  }
}

export function formatPercent(value: number | null | undefined, showSign = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatIndianNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}
