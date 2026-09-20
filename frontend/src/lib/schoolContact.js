const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSchoolContact(contact) {
  return String(contact ?? '')
    .split(/[,;|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((label) => {
      if (EMAIL_PATTERN.test(label)) {
        return { type: 'email', label, href: `mailto:${label}` };
      }

      const hasLeadingPlus = /^\s*\+/.test(label.replace(/^(tel(?:efon)?\.?):?\s*/i, ''));
      const digits = label.replace(/\D/g, '');
      if (digits.length >= 9 && digits.length <= 15) {
        return { type: 'phone', label, href: `tel:${hasLeadingPlus ? '+' : ''}${digits}` };
      }

      return { type: 'other', label, href: null };
    });
}
