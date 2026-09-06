import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { escapeHtml, renderStructuredData, renderWork, slots } from '../src/content/render.ts';
import { projects } from '../src/content/site.ts';

describe('escapeHtml', () => {
  it('neutralises every character that could break out of markup', () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;',
    );
  });

  it('leaves ordinary copy alone', () => {
    expect(escapeHtml('Four to five projects a year')).toBe('Four to five projects a year');
  });
});

describe('renderWork', () => {
  const html = renderWork();

  it('renders every project', () => {
    for (const project of projects) {
      expect(html).toContain(`id="work-${project.slug}"`);
      expect(html).toContain(project.name);
      expect(html).toContain(project.scope);
    }
  });

  it('uses native disclosure so the case studies work without JavaScript', () => {
    expect(html).toContain('<details');
    expect(html).toContain('name="work"');
    expect(html).toContain('<summary');
  });

  it('renders the stack of every project', () => {
    const tags = projects.flatMap((project) => project.stack);

    for (const tag of tags) expect(html).toContain(`<li>${escapeHtml(tag)}</li>`);
  });
});

describe('renderStructuredData', () => {
  it('is valid JSON-LD', () => {
    const data: unknown = JSON.parse(renderStructuredData());

    expect(data).toMatchObject({ '@context': 'https://schema.org', '@type': 'Organization' });
  });

  it('cannot close the script element it lives in', () => {
    expect(renderStructuredData()).not.toContain('<');
  });
});

describe('content slots', () => {
  // Resolved from the project root: under the happy-dom environment
  // `import.meta.url` is an http URL, not a file one.
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const used = [...html.matchAll(/<!--@([a-z-]+)-->/g)].map((match) => match[1]);

  it('the HTML shell only asks for slots that exist', () => {
    expect(used.length).toBeGreaterThan(0);

    for (const name of used) {
      expect(Object.keys(slots)).toContain(name);
    }
  });

  it('every slot renders a non-empty string', () => {
    for (const [name, render] of Object.entries(slots)) {
      expect(render(), `slot ${name}`).not.toBe('');
    }
  });
});
