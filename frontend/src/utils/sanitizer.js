import DOMPurify from 'dompurify';

export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty);
};

export const sanitizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizePhoneDisplay = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^0-9+\-().\s]/g, '').trim();
};
