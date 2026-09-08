import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initNav } from '../src/features/nav.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

const markup = `
  <header class="nav" id="nav">
    <nav class="nav-links">
      <a href="#work">Work</a>
      <a href="#studio">Studio</a>
    </nav>
  </header>
  <section id="work"></section>
  <section id="studio"></section>
`;

let harness: ObserverHarness;
let nav: HTMLElement;
let teardown: () => void;

const link = (hash: string): HTMLAnchorElement => {
  const found = document.querySelector<HTMLAnchorElement>(`a[href="${hash}"]`);
  if (!found) throw new Error(`missing link ${hash}`);
  return found;
};

beforeEach(() => {
  harness = installIntersectionObserver();
  document.body.innerHTML = markup;
  nav = document.querySelector<HTMLElement>('#nav')!;
  teardown = initNav(nav);
});

afterEach(() => {
  teardown();
  harness.restore();
  document.body.innerHTML = '';
});

describe('initNav sticky state', () => {
  it('adds the stuck class once the top sentinel leaves the viewport', () => {
    const sentinel = document.body.firstElementChild!;
    const observer = harness.observing(sentinel)!;

    observer.emit([{ target: sentinel, isIntersecting: false }]);
    expect(nav.classList.contains('is-stuck')).toBe(true);

    observer.emit([{ target: sentinel, isIntersecting: true }]);
    expect(nav.classList.contains('is-stuck')).toBe(false);
  });

  it('removes its sentinel on teardown', () => {
    teardown();
    teardown = () => {};

    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

describe('initNav scrollspy', () => {
  const section = (id: string): Element => document.querySelector(`#${id}`)!;

  it('marks the section being read', () => {
    const spy = harness.observing(section('work'))!;
    spy.emit([{ target: section('work'), isIntersecting: true }]);

    expect(link('#work').getAttribute('aria-current')).toBe('true');
    expect(link('#studio').hasAttribute('aria-current')).toBe(false);
  });

  it('moves the marker as the reader scrolls on', () => {
    const spy = harness.observing(section('work'))!;
    spy.emit([{ target: section('work'), isIntersecting: true }]);
    spy.emit([
      { target: section('work'), isIntersecting: false },
      { target: section('studio'), isIntersecting: true },
    ]);

    expect(link('#work').hasAttribute('aria-current')).toBe(false);
    expect(link('#studio').getAttribute('aria-current')).toBe('true');
  });

  it('marks nothing between sections', () => {
    const spy = harness.observing(section('work'))!;
    spy.emit([{ target: section('work'), isIntersecting: true }]);
    spy.emit([{ target: section('work'), isIntersecting: false }]);

    expect(document.querySelectorAll('[aria-current]').length).toBe(0);
  });

  it('breaks ties in document order, never at random', () => {
    const spy = harness.observing(section('work'))!;
    spy.emit([
      { target: section('studio'), isIntersecting: true },
      { target: section('work'), isIntersecting: true },
    ]);

    expect(link('#work').getAttribute('aria-current')).toBe('true');
  });

  it('only watches the band across the middle of the viewport', () => {
    expect(harness.observing(section('work'))?.options?.rootMargin).toBe('-45% 0px -50% 0px');
  });
});
