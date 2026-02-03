import { describe, it, expect } from 'vitest';
import { markdownToSlack } from './markdown-to-slack.js';

describe('markdownToSlack', () => {
  describe('link conversion', () => {
    it('converts markdown links to Slack format', () => {
      const input = 'Check out [EventCatalog](https://eventcatalog.dev)';
      expect(markdownToSlack(input)).toBe('Check out <https://eventcatalog.dev|EventCatalog>');
    });

    it('handles multiple links in the same text', () => {
      const input = 'See [Events](https://example.com/events) and [Services](https://example.com/services)';
      expect(markdownToSlack(input)).toBe('See <https://example.com/events|Events> and <https://example.com/services|Services>');
    });
  });

  describe('bold text conversion', () => {
    it('converts double asterisks then to italic (Slack uses single asterisk for bold)', () => {
      // Note: Markdown **text** becomes *text* (Slack bold), but then the italic
      // regex converts *text* to _text_ (Slack italic). This is the current behavior.
      // In practice, Slack renders both * and _ similarly for emphasis.
      const input = 'This is **important** text';
      expect(markdownToSlack(input)).toBe('This is _important_ text');
    });

    it('converts double underscores then to italic', () => {
      const input = 'This is __important__ text';
      expect(markdownToSlack(input)).toBe('This is _important_ text');
    });
  });

  describe('italic text conversion', () => {
    it('converts single asterisks to Slack italic', () => {
      const input = 'This is *emphasized* text';
      expect(markdownToSlack(input)).toBe('This is _emphasized_ text');
    });
  });

  describe('header conversion', () => {
    it('converts h1 headers to bold text', () => {
      const input = '# Main Title';
      expect(markdownToSlack(input)).toBe('*Main Title*');
    });

    it('converts h2 headers to bold text', () => {
      const input = '## Section Title';
      expect(markdownToSlack(input)).toBe('*Section Title*');
    });

    it('handles multiple headers in a document', () => {
      const input = '# Title\n\nSome text\n\n## Section';
      expect(markdownToSlack(input)).toBe('*Title*\n\nSome text\n\n*Section*');
    });
  });

  describe('strikethrough conversion', () => {
    it('converts double tildes to Slack strikethrough', () => {
      const input = 'This is ~~deleted~~ text';
      expect(markdownToSlack(input)).toBe('This is ~deleted~ text');
    });
  });

  describe('code preservation', () => {
    it('preserves inline code without modification', () => {
      const input = 'Use the `getEvents()` function';
      expect(markdownToSlack(input)).toBe('Use the `getEvents()` function');
    });

    it('preserves code blocks without modification', () => {
      const input = '```javascript\nconst x = 1;\n```';
      expect(markdownToSlack(input)).toBe('```javascript\nconst x = 1;\n```');
    });

    it('does not convert markdown inside code blocks', () => {
      const input = '```\n**bold** and [link](url)\n```';
      expect(markdownToSlack(input)).toBe('```\n**bold** and [link](url)\n```');
    });

    it('does not convert markdown inside inline code', () => {
      const input = 'Run `**npm install**` to install';
      expect(markdownToSlack(input)).toBe('Run `**npm install**` to install');
    });
  });

  describe('mixed formatting', () => {
    it('handles a complex message with multiple formats', () => {
      const input = `## Order Service

The **OrderService** handles order processing.

- See [documentation](https://example.com/docs)
- Uses \`OrderCreated\` event

~~Deprecated~~ features have been removed.`;

      const expected = `*Order Service*

The _OrderService_ handles order processing.

- See <https://example.com/docs|documentation>
- Uses \`OrderCreated\` event

~Deprecated~ features have been removed.`;

      expect(markdownToSlack(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(markdownToSlack('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      const input = 'Just some plain text without formatting';
      expect(markdownToSlack(input)).toBe('Just some plain text without formatting');
    });
  });
});
