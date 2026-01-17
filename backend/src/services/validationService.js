export const validateVPA = (vpa) => {
  const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return vpaRegex.test(vpa);
};

export const luhnCheck = (cardNumber) => {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

export const detectCardNetwork = (cardNumber) => {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^(60|65|8[1-9])/.test(cleaned)) return 'rupay';
  
  return 'unknown';
};

export const validateExpiry = (month, year) => {
  const mon = parseInt(month);
  if (mon < 1 || mon > 12) return false;

  let yr = parseInt(year);
  if (yr < 100) yr += 2000; // Convert 2-digit to 4-digit

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (yr < currentYear) return false;
  if (yr === currentYear && mon < currentMonth) return false;

  return true;
};

export const generateId = (prefix) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = prefix;
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};
