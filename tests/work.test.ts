import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initWorkDeepLinks } from '../src/features/work.ts';

const markup = ['meridian', 'halcyon', 'osmo']
  .map(
    (slug) =>
      `<details class="work-item" name="work" id="work-${slug}"><summary>${slug}</summary><div></div></details>`,
  )
  .join('');

let teardown: () => void;

const item = (slug: string): HTMLDetailsElement => {
  const found = document.querySelector<HTMLDetailsElement>(`#work-${slug}`);
  if (!found) throw new Error(`missing ${slug}`);
  return found;
};

/** happy-dom does not implement the exclusive behaviour of `<details name>`. */
const open = (slug: string): void => {
  for (const other of document.querySelectorAll('details')) {
    if (other.id !== `work-${slug}` && other.open) {
      other.open = false;
      other.dispatchEvent(new Event('toggle'));
    }
  }

  item(slug).open = true;
  item(slug).dispatchEvent(new Event('toggle'));
};

const close = (slug: string): void => {
  item(slug).open = false;
  item(slug).dispatchEvent(new Event('toggle'));
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = markup;
  teardown = initWorkDeepLinks();
});

afterEach(() => {
  teardown();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('initWorkDeepLinks', () => {
  it('puts the open case study in the URL', () => {
    open('halcyon');

    expect(window.location.hash).toBe('#work-halcyon');
  });

  it('follows the reader from one study to the next', () => {
    open('halcyon');
    open('osmo');

    expect(window.location.hash).toBe('#work-osmo');
  });

  it('clears the hash when the study is closed again', () => {
    open('halcyon');
    close('halcyon');

    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/');
  });

  it('leaves the URL alone when a study closes that was not the one linked', () => {
    open('osmo');
    window.history.replaceState(null, '', '#work-osmo');

    // A sibling closing should not wipe the hash the open one just set.
    close('halcyon');

    expect(window.location.hash).toBe('#work-osmo');
  });

  it('opens the study a link points at', () => {
    teardown();
    window.history.replaceState(null, '', '#work-meridian');
    teardown = initWorkDeepLinks();

    expect(item('meridian').open).toBe(true);
    expect(item('halcyon').open).toBe(false);
  });

  it('responds to the back button', () => {
    open('halcyon');

    window.history.replaceState(null, '', '#work-osmo');
    window.dispatchEvent(new Event('hashchange'));

    expect(item('osmo').open).toBe(true);
    expect(item('halcyon').open).toBe(false);
  });

  it('does not echo its own opening back into the URL', () => {
    teardown();
    window.history.replaceState(null, '', '#work-osmo');
    teardown = initWorkDeepLinks();

    expect(window.location.hash).toBe('#work-osmo');
  });

  it('ignores a hash that names nothing', () => {
    teardown();
    window.history.replaceState(null, '', '#work-nothing');
    teardown = initWorkDeepLinks();

    for (const slug of ['meridian', 'halcyon', 'osmo']) {
      expect(item(slug).open).toBe(false);
    }
  });

  it('does nothing, safely, when there is no work index', () => {
    document.body.innerHTML = '';

    expect(() => initWorkDeepLinks()()).not.toThrow();
  });
});
