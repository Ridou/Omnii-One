declare module 'markdown-it-wikilinks' {
  import type MarkdownIt from 'markdown-it';

  interface WikilinksOptions {
    baseURL?: string;
    relativeBaseURL?: string;
    makeAllLinksAbsolute?: boolean;
    uriSuffix?: string;
    htmlAttributes?: Record<string, string>;
    generatePageNameFromLabel?: (label: string) => string;
    postProcessPageName?: (pageName: string) => string;
    postProcessPagePath?: (pagePath: string) => string;
    postProcessLabel?: (label: string) => string;
  }

  const wikilinks: (options?: WikilinksOptions) => (md: MarkdownIt) => void;

  export = wikilinks;
}
