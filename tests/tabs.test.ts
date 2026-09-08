import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initTabs } from '../src/features/tabs.ts';

const names = ['palette', 'type', 'motion'];

const markup = `
  <div class="deck">
    <div class="deck-tabs" data-tablist>
      ${names.map((name) => `<a href="#bench-${name}" data-tab="${name}">${name}</a>`).join('')}
    </div>
    ${names.map((name) => `<div id="bench-${name}" data-panel="${name}">${name} panel</div>`).join('')}
  </div>`;

let teardown: () => void;

const root = (): Element => {
  const found = document.querySelector('.deck');
  if (!found) throw new Error('missing deck');
  return found;
};

const tab = (name: string): HTMLAnchorElement => {
  const found = document.querySelector<HTMLAnchorElement>(`[data-tab="${name}"]`);
  if (!found) throw new Error(`missing tab ${name}`);
  return found;
};

const panel = (name: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`[data-panel="${name}"]`);
  if (!found) throw new Error(`missing panel ${name}`);
  return found;
};

const shown = (): string[] => names.filter((name) => !panel(name).hidden);

const click = (name: string, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  tab(name).dispatchEvent(event);
  return event;
};

const press = (key: string): void => {
  const selected = document.querySelector<HTMLElement>('[aria-selected="true"]');
  selected?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

beforeEach(() => {
  document.body.innerHTML = markup;
  teardown = initTabs(root(), { idPrefix: 'bench' });
});

afterEach(() => {
  teardown();
  document.body.innerHTML = '';
});

describe('initTabs', () => {
  it('opens on the first panel and shows one at a time', () => {
    expect(shown()).toEqual(['palette']);

    click('motion');

    expect(shown()).toEqual(['motion']);
  });

  it('does not follow the link, because the panel is already in front of you', () => {
    expect(click('type').defaultPrevented).toBe(true);
  });

  it('leaves a modified click alone, because that means "new tab"', () => {
    expect(click('type', { metaKey: true }).defaultPrevented).toBe(false);
    expect(shown()).toEqual(['palette']);
  });

  it('describes itself as tabs, so a screen reader announces it as one', () => {
    expect(document.querySelector('[data-tablist]')?.getAttribute('role')).toBe('tablist');
    expect(tab('type').getAttribute('role')).toBe('tab');
    expect(panel('type').getAttribute('role')).toBe('tabpanel');
    expect(panel('type').getAttribute('aria-labelledby')).toBe(tab('type').id);
  });

  it('is one tab stop, with arrows moving inside it', () => {
    expect(tab('palette').tabIndex).toBe(0);
    expect(tab('type').tabIndex).toBe(-1);

    press('ArrowRight');

    expect(shown()).toEqual(['type']);
    expect(tab('type').tabIndex).toBe(0);
    expect(tab('palette').tabIndex).toBe(-1);
  });

  it('wraps at both ends and jumps with Home and End', () => {
    press('ArrowLeft');
    expect(shown()).toEqual(['motion']);

    press('Home');
    expect(shown()).toEqual(['palette']);

    press('End');
    expect(shown()).toEqual(['motion']);
  });

  it('ignores keys that are not navigation', () => {
    press('a');

    expect(shown()).toEqual(['palette']);
  });

  it('reports the selection to whoever asked', () => {
    teardown();
    const onSelect = vi.fn();
    teardown = initTabs(root(), { onSelect });

    click('motion');

    expect(onSelect).toHaveBeenLastCalledWith('motion');
  });

  it('leaves the URL alone: a widget is not a place', () => {
    const before = window.location.href;

    click('motion');

    expect(window.location.href).toBe(before);
  });

  it('puts every panel back on the page when torn down', () => {
    click('motion');
    teardown();
    teardown = () => {};

    expect(shown()).toEqual(names);
    expect(root().hasAttribute('data-tabs')).toBe(false);
  });

  it('does nothing, safely, without a tablist or panels', () => {
    document.body.innerHTML = '<div class="deck"></div>';
    expect(() => initTabs(root())()).not.toThrow();

    document.body.innerHTML = '<div class="deck"><div data-tablist></div></div>';
    expect(() => initTabs(root())()).not.toThrow();
  });
});
