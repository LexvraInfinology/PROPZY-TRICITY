/**
 * Form Input Validation Helpers for PROPZY
 */

// Name validation: letters, spaces, dots, hyphens only. No digits. Max 50 chars.
export const sanitizeName = (val?: string | null): string => {
  if (!val) return '';
  return String(val).replace(/[^a-zA-Z\s.-]/g, '').slice(0, 50);
};

export const isValidName = (val?: string | null): boolean => {
  if (!val) return false;
  const trimmed = String(val).trim();
  return trimmed.length >= 2 && /^[a-zA-Z\s.-]+$/.test(trimmed);
};

// Phone validation: digits only (0-9). Max 10 digits.
export const sanitizePhone = (val?: string | null): string => {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(0, 10);
};

export const isValidPhone = (val?: string | null): boolean => {
  if (!val) return false;
  const trimmed = String(val).trim();
  // Validates a 10-digit mobile number
  return /^\d{10}$/.test(trimmed);
};

// Email validation: requires valid user@domain.tld structure with at least 2-char TLD (.com, .in, etc.)
export const isValidEmail = (val?: string | null): boolean => {
  if (!val) return false;
  const trimmed = String(val).trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
};

export const isValidHttpUrl = (val: string): boolean => {
  try {
    const url = new URL(val.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isValidElectricityBillDocument = (val: string): boolean => {
  if (isValidHttpUrl(val)) return true;

  const isAllowedDataUrl = /^data:(?:image\/(?:jpeg|png|webp|gif|heic|heif)|application\/pdf);base64,[a-z0-9+/=]+$/i.test(val);
  return isAllowedDataUrl && val.length <= 7_000_000;
};

// ─────────────────────────────────────────────────────────────
// Strong Password Validation Helpers
// ─────────────────────────────────────────────────────────────

export interface PasswordCriteria {
  minLength: boolean;      // At least 8 characters
  hasUppercase: boolean;   // At least 1 uppercase (A-Z)
  hasLowercase: boolean;   // At least 1 lowercase (a-z)
  hasNumber: boolean;      // At least 1 number (0-9)
  hasSpecial: boolean;     // At least 1 special character (!@#$%^&*...)
  isValid: boolean;        // All 5 criteria satisfied
  score: number;           // Count of passed criteria (0 to 5)
}

export const checkPasswordCriteria = (password: string): PasswordCriteria => {
  const pwd = password || '';
  const minLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`^]/.test(pwd);

  const score = [minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const isValid = score === 5;

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isValid,
    score
  };
};

export const isValidStrongPassword = (password: string): boolean => {
  return checkPasswordCriteria(password).isValid;
};

export const getPasswordValidationMessage = (password: string): string | null => {
  if (!password || password.trim() === '') {
    return 'Password is required.';
  }

  const criteria = checkPasswordCriteria(password);
  if (criteria.isValid) return null;

  const missing: string[] = [];
  if (!criteria.minLength) missing.push('at least 8 characters');
  if (!criteria.hasUppercase) missing.push('1 uppercase letter (A-Z)');
  if (!criteria.hasLowercase) missing.push('1 lowercase letter (a-z)');
  if (!criteria.hasNumber) missing.push('1 number (0-9)');
  if (!criteria.hasSpecial) missing.push('1 special character (e.g. !@#$%^&*)');

  return `Password is not strong enough. Missing: ${missing.join(', ')}.`;
};

