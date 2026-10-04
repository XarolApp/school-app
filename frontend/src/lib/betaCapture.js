export function elementSelector(element) {
  const parts = [];
  for (let node = element; node && node !== document.body && parts.length < 6; node = node.parentElement) {
    const tag = node.tagName.toLowerCase();
    const siblings = [...(node.parentElement?.children || [])].filter((n) => n.tagName === node.tagName);
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`);
  }
  return parts.join(' > ').slice(0, 512);
}
export function publicElementText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('input,textarea,[data-private]').forEach((node) => node.remove());
  return (clone.textContent || '').trim().replace(/[^\s@]+@[^\s@]+/g, '[soukromý údaj]').slice(0, 120);
}
export function maskCaptureDocument(clone) {
  for (const node of clone.querySelectorAll('input,textarea,[data-private]')) {
    const rect = node.getBoundingClientRect();
    if ('value' in node) node.value = '';
    node.removeAttribute('value'); node.removeAttribute('placeholder');
    node.textContent = '';
    node.style.width = `${rect.width}px`; node.style.height = `${rect.height}px`;
    node.style.minHeight = `${rect.height}px`;
    node.style.background = 'var(--ink2)'; node.style.color = 'transparent';
    node.style.setProperty('text-shadow', 'none');
  }
}
export async function captureBetaScreenshot() {
  // Called only by the marked-element mode after an explicit capture action.
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(document.body, {
    x: window.scrollX, y: window.scrollY, width: innerWidth, height: innerHeight,
    windowWidth: innerWidth, windowHeight: innerHeight, scale: Math.min(1, 1600 / innerWidth),
    useCORS: true, logging: false, onclone: maskCaptureDocument,
    ignoreElements: (node) => Boolean(node.closest('[data-beta-tools]')),
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size > 1572864) throw new Error('Snímek je příliš velký. Lze pokračovat bez něj.');
  return blob;
}
