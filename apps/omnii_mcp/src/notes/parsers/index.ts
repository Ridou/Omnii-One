/**
 * Note Parsers Module
 *
 * Exports wikilink and frontmatter parsing utilities.
 */

// Wikilink parsing
export {
  extractWikilinks,
  getWikilinkTargets,
  normalizeTitle,
  createWikilinkRenderer,
  renderMarkdownWithWikilinks,
  stripWikilinks,
  countWikilinks,
} from './wikilink-parser';

// Frontmatter parsing
export {
  parseFrontmatter,
  stringifyFrontmatter,
  updateFrontmatter,
  removeFrontmatter,
  hasFrontmatter,
  getFrontmatterField,
  validateFrontmatter,
} from './frontmatter-parser';

// Re-export types
export type { FrontmatterResult } from './frontmatter-parser';
