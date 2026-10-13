/**
 * Indian mobile helpers shared by the OTP flow and the seed.
 * A mobile is 10 digits starting 6, 7, 8 or 9. Pasted "+91 98765 43210",
 * "919876543210" and "09876543210" are all accepted and reduced to the 10 digits.
 */
export function normalizeIndianPhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export const isIndianMobile = (digits) => /^[6-9]\d{9}$/.test(digits);
