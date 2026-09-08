import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initDeckTabs, sectionForHash } from '../src/features/deck.ts';
import { sections } from '../src/content/site.ts';

const ids = sections.map((section) => section.id);

describe('sectionForHash', () => {
  it('finds a section by its own hash', () => {
    for (const id of ids) expect(sectionForHash(`#${id}`, ids)).toBe(id);
  });

  it('finds the section a case study lives in', () => {
    // #work-meridian has to mean the Work panel and that study, so the deck and
    // the work feature can each read it without knowing about the other.
    expect(sectionForHash('#work-meridian', ids)).toBe('work');
    expect(sectionForHash('#work-osmo', ids)).toBe('work');
  });

  it('returns nothing for an empty or unknown hash', () => {
    expect(sectionForHash('', ids)).toBeNull();
    expect(sectionForHash('#', ids)).toBeNull();
    expect(sectionForHash('#nowhere', ids)).toBeNull();
  });

  it('does not match a section that is merely a prefix of another word', () => {
    expect(sectionForHash('#workshop', ids)).toBeNull();
  });
});

describe('initDeckTabs', () => {
  let teardown: () => void;

  const markup = `
    <nav class="nav-links">
      <a href="#practice">Practice</a><a href="#work">Work</a><a href="#studio">Studio</a>
    </nav>
    <div class="deck">
      <div class="deck-tabs">
        ${ids.map((id) => `<a class="deck-tab" href="#${id}" data-section="${id}">${id}</a>`).join('')}
      </div>
      ${ids.map((id) => `<section class="section" id="${id}">${id} panel</section>`).join('')}
    </div>`;

  const tab = (id: string): HTMLAnchorElement => {
    const found = document.querySelector<HTMLAnchorElement>(`.deck-tabs [data-section="${id}"]`);
    if (!found) throw new Error(`missing tab ${id}`);
    return found;
  };

  const panel = (id: string): HTMLElement => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`missing panel ${id}`);
    return found;
  };

  const shown = (): string[] => ids.filter((id) => !panel(id).hidden);

  const click = (id: string, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    tab(id).dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = markup;
    teardown = initDeckTabs();
  });

  afterEach(() => {
    teardown();
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/');
  });

  it('opens on the first section', () => {
    expect(shown()).toEqual(['practice']);
    expect(tab('practice').getAttribute('aria-selected')).toBe('true');
  });

  it('shows one panel at a time', () => {
    click('studio');

    expect(shown()).toEqual(['studio']);
  });

  it('does not follow the link, because the panel is already in front of you', () => {
    const event = click('work');

    expect(event.defaultPrevented).toBe(true);
  });

  it('puts the choice in the URL', () => {
    click('work');

    expect(window.location.hash).toBe('#work');
  });

  it('marks the header link for the section on show', () => {
    click('work');

    const marked = [...document.querySelectorAll('.nav-links [aria-current]')];
    expect(marked).toHaveLength(1);
    expect(marked[0]?.getAttribute('href')).toBe('#work');
  });

  it('opens on the section a link points at', () => {
    teardown();
    window.history.replaceState(null, '', '#studio');
    teardown = initDeckTabs();

    expect(shown()).toEqual(['studio']);
  });

  it('opens the panel a case study lives in, and leaves its hash alone', () => {
    teardown();
    window.history.replaceState(null, '', '#work-meridian');
    teardown = initDeckTabs();

    expect(shown()).toEqual(['work']);
    expect(window.location.hash).toBe('#work-meridian');
  });

  it('does not overwrite a case study hash when the work tab is re-selected', () => {
    click('studio');
    window.history.replaceState(null, '', '#work-osmo');
    window.dispatchEvent(new Event('hashchange'));

    expect(shown()).toEqual(['work']);
    expect(window.location.hash).toBe('#work-osmo');
  });

  it('follows the back button', () => {
    click('contact');
    window.history.replaceState(null, '', '#practice');
    window.dispatchEvent(new Event('hashchange'));

    expect(shown()).toEqual(['practice']);
  });

  it('leaves a modified click alone, because that means "new tab"', () => {
    const event = click('work', { metaKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(shown()).toEqual(['practice']);
  });

  describe('keyboard', () => {
    const press = (key: string): void => {
      const selected = document.querySelector<HTMLAnchorElement>('[aria-selected="true"]');
      selected?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    it('is one tab stop, with arrows moving inside it', () => {
      expect(tab('practice').tabIndex).toBe(0);
      expect(tab('work').tabIndex).toBe(-1);

      press('ArrowRight');

      expect(shown()).toEqual(['work']);
      expect(tab('work').tabIndex).toBe(0);
      expect(tab('practice').tabIndex).toBe(-1);
    });

    it('wraps at both ends', () => {
      press('ArrowLeft');
      expect(shown()).toEqual([ids[ids.length - 1]]);

      press('ArrowRight');
      expect(shown()).toEqual(['practice']);
    });

    it('jumps to the ends with Home and End', () => {
      press('End');
      expect(shown()).toEqual([ids[ids.length - 1]]);

      press('Home');
      expect(shown()).toEqual(['practice']);
    });

    it('ignores keys that are not navigation', () => {
      press('a');

      expect(shown()).toEqual(['practice']);
    });
  });

  it('describes itself as tabs, so a screen reader announces it as one', () => {
    expect(document.querySelector('.deck-tabs')?.getAttribute('role')).toBe('tablist');
    expect(tab('work').getAttribute('role')).toBe('tab');
    expect(panel('work').getAttribute('role')).toBe('tabpanel');
    expect(panel('work').getAttribute('aria-labelledby')).toBe(tab('work').id);
  });

  it('puts every section back on the page when torn down', () => {
    click('work');
    teardown();
    teardown = () => {};

    expect(shown()).toEqual(ids);
    expect(document.querySelector('.deck')?.hasAttribute('data-tabs')).toBe(false);
  });

  it('does nothing, safely, when there is no deck', () => {
    document.body.innerHTML = '';

    expect(() => initDeckTabs()()).not.toThrow();
  });
});
