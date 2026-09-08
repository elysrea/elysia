/**
 * Pure content -> HTML renderers.
 *
 * These run at build time inside a Vite plugin, never in the browser, so the
 * shipped page is complete static markup: the whole site reads and navigates
 * with JavaScript disabled, and search engines get real text instead of an
 * empty root element.
 */

import { typeNames } from '../features/type/sets.ts';
import { benchPanels, durations, easings, specimens, swatches } from './bench.ts';
import {
  capabilities,
  contact,
  facts,
  footerLinks,
  meta,
  navCta,
  navLinks,
  practice,
  projects,
  studio,
  type Project,
} from './site.ts';

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

const paragraphs = (lines: readonly string[]): string =>
  lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n          ');

export function renderNavLinks(): string {
  return navLinks
    .map(({ href, label }) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join('\n      ');
}

export function renderNavCta(): string {
  return `<a class="nav-cta label" href="${escapeHtml(navCta.href)}">
        <span class="nav-cta-long">${escapeHtml(navCta.label)}</span>
        <span class="nav-cta-short" aria-hidden="true">${escapeHtml(navCta.short)}</span>
      </a>`;
}

/**
 * The tabs in the seam between the hero and the page.
 *
 * They are rendered as real links to the panels below them, so with JavaScript
 * off the bench is simply four blocks of content in order. Script shows one at
 * a time and gives the strip tab semantics.
 */
export function renderBenchTabs(): string {
  return benchPanels
    .map(
      (panel) =>
        `<a class="deck-tab" href="#bench-${escapeHtml(panel.name)}" data-tab="${escapeHtml(panel.name)}">${escapeHtml(panel.label)}</a>`,
    )
    .join('\n          ');
}

/** A colour chip per token. The value beside it is filled in from the cascade. */
function renderPalette(): string {
  return `<ul class="bench-swatches">
              ${swatches
                .map(
                  (swatch) =>
                    `<li><span class="bench-chip" style="background: var(${escapeHtml(swatch.token)})"></span><b>${escapeHtml(swatch.label)}</b><span class="code">${escapeHtml(swatch.token)}</span><span class="code bench-value" data-token="${escapeHtml(swatch.token)}"></span></li>`,
                )
                .join('\n              ')}
            </ul>`;
}

function renderSpecimens(): string {
  return `<ul class="bench-type">
              ${specimens
                .map(
                  (specimen) =>
                    `<li><span class="label bench-role">${escapeHtml(specimen.role)}<span class="code bench-value" data-token="${escapeHtml(specimen.token)}"></span></span><p class="${escapeHtml(specimen.className)}">${escapeHtml(specimen.sample)}</p></li>`,
                )
                .join('\n              ')}
            </ul>`;
}

/**
 * Each easing is drawn from its own control points and then run, so the curve
 * and the movement beside it cannot disagree.
 */
function renderMotion(): string {
  const curves = easings
    .map((easing) => {
      const [x1, y1, x2, y2] = easing.points;
      const path = `M0,100 C${x1 * 100},${100 - y1 * 100} ${x2 * 100},${100 - y2 * 100} 100,0`;

      return `<li class="bench-easing">
                <svg viewBox="-6 -6 112 112" aria-hidden="true">
                  <path d="M0,100 L100,100 M0,100 L0,0" class="bench-axis" />
                  <path d="${path}" class="bench-curve" />
                </svg>
                <div>
                  <b>${escapeHtml(easing.label)}</b>
                  <span class="code">${escapeHtml(easing.token)}</span>
                  <p>${escapeHtml(easing.note)}</p>
                  <span class="bench-runner" style="animation-timing-function: var(${escapeHtml(easing.token)})"></span>
                </div>
              </li>`;
    })
    .join('\n              ');

  const scale = durations
    .map(
      (duration) =>
        `<li><b class="code bench-value" data-token="${escapeHtml(duration.token)}"></b><span>${escapeHtml(duration.use)}</span><span class="code">${escapeHtml(duration.token)}</span></li>`,
    )
    .join('\n              ');

  return `<ul class="bench-easings">
              ${curves}
            </ul>
            <ul class="bench-durations">
              ${scale}
            </ul>`;
}

/** The real components, rendered rather than pictured. */
function renderParts(): string {
  return `<div class="bench-parts">
              <a class="nav-cta label" href="#contact"><span class="nav-cta-long">Start a project</span></a>
              <span class="eyebrow label">Section label</span>
              <ul class="work-stack label"><li>TypeScript</li><li>Design tokens</li><li>WCAG 2.2 AA</li></ul>
              <ul class="case-metrics"><li><b>63 → 9</b><span class="label">Button variants</span></li></ul>
              <ul class="index-list index-list--caps"><li><b>Product design</b><span>Flows, states and the edges nobody specs</span></li></ul>
            </div>`;
}

export function renderBench(): string {
  const bodies: Readonly<Record<string, () => string>> = {
    palette: renderPalette,
    type: renderSpecimens,
    motion: renderMotion,
    parts: renderParts,
  };

  return benchPanels
    .map((panel) => {
      const body = bodies[panel.name];
      return `<div class="bench-panel" id="bench-${escapeHtml(panel.name)}" data-panel="${escapeHtml(panel.name)}">
            <p class="bench-caption">${escapeHtml(panel.caption)}</p>
            ${body ? body() : ''}
          </div>`;
    })
    .join('\n        ');
}

/**
 * The type-set names, as a JSON array for the inline script in the head.
 *
 * The set has to be applied before first paint or the page renders in one face
 * and reflows into another, which rules out doing it from a module. Writing the
 * list in here keeps the inline script and `type/sets.ts` from drifting.
 */
export function renderTypeNames(): string {
  return JSON.stringify(typeNames);
}

export function renderPractice(): string {
  return `<h2 class="lede">${escapeHtml(practice.lede)}</h2>
        <div class="body">
          ${paragraphs(practice.body)}
        </div>`;
}

export function renderCapabilities(): string {
  return capabilities
    .map(
      (capability, index) =>
        `<li>
            <span class="capability-index code">${String(index + 1).padStart(2, '0')}</span>
            <b>${escapeHtml(capability.title)}</b>
            <span class="capability-note">${escapeHtml(capability.detail)}</span>
          </li>`,
    )
    .join('\n        ');
}

/**
 * Work rows use native `<details name="work">` rather than scripted disclosure:
 * one open row at a time, keyboard and screen-reader behaviour supplied by the
 * platform, and every case study still readable with JavaScript off.
 */
function renderProject(project: Project): string {
  const { slug, name, scope, year, role, duration, problem, approach, outcome, metrics, stack } =
    project;

  const paragraphs = approach
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('\n                ');

  return `<details class="work-item" name="work" id="work-${escapeHtml(slug)}">
          <summary class="work-row">
            <span class="work-name">${escapeHtml(name)}</span>
            <span class="work-scope">${escapeHtml(scope)}</span>
            <span class="work-year code">${year}</span>
            <span class="work-cue label" aria-hidden="true">Detail</span>
          </summary>
          <div class="work-panel">
            <ul class="case-metrics" aria-label="Results">
              ${metrics
                .map(
                  (metric) =>
                    `<li><b>${escapeHtml(metric.value)}</b><span class="label">${escapeHtml(metric.label)}</span></li>`,
                )
                .join('\n              ')}
            </ul>
            <div class="case">
              <p class="case-problem">${escapeHtml(problem)}</p>
              <div class="case-approach">
                ${paragraphs}
              </div>
              <p class="case-outcome"><b class="label">Outcome</b> ${escapeHtml(outcome)}</p>
            </div>
            <aside class="case-meta">
              <dl class="case-facts">
                <dt class="label">Role</dt>
                <dd>${escapeHtml(role)}</dd>
                <dt class="label">Duration</dt>
                <dd>${escapeHtml(duration)}</dd>
              </dl>
              <ul class="work-stack label" aria-label="Stack">
                ${stack.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n                ')}
              </ul>
            </aside>
          </div>
        </details>`;
}

export function renderWork(): string {
  return projects.map(renderProject).join('\n        ');
}

export function renderStudio(): string {
  return `<h2 class="lede">${escapeHtml(studio.lede)}</h2>
        <div class="body">
          ${paragraphs(studio.body)}
        </div>`;
}

export function renderFacts(): string {
  return facts
    .map(
      ({ label, value }) => `<li><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></li>`,
    )
    .join('\n        ');
}

export function renderContact(): string {
  return `<p class="lede lede--wide">${escapeHtml(contact.lede)}</p>
      <a class="contact-link" href="mailto:${escapeHtml(meta.email)}">${escapeHtml(meta.email)}</a>
      <p class="contact-note">${escapeHtml(contact.note)}</p>`;
}

export function renderFooterLinks(): string {
  return footerLinks
    .map(({ href, label }) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join('\n      ');
}

/** schema.org description of the studio, emitted as JSON-LD. */
export function renderStructuredData(): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: meta.name,
    description: meta.description,
    url: meta.url,
    email: `mailto:${meta.email}`,
    foundingDate: String(meta.founded),
    knowsAbout: capabilities.map((capability) => capability.title),
  };
  // `<` cannot appear unescaped inside a script element.
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

/** Every content slot the HTML shell can ask for, keyed by placeholder name. */
export const slots: Readonly<Record<string, () => string>> = {
  'nav-links': renderNavLinks,
  'nav-cta': renderNavCta,
  'bench-tabs': renderBenchTabs,
  bench: renderBench,
  'type-names': renderTypeNames,
  practice: renderPractice,
  capabilities: renderCapabilities,
  work: renderWork,
  studio: renderStudio,
  facts: renderFacts,
  contact: renderContact,
  'footer-links': renderFooterLinks,
  'structured-data': renderStructuredData,
  'site-name': () => escapeHtml(meta.name),
  tagline: () => escapeHtml(meta.tagline),
  description: () => escapeHtml(meta.description),
  year: () => String(new Date().getFullYear()),
};
