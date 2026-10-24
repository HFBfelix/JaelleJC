/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
// Échappement du texte saisi par un client avant insertion dans un e-mail HTML.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Texte multiligne (message de contact) : échappé, puis retours à la ligne conservés.
export function escapeMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}
