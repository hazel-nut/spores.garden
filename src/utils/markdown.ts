/**
 * Secure Markdown Rendering
 *
 * Uses marked for parsing and DOMPurify for sanitization.
 */

import { marked } from 'marked';
import { sanitizeHtml } from './sanitize';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: true,     // Convert \n to <br>
});

/**
 * Render markdown to sanitized HTML.
 * Safe for user-generated content.
 */
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  return sanitizeHtml(raw);
}

/**
 * Check if text appears to contain markdown formatting.
 */
export function looksLikeMarkdown(text: string): boolean {
  return /^#|\*\*|__|\[.*\]\(|\n-\s|\n\d+\./.test(text);
}
