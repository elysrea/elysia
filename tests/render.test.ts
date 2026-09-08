import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  renderDeckTabs,
  renderStructuredData,
  renderTypeNames,
  renderWork,
  slots,
} from '../src/content/render.ts';
import { DEFAULT_TYPE, resolveTypeSet, typeNames } from '../src/features/type/sets.ts';
import { projects, sections } from '../src/content/site.ts';

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

describe('renderDeckTabs', () => {
  it('renders a real link per section, so the page works without JavaScript', () => {
    const html = renderDeckTabs();

    for (const section of sections) {
      expect(html).toContain(`href="#${section.id}"`);
      expect(html).toContain(`data-section="${section.id}"`);
      expect(html).toContain(section.label);
    }
  });

  it('marks the first section before any script runs', () => {
    const marked = renderDeckTabs().match(/aria-current="true"/g) ?? [];

    expect(marked).toHaveLength(1);
    expect(renderDeckTabs().indexOf('aria-current')).toBeLessThan(
      renderDeckTabs().indexOf(`data-section="${sections[1]?.id}"`),
    );
  });

  it('names a panel that exists on the page', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    for (const section of sections) expect(html).toContain(`id="${section.id}"`);
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

describe('type sets', () => {
  it('resolves a known set and falls back for anything else', () => {
    for (const name of typeNames) expect(resolveTypeSet(`?type=${name}`)).toBe(name);

    expect(resolveTypeSet('')).toBe(DEFAULT_TYPE);
    expect(resolveTypeSet('?type=comic')).toBe(DEFAULT_TYPE);
    expect(resolveTypeSet('?type=constructor')).toBe(DEFAULT_TYPE);
  });

  it('hands the inline script the same list, as JSON', () => {
    expect(JSON.parse(renderTypeNames())).toEqual([...typeNames]);
  });

  it('is applied before first paint, not from a module', () => {
    // A module runs after the document has rendered, so a set applied there
    // would reflow the whole page a moment after it appeared.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));

    expect(head).toContain('<!--@type-names-->');
    expect(head).toContain('data-type');
  });

  it('declares a face for every set', () => {
    const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

    for (const name of typeNames) {
      if (name === DEFAULT_TYPE) continue;
      expect(tokens).toContain(`[data-type='${name}']`);
    }
  });
});
