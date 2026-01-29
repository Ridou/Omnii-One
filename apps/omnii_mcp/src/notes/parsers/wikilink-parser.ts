/**
 * Wikilink Parser
 *
 * Extracts [[wikilinks]] from markdown content and provides
 * title normalization for consistent database lookups.
 *
 * Handles:
 * - Basic links: [[Note Title]]
 * - Piped links: [[target|display text]]
 * - Nested brackets (escapes them)
 */

import MarkdownIt from 'markdown-it';
import wikilinks from 'markdown-it-wikilinks';
import type { WikilinkMatch } from '../types';

/**
 * Normalize a title for wikilink matching.
 * Converts to lowercase and replaces spaces with hyphens.
 *
 * @param title - Original title string
 * @returns Normalized title for database lookup
 *
 * @example
 * normalizeTitle("Project Alpha") // "project-alpha"
 * normalizeTitle("My Daily Notes") // "my-daily-notes"
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, ''); // Remove special chars except hyphens
}

/**
 * Extract all wikilinks from markdown content.
 *
 * Parses [[wikilinks]] including piped links [[target|display]].
 * Returns deduplicated list of normalized targets.
 *
 * @param markdown - Markdown content to parse
 * @returns Array of WikilinkMatch objects
 *
 * @example
 * extractWikilinks("Check [[Project Alpha]] and [[john-smith|John]]")
 * // Returns:
 * // [
 * //   { raw: "[[Project Alpha]]", target: "Project Alpha", display: "Project Alpha", normalizedTarget: "project-alpha", position: 6 },
 * //   { raw: "[[john-smith|John]]", target: "john-smith", display: "John", normalizedTarget: "john-smith", position: 35 }
 * // ]
 */
export function extractWikilinks(markdown: string): WikilinkMatch[] {
  // Regex to match [[...]] including piped links
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const matches: WikilinkMatch[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = wikilinkRegex.exec(markdown)) !== null) {
    const raw = match[0];
    const innerText = match[1];
    const position = match.index;

    // Handle piped links: [[target|display]]
    const pipeIndex = innerText.indexOf('|');
    let target: string;
    let display: string;

    if (pipeIndex !== -1) {
      target = innerText.substring(0, pipeIndex).trim();
      display = innerText.substring(pipeIndex + 1).trim();
    } else {
      target = innerText.trim();
      display = target;
    }

    const normalizedTarget = normalizeTitle(target);

    // Deduplicate by normalized target
    if (!seen.has(normalizedTarget)) {
      seen.add(normalizedTarget);
      matches.push({
        raw,
        target,
        display,
        normalizedTarget,
        position,
      });
    }
  }

  return matches;
}

/**
 * Get unique normalized wikilink targets from content.
 * Convenience function when you only need target strings.
 *
 * @param markdown - Markdown content
 * @returns Array of normalized target strings
 */
export function getWikilinkTargets(markdown: string): string[] {
  return extractWikilinks(markdown).map((m) => m.normalizedTarget);
}

/**
 * Configure markdown-it with wikilink rendering support.
 * Returns a renderer that converts [[links]] to HTML anchors.
 */
export function createWikilinkRenderer(): MarkdownIt {
  const md = new MarkdownIt();

  // wikilinks is a factory function that returns a plugin
  const wikilinkPlugin = wikilinks({
    baseURL: '/notes/',
    relativeBaseURL: './',
    makeAllLinksAbsolute: false,
    uriSuffix: '',
    htmlAttributes: { class: 'wikilink' },
    postProcessPagePath: (pagePath: string) => {
      // Normalize for URL: lowercase, hyphens
      return normalizeTitle(pagePath);
    },
    postProcessLabel: (label: string) => {
      // Display text: preserve original formatting
      return label;
    },
  });

  md.use(wikilinkPlugin);
  return md;
}

/**
 * Render markdown to HTML with wikilink support.
 *
 * @param markdown - Markdown content with [[wikilinks]]
 * @returns HTML string with wikilinks rendered as anchor tags
 */
export function renderMarkdownWithWikilinks(markdown: string): string {
  const md = createWikilinkRenderer();
  return md.render(markdown);
}

/**
 * Replace wikilinks with plain text (for search indexing).
 * Converts [[target|display]] to just "display".
 *
 * @param markdown - Markdown with wikilinks
 * @returns Plain text without wiki brackets
 */
export function stripWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
    return display || target;
  });
}

/**
 * Count wikilinks in content without parsing full details.
 *
 * @param markdown - Markdown content
 * @returns Number of wikilinks found
 */
export function countWikilinks(markdown: string): number {
  const regex = /\[\[[^\]]+\]\]/g;
  const matches = markdown.match(regex);
  return matches ? matches.length : 0;
}
