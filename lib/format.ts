/**
 * Utility functions for formatting prices, numbers, and currency in Indian numbering format (Lakh, Crore, INR).
 */

export function formatSinglePrice(val: number): string {
  if (isNaN(val) || val <= 0) return '₹0';
  
  if (val >= 10000000) {
    // Crore (1 Cr = 1,00,00,000)
    const cr = (val / 10000000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${cr} Cr`;
  }
  
  if (val >= 100000) {
    // Lakh (1 Lakh = 1,00,000)
    const lakh = (val / 100000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${lakh} Lakh`;
  }
  
  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Robust price formatter supporting:
 * - Single numbers: 12000 -> ₹12,000
 * - Lakhs: 150000 -> ₹1.5 Lakh, 100000 -> ₹1 Lakh
 * - Crores: 12500000 -> ₹1.25 Cr, 10000000 -> ₹1 Cr
 * - Ranges: "10500-12000" -> "₹10,500 – ₹12,000"
 * - Lakh Ranges: "100000-150000" -> "₹1 Lakh – ₹1.5 Lakh"
 * - Strings with symbols, commas, or 'to': "10,500 to 12,000" -> "₹10,500 – ₹12,000"
 */
export function formatPrice(val: number | string | null | undefined): string {
  if (val === undefined || val === null || val === '') return '₹0';

  if (typeof val === 'number') {
    return formatSinglePrice(val);
  }

  const str = String(val).trim();
  if (!str) return '₹0';

  // Check for range patterns: "10500-12000", "10500 - 12000", "10,500 to 12,000", "10500–12000"
  const rangeRegex = /[-–—]|(?:\s+to\s+)/i;
  if (rangeRegex.test(str)) {
    const rawParts = str.split(rangeRegex);
    if (rawParts.length === 2) {
      const p1Str = rawParts[0].trim().replace(/[^0-9.]/g, '');
      const p2Str = rawParts[1].trim().replace(/[^0-9.]/g, '');
      const p1 = Number(p1Str);
      const p2 = Number(p2Str);
      if (!isNaN(p1) && !isNaN(p2) && p1 > 0 && p2 > 0) {
        return `${formatSinglePrice(p1)} – ${formatSinglePrice(p2)}`;
      }
    }
  }

  // Extract pure number if string has commas or currency prefix (e.g., "₹12,000" or "12,000")
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (cleaned) {
    const num = Number(cleaned);
    if (!isNaN(num) && num > 0) {
      return formatSinglePrice(num);
    }
  }

  // Fallback for non-numeric descriptive strings (e.g. "Price on Request")
  return str.startsWith('₹') ? str : `₹${str}`;
}
