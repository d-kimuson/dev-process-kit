import { render } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialogController, type ConfirmDialogOptions } from './controller';

const OPTIONS: ConfirmDialogOptions = {
  title: 'Turn off Check Mode?',
  body: 'Every mark will be cleared.',
  confirmLabel: 'Turn off',
  cancelLabel: 'Keep it on',
};

const setup = () => {
  const container = document.createElement('div');
  document.body.append(container);
  const draw = (): void => {
    render(controller.render(), container);
    controller.hostUpdated();
  };
  const host = { addController: vi.fn(), removeController: vi.fn(), requestUpdate: vi.fn(draw) } as const;
  const controller = new ConfirmDialogController({
    ...host,
    renderRoot: container,
    updateComplete: Promise.resolve(true),
  } as never);
  return { controller, container };
};

const dialogOf = (container: HTMLElement): HTMLDialogElement => {
  const dialog = container.querySelector('dialog');
  if (dialog === null) throw new Error('no dialog');
  return dialog;
};

describe('ConfirmDialogController', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders nothing until asked', () => {
    const { container } = setup();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('resolves true when the confirm button is picked', async () => {
    const { controller, container } = setup();
    const answer = controller.ask(OPTIONS);
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.dpk-confirm-dialog-title')?.textContent).toBe(OPTIONS.title);
    dialog.querySelector<HTMLButtonElement>('button[value="confirm"]')?.click();
    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when the cancel button is picked', async () => {
    const { controller, container } = setup();
    const answer = controller.ask(OPTIONS);
    dialogOf(container).querySelector<HTMLButtonElement>('button[value="cancel"]')?.click();
    await expect(answer).resolves.toBe(false);
  });

  it('resolves false on Escape (a cancelled dialog, never submitted)', async () => {
    const { controller, container } = setup();
    const answer = controller.ask(OPTIONS);
    const dialog = dialogOf(container);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.close();
    await expect(answer).resolves.toBe(false);
  });

  it('settles a stale pending ask with false once a new one is made', async () => {
    const { controller } = setup();
    const first = controller.ask(OPTIONS);
    const second = controller.ask(OPTIONS);
    await expect(first).resolves.toBe(false);
    expect(second).toBeInstanceOf(Promise);
  });
});
