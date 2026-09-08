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

describe('initNav and the current section', () => {
  it('leaves marking the current section to the deck', () => {
    // Which section is current used to be inferred here from scroll position.
    // The deck shows one at a time now, so it is a fact rather than a guess,
    // and two things marking the same links would fight.
    const work = document.querySelector('#work');
    expect(work).not.toBeNull();
    expect(harness.observing(work!)).toBeUndefined();
    expect(document.querySelectorAll('.nav-links [aria-current]')).toHaveLength(0);
  });
});
