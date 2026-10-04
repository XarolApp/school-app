/** Shares a URL where possible and copies it on browsers without Web Share. */
export async function shareUrl({ title = 'Střední na míru', text = '', url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  if (!navigator.clipboard?.writeText) throw new Error('Schránka není dostupná.');
  await navigator.clipboard.writeText([text, url].filter(Boolean).join(' '));
  return 'copied';
}
