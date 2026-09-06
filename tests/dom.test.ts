import { afterEach, describe, expect, it, vi } from 'vitest';

import { query, queryAll, readRatioToken } from '../src/lib/dom.ts';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('query helpers', () => {
  it('finds elements and returns null rather than throwing', () => {
    document.body.innerHTML = '<p class="a">one</p><p class="a">two</p>';

    expect(query<HTMLElement>('.a')?.textContent).toBe('one');
    expect(query('.missing')).toBeNull();
    expect(queryAll('.a')).toHaveLength(2);
    expect(queryAll('.missing')).toEqual([]);
  });

  it('can be scoped to a subtree', () => {
    document.body.innerHTML = '<div id="s"><b>in</b></div><b>out</b>';
    const scope = query<HTMLElement>('#s')!;

    expect(queryAll('b', scope)).toHaveLength(1);
  });
});

describe('readRatioToken', () => {
  const withComputedValue = (value: string): HTMLElement => {
    const element = document.createElement('div');
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn(() => ({ getPropertyValue: () => value })),
    );
    return element;
  };

  it('reads a percentage as a fraction', () => {
    expect(readRatioToken(withComputedValue('66%'), '--horizon', 0.5)).toBeCloseTo(0.66);
  });

  it('reads a unitless number as-is', () => {
    expect(readRatioToken(withComputedValue('0.42'), '--horizon', 0.5)).toBeCloseTo(0.42);
  });

  it('falls back when the property is missing or unparseable', () => {
    expect(readRatioToken(withComputedValue(''), '--horizon', 0.66)).toBe(0.66);
    expect(readRatioToken(withComputedValue('calc(1px)'), '--horizon', 0.66)).toBe(0.66);
  });
});
