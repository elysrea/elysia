import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  renderBench,
  renderCapabilities,
  renderBenchTabs,
  renderStructuredData,
  renderTypeNames,
  renderWork,
  slots,
} from '../src/content/render.ts';
import { DEFAULT_TYPE, resolveTypeSet, typeNames } from '../src/features/type/sets.ts';
import { projects } from '../src/content/site.ts';
import { benchPanels, easings, swatches } from '../src/content/bench.ts';

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

describe('the bench', () => {
  it('renders a tab and a panel per entry, both reachable without JavaScript', () => {
    const tabs = renderBenchTabs();
    const bench = renderBench();

    for (const panel of benchPanels) {
      expect(tabs).toContain(`href="#bench-${panel.name}"`);
      expect(tabs).toContain(`data-tab="${panel.name}"`);
      expect(bench).toContain(`id="bench-${panel.name}"`);
      expect(bench).toContain(`data-panel="${panel.name}"`);
      expect(bench).toContain(panel.caption);
    }
  });

  it('names tokens rather than repeating their values', () => {
    // The whole point of the specimen is that it reads the live cascade; a
    // hard-coded hex in here would be the thing it exists to prevent.
    const bench = renderBench();

    for (const swatch of swatches) expect(bench).toContain(`data-token="${swatch.token}"`);
    expect(bench).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it('draws each easing from its own control points', () => {
    const bench = renderBench();

    for (const easing of easings) {
      const [x1, y1] = easing.points;
      expect(bench).toContain(`C${x1 * 100},${100 - y1 * 100}`);
      expect(bench).toContain(`var(${easing.token})`);
    }
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

describe('small type', () => {
  it('sets labels in the reading face, not a monospace', () => {
    // The label style stopped being monospace, so the class stopped saying it.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('class="nav-links label"');
    expect(html).not.toContain('class="nav-links mono"');
  });

  it('keeps the monospace for things that are values', () => {
    expect(renderWork()).toContain('class="work-year code"');
    expect(renderBench()).toContain('class="code"');
  });

  it('tracks nothing', () => {
    // Letter-spacing on small type is a way of making plain type look
    // considered. The faces here have their own character.
    const css = ['layout.css', 'hero.css', 'nav.css', 'tokens.css']
      .map((file) => readFileSync(resolve(process.cwd(), 'src/styles', file), 'utf8'))
      .join('\n');

    const spacing = [...css.matchAll(/letter-spacing:\s*([^;]+);/g)].map((match) =>
      (match[1] ?? '').trim(),
    );

    for (const value of spacing) {
      expect(value === '0' || value.includes('--display-tracking'), value).toBe(true);
    }
  });
});

describe('capabilities', () => {
  it('numbers each one', () => {
    const html = renderCapabilities();

    expect(html).toContain('>01<');
    expect(html).toContain('>06<');
  });

  it('leads with the name rather than a label', () => {
    const html = renderCapabilities();

    // The old shape put a faint label above and the gloss in the bright role.
    expect(html.indexOf('<b>')).toBeLessThan(html.indexOf('capability-note'));
  });
});
