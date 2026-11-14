export const normalizeQuillPromptHtml = (source = '') => {
  const html = String(source || '').trim();
  if (!html) return '';

  const fallbackCleanup = (value) => {
    let cleaned = String(value || '');
    cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
    cleaned = cleaned.replace(/<p><\/p>/gi, '');
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
    cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
    return cleaned.trim();
  };

  if (typeof DOMParser === 'undefined') {
    return fallbackCleanup(html);
  }

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
      const src = String(img.getAttribute('src') || '').trim();
      if (!src) {
        img.remove();
      }
    });

    doc.querySelectorAll('p').forEach((paragraph) => {
      const text = String(paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasMedia = paragraph.querySelector('img, video, audio');
      const brCount = paragraph.querySelectorAll('br').length;

      if (!text && !hasMedia && (brCount > 0 || paragraph.children.length === 0)) {
        paragraph.remove();
      }
    });

    return fallbackCleanup(doc.body.innerHTML);
  } catch {
    return fallbackCleanup(html);
  }
};

export default normalizeQuillPromptHtml;