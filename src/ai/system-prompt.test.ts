import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from './system-prompt.js';

describe('getSystemPrompt', () => {
  it('includes the EventCatalog URL in link patterns', () => {
    const url = 'https://catalog.example.com';
    const prompt = getSystemPrompt(url);

    expect(prompt).toContain(`${url}/docs/events/{eventName}`);
    expect(prompt).toContain(`${url}/docs/services/{serviceName}`);
    expect(prompt).toContain(`${url}/docs/domains/{domainName}`);
    expect(prompt).toContain(`${url}/docs/commands/{commandName}`);
    expect(prompt).toContain(`${url}/docs/queries/{queryName}`);
  });

  it('describes the assistant role for EventCatalog', () => {
    const prompt = getSystemPrompt('https://example.com');

    expect(prompt).toContain('EventCatalog');
    expect(prompt).toContain('event-driven architecture');
  });

  it('instructs to use MCP tools', () => {
    const prompt = getSystemPrompt('https://example.com');

    expect(prompt).toContain('MCP tools');
    expect(prompt).toContain('query the catalog');
  });

  it('specifies Slack-compatible markdown formatting', () => {
    const prompt = getSystemPrompt('https://example.com');

    expect(prompt).toContain('Slack');
    expect(prompt).toContain('markdown');
    expect(prompt).toContain('**bold**');
  });

  it('emphasizes accuracy over assumptions', () => {
    const prompt = getSystemPrompt('https://example.com');

    expect(prompt).toContain("Don't make assumptions");
  });
});
