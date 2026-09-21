/**
 * Comprehensive Email Validation & Anti-Spoofing Utility
 * Prevents fake Gmail registrations and disposable email spam.
 */

// Known disposable and temporary email domains to block
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'fake.com',
  'test.com',
  'example.com',
  'dispostable.com',
  'getairmail.com',
  'sharklasers.com',
  'fakeinbox.com',
  'maildrop.cc',
  'inboxkitten.com',
  'crazymailing.com',
  'mohmal.com',
  'burnermail.io',
  'mytemp.email',
  'emailondeck.com',
  'fakemailgenerator.com',
  'getnada.com',
  'generator.email',
  'tempail.com',
  'disposablemail.com'
]);

/**
 * Checks whether an email belongs to Google's official Gmail service
 */
export function isGmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const domain = clean.split('@')[1];
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

/**
 * Checks whether an email uses a disposable / temporary domain
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validates syntax, format, and authenticity requirements for registration
 */
export function validateEmailForRegistration(email: string): {
  valid: boolean;
  isGmail: boolean;
  error?: string;
} {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) {
    return { valid: false, isGmail: false, error: 'Vui lòng nhập địa chỉ Email.' };
  }

  // Strict email format regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean) || clean.includes('..')) {
    return {
      valid: false,
      isGmail: false,
      error: 'Địa chỉ Email không đúng định dạng hợp lệ (VD: tenban@thpt.edu.vn).'
    };
  }

  // Check disposable domains
  if (isDisposableEmail(clean)) {
    return {
      valid: false,
      isGmail: false,
      error: 'Địa chỉ email thuộc danh sách hộp thư tạm thời hoặc giả mạo. Vui lòng sử dụng email thật.'
    };
  }

  // Check Gmail domain rule
  if (isGmailAddress(clean)) {
    return {
      valid: false,
      isGmail: true,
      error: 'Tài khoản @gmail.com cần được xác thực chính chủ qua Google Sign-In để chống tài khoản giả mạo.'
    };
  }

  return { valid: true, isGmail: false };
}

/**
 * Generates a random 6-digit OTP code for email verification
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
