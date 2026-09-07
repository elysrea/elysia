/**
 * Pure content -> HTML renderers.
 *
 * These run at build time inside a Vite plugin, never in the browser, so the
 * shipped page is complete static markup: the whole site reads and navigates
 * with JavaScript disabled, and search engines get real text instead of an
 * empty root element.
 */

import { DEFAULT_HERO, HERO_CATALOGUE } from '../features/hero/catalogue.ts';
import {
  announcement,
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
  return `<a class="nav-cta mono" href="${escapeHtml(navCta.href)}">
        <span class="nav-cta-long">${escapeHtml(navCta.label)}</span>
        <span class="nav-cta-short" aria-hidden="true">${escapeHtml(navCta.short)}</span>
      </a>`;
}

/**
 * The standing note above the wordmark. It is a link, not a banner: it says
 * one true thing about availability and goes where that leads.
 */
export function renderAnnouncement(): string {
  if (!announcement) return '';

  return `<a class="announce mono" href="${escapeHtml(announcement.href)}">
          <span class="announce-tag">${escapeHtml(announcement.tag)}</span>
          <span class="announce-text">${escapeHtml(announcement.text)}</span>
          <span class="announce-arrow" aria-hidden="true">&rarr;</span>
        </a>`;
}

/**
 * The tabs in the seam between the hero and the page.
 *
 * They are rendered as real links to `?hero=…`, so the switcher works with
 * JavaScript off — it just costs a reload. The active one is marked here from
 * the default, and re-marked by the switcher once it takes over.
 */
export function renderHeroTabs(): string {
  return HERO_CATALOGUE.map((entry) => {
    const current = entry.name === DEFAULT_HERO ? ' aria-current="true"' : '';
    return `<a class="deck-tab" href="?hero=${escapeHtml(entry.name)}" data-hero="${escapeHtml(entry.name)}" title="${escapeHtml(entry.blurb)}"${current}>${escapeHtml(entry.label)}</a>`;
  }).join('\n          ');
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
      ({ title, detail }) =>
        `<li><b>${escapeHtml(title)}</b><span>${escapeHtml(detail)}</span></li>`,
    )
    .join('\n        ');
}

/**
 * Work rows use native `<details name="work">` rather than scripted disclosure:
 * one open row at a time, keyboard and screen-reader behaviour supplied by the
 * platform, and every case study still readable with JavaScript off.
 */
function renderProject(project: Project): string {
  const { slug, name, scope, year, role, outcome, stack } = project;
  return `<details class="work-item" name="work" id="work-${escapeHtml(slug)}">
          <summary class="work-row">
            <span class="work-name">${escapeHtml(name)}</span>
            <span class="work-scope">${escapeHtml(scope)}</span>
            <span class="work-year mono">${year}</span>
            <span class="work-cue mono" aria-hidden="true">Detail</span>
          </summary>
          <div class="work-panel">
            <dl class="work-detail">
              <dt class="mono">Role</dt>
              <dd>${escapeHtml(role)}</dd>
              <dt class="mono">Outcome</dt>
              <dd>${escapeHtml(outcome)}</dd>
            </dl>
            <ul class="work-stack mono" aria-label="Stack">
              ${stack.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n              ')}
            </ul>
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
  'hero-tabs': renderHeroTabs,
  announcement: renderAnnouncement,
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
