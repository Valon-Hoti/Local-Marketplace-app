/**
 * Security Utilities for NearBuy
 * 
 * Provides:
 * - Input sanitization (XSS, control characters, null bytes)
 * - URL & Protocol validation (prevents javascript: / dangerous schemes)
 * - Email and password validation
 * - Client-side sliding-window rate limiting
 */

// Rate Limiter In-Memory Store
const rateLimitStore: Record<string, number[]> = {};

/**
 * Sanitize text inputs against XSS and control character injection.
 * Removes HTML tags, script elements, javascript: protocols, and null bytes.
 */
export const sanitizeText = (input: string | undefined | null, maxLength = 2000): string => {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input
    // Remove null bytes and non-printable control characters (except common whitespace: \n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip iframe tags and content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Strip dangerous HTML event handlers (e.g., onload=, onerror=, onclick=)
    .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Strip javascript: pseudo-protocol
    .replace(/javascript\s*:/gi, '')
    // Strip general HTML tags
    .replace(/<[^>]*>/g, '')
    .trim();

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim();
  }

  return cleaned;
};

/**
 * Validate and sanitize URLs to allow only safe protocols (https, http, data:image/, tel, mailto).
 * Blocks javascript:, vbscript:, and file: protocols.
 */
export const sanitizeUrl = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Allow standard image data URIs
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Safe scheme regex
  const safeSchemeRegex = /^(https?|tel|mailto):\/\//i;
  const safeTelMailRegex = /^(tel:|mailto:)/i;

  if (safeSchemeRegex.test(trimmed) || safeTelMailRegex.test(trimmed) || trimmed.startsWith('https://wa.me/')) {
    return trimmed;
  }

  return null;
};

/**
 * Validate phone number formatting (digits, optional leading +, spaces, dashes).
 */
export const sanitizePhone = (phone: string | undefined | null): string => {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, 15);
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Validate price input ensuring it is a finite non-negative number within reasonable limits.
 */
export const validatePrice = (price: any): { valid: boolean; value: number; message?: string } => {
  if (price === undefined || price === null || price === '') {
    return { valid: true, value: 0 };
  }
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(',', '.'));
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: 0, message: 'Çmimi duhet të jetë numër valid.' };
  }
  if (num < 0) {
    return { valid: false, value: 0, message: 'Çmimi nuk mund të jetë negativ.' };
  }
  if (num > 10000000) {
    return { valid: false, value: 0, message: 'Çmimi e tejkalon vlerën maksimale të lejuar.' };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
};

/**
 * Validate email format using standard RFC-compatible regex.
 */
export const validateEmail = (email: string | undefined | null): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

/**
 * Validate password strength (minimum 6 characters).
 */
export const validatePassword = (password: string | undefined | null): { valid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Fjalëkalimi kërkohet.' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Fjalëkalimi është shumë i gjatë.' };
  }
  return { valid: true };
};

/**
 * Sliding-window in-memory Rate Limiter.
 * 
 * @param actionKey Unique identifier for the action (e.g. `create_listing_${userId}`)
 * @param maxAllowed Maximum requests allowed within the time window
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 * @returns boolean `true` if the request is allowed, `false` if rate limit exceeded
 */
export const checkRateLimit = (actionKey: string, maxAllowed: number, windowMs: number): boolean => {
  const now = Date.now();
  if (!rateLimitStore[actionKey]) {
    rateLimitStore[actionKey] = [];
  }

  // Filter timestamps within current window
  rateLimitStore[actionKey] = rateLimitStore[actionKey].filter(timestamp => now - timestamp < windowMs);

  if (rateLimitStore[actionKey].length >= maxAllowed) {
    return false;
  }

  rateLimitStore[actionKey].push(now);
  return true;
};

/**
 * Get remaining cooldown seconds until an action can be performed again.
 */
export const getRemainingRateLimitTime = (actionKey: string, windowMs: number): number => {
  const timestamps = rateLimitStore[actionKey];
  if (!timestamps || timestamps.length === 0) return 0;
  const oldestInWindow = timestamps[0];
  const elapsed = Date.now() - oldestInWindow;
  const remaining = Math.max(0, Math.ceil((windowMs - elapsed) / 1000));
  return remaining;
};
