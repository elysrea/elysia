import { describe, expect, it } from 'vitest';

import { composeMailto, initBrief } from '../src/features/brief.ts';

const EMAIL = 'studio@elysia.example';

describe('composeMailto', () => {
  it('carries the subject even when nothing is filled in', () => {
    const href = composeMailto(EMAIL, 'Project enquiry', [
      { label: 'Timeline', value: '' },
      { label: 'Team', value: '   ' },
    ]);

    expect(href).toBe(`mailto:${EMAIL}?subject=Project%20enquiry`);
    expect(href).not.toContain('body');
  });

  it('percent-encodes spaces rather than writing a plus', () => {
    // URLSearchParams is form encoding; a mail client reading a mailto: query
    // shows the plus sign literally.
    const href = composeMailto(EMAIL, 'Project enquiry', [
      { label: 'Timeline', value: 'Kickoff in March' },
    ]);

    expect(href).not.toContain('+');
    expect(href).toContain('subject=Project%20enquiry');
  });

  it('writes one labelled line per answered field, blank line between', () => {
    const href = composeMailto(EMAIL, 'Enquiry', [
      { label: 'Building', value: 'A data platform' },
      { label: 'Timeline', value: 'March' },
    ]);

    const body = new URL(href).searchParams.get('body');
    expect(body).toBe('Building: A data platform\n\nTimeline: March');
  });

  it('drops the fields left empty instead of sending blank headings', () => {
    const href = composeMailto(EMAIL, 'Enquiry', [
      { label: 'Building', value: 'A data platform' },
      { label: 'Timeline', value: '' },
      { label: 'Team', value: 'Two founders' },
    ]);

    const body = new URL(href).searchParams.get('body');
    expect(body).toBe('Building: A data platform\n\nTeam: Two founders');
    expect(body).not.toContain('Timeline');
  });

  it('trims what the visitor typed', () => {
    const href = composeMailto(EMAIL, 'Enquiry', [{ label: 'Team', value: '  Two founders  ' }]);

    expect(new URL(href).searchParams.get('body')).toBe('Team: Two founders');
  });
});

describe('initBrief', () => {
  function mount(): { root: HTMLElement; action: HTMLAnchorElement; input: HTMLInputElement } {
    document.body.innerHTML = `
      <div data-brief>
        <input data-brief-field data-label="Building" name="building" />
        <a
          data-brief-action
          data-email="${EMAIL}"
          data-subject="Project enquiry"
          href="mailto:${EMAIL}?subject=Project%20enquiry"
          >Open the email</a
        >
      </div>`;

    const root = document.querySelector<HTMLElement>('[data-brief]')!;
    return {
      root,
      action: root.querySelector<HTMLAnchorElement>('[data-brief-action]')!,
      input: root.querySelector<HTMLInputElement>('[data-brief-field]')!,
    };
  }

  it('rewrites the href as the visitor types', () => {
    const { root, action, input } = mount();
    initBrief(root);

    input.value = 'A data platform';
    input.dispatchEvent(new Event('input'));

    expect(action.href).toContain('body=Building%3A%20A%20data%20platform');
  });

  it('leaves a working link before anything is typed', () => {
    const { root, action } = mount();
    initBrief(root);

    expect(action.href).toBe(`mailto:${EMAIL}?subject=Project%20enquiry`);
  });

  it('falls back to the input name when no label is given', () => {
    const { root, action, input } = mount();
    input.removeAttribute('data-label');
    initBrief(root);

    input.value = 'x';
    input.dispatchEvent(new Event('input'));

    expect(action.href).toContain('building%3A%20x');
  });

  it('does nothing when the markup it expects is not there', () => {
    document.body.innerHTML = '<div data-brief></div>';
    const root = document.querySelector<HTMLElement>('[data-brief]')!;

    expect(() => initBrief(root)).not.toThrow();
  });
});
