/**
 * Sanitization utilities using isomorphic-dompurify
 * All HTML content that will be rendered with dangerouslySetInnerHTML must be sanitized
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Default sanitization config - removes all scripts and dangerous attributes
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'iframe'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow'],
  KEEP_CONTENT: true,
};

/**
 * Strict config - only basic text formatting, no iframes or embeds
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML with default configuration (allows safe embeds)
 * Use this for general content like notes, descriptions, etc.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, DEFAULT_CONFIG);
}

/**
 * Sanitize HTML with strict configuration (no embeds, scripts, or external content)
 * Use this for user-generated text content
 */
export function sanitizeHtmlStrict(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, STRICT_CONFIG);
}

/**
 * Sanitize text by removing all HTML tags
 * Use this for plain text fields
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Remove all HTML tags
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize embed URLs - whitelist known providers
 * Only allow embeds from trusted domains
 */
export function sanitizeEmbedUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Whitelist of allowed embed domains
    const allowedDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'youtube-nocookie.com',
    ];

    // Check if hostname matches any allowed domain
    const isAllowed = allowedDomains.some(domain => hostname.endsWith(domain));

    if (!isAllowed) {
      console.warn(`Blocked embed from untrusted domain: ${hostname}`);
      return '';
    }

    // Additional validation for YouTube URLs
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) {
      // Only allow /embed/ path for youtube
      if (url.includes('/embed/')) {
        return url;
      }
      // Don't allow watch URLs or other formats
      return '';
    }

    // For other providers, allow as-is
    return url;
  } catch {
    console.warn(`Invalid embed URL: ${url}`);
    return '';
  }
}

/**
 * Generate safe iframe HTML for video embeds
 * Takes a sanitized URL and generates iframe HTML
 */
export function generateSafeIframeHtml(url: string, width: string = '560', height: string = '315'): string {
  const sanitized = sanitizeEmbedUrl(url);
  if (!sanitized) {
    return '';
  }

  // Escape attributes
  const escapedUrl = sanitized.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedWidth = width.replace(/"/g, '&quot;').replace(/[^0-9]/g, '');
  const escapedHeight = height.replace(/"/g, '&quot;').replace(/[^0-9]/g, '');

  return `<iframe width="${escapedWidth}" height="${escapedHeight}" src="${escapedUrl}" frameborder="0" allowfullscreen></iframe>`;
}

/**
 * Sanitize for use in contentEditable divs (used in notes editor)
 * This removes dangerous elements while preserving formatting
 */
export function sanitizeEditorHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove doctype, html, head, body tags
  let sanitized = html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '');

  // Now apply DOMPurify with default config to remove scripts and dangerous attributes
  return DOMPurify.sanitize(sanitized, DEFAULT_CONFIG);
}
