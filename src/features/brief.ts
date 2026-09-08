/**
 * The brief composer.
 *
 * Three inputs that write a `mailto:` link. There is no endpoint and no
 * request: the enhancement is that the visitor's own mail client opens with
 * the subject and body already filled, which is the whole of it.
 *
 * Without JavaScript the composer is hidden by the cascade and the plain
 * address above it still works, so nothing here is load-bearing.
 */
export interface BriefLine {
  readonly label: string;
  readonly value: string;
}

/**
 * Builds the `mailto:` href.
 *
 * Empty lines are dropped rather than sent as blank headings — a brief with
 * "Timeline:" and nothing after it is worse than one without the line.
 */
export function composeMailto(email: string, subject: string, lines: readonly BriefLine[]): string {
  const body = lines
    .filter((line) => line.value.trim() !== '')
    .map((line) => `${line.label}: ${line.value.trim()}`)
    .join('\n\n');

  const params = new URLSearchParams();
  params.set('subject', subject);
  if (body !== '') params.set('body', body);

  // URLSearchParams is form encoding: it writes a space as '+'. A mail client
  // reading a mailto: query shows that plus sign literally, so the subject
  // arrives as "Project+enquiry". Percent-encoding is what mailto wants.
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`;
}

/**
 * Wires one composer. The action is an anchor, not a button: its href is
 * rewritten as the fields change, so a middle-click or a long-press behaves
 * the way it does on any other link.
 */
export function initBrief(root: HTMLElement): void {
  const action = root.querySelector<HTMLAnchorElement>('[data-brief-action]');
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('[data-brief-field]'));
  if (!action || inputs.length === 0) return;

  const email = action.dataset.email ?? '';
  const subject = action.dataset.subject ?? '';

  const update = (): void => {
    action.href = composeMailto(
      email,
      subject,
      inputs.map((input) => ({ label: input.dataset.label ?? input.name, value: input.value })),
    );
  };

  for (const input of inputs) input.addEventListener('input', update);
  update();
}
