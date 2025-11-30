/**
 * Currency utilities for handling USD/cents conversions
 *
 * All monetary amounts in the API are stored as cents (1 dollar = 100 cents)
 * These utilities help convert between display formats and API formats
 */

/**
 * Format cents as USD currency string
 * @param cents Amount in cents (e.g., 500 = $5.00)
 * @returns Formatted string (e.g., "$5.00")
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert dollars to cents
 * @param dollars Amount in dollars (e.g., 5.00)
 * @returns Amount in cents (e.g., 500)
 */
export function parseCurrency(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Validate amount is within acceptable range
 * @param cents Amount in cents
 * @returns true if valid (>= $1.00 and <= $500.00)
 */
export function isValidSuperchatAmount(cents: number): boolean {
  const MIN_AMOUNT = 100; // $1.00
  const MAX_AMOUNT = 50000; // $500.00
  return cents >= MIN_AMOUNT && cents <= MAX_AMOUNT;
}
