import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneUiProvider, {
  type PhoneUi,
  usePhoneUi,
} from '@/app/ui/phone/phone-ui-provider';
import { nextPopState } from '@/app/ui/phone/test-support';

let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function Probe({ onUi }: { onUi: (next: PhoneUi) => void }) {
  const current = usePhoneUi();
  useEffect(() => {
    onUi(current);
  });
  return (
    <p data-testid="state">
      {current.layers.map((layer) => layer.kind).join('>') || 'list'}|
      {current.view}|{current.chart}|{current.notice}|
      {current.importSession ? current.importSession.rows.length : 'none'}
    </p>
  );
}

const state = () => screen.getByTestId('state').textContent;

function setup() {
  return render(
    <PhoneUiProvider>
      <Probe onUi={grab} />
    </PhoneUiProvider>,
  );
}

async function back(run: () => void) {
  const popped = nextPopState();
  act(run);
  await act(() => popped);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/spendings');
});

describe('PhoneUiProvider', () => {
  it('starts on the list with the Spendings view and the table', () => {
    setup();
    expect(state()).toBe('list|spendings|table||none');
  });

  it('gives each layer one history entry, and Back closes only the top one', async () => {
    const push = vi.spyOn(window.history, 'pushState');
    setup();
    act(() => ui.open({ kind: 'edit', spendingId: 'x' }));
    act(() => ui.open({ kind: 'confirm-delete' }));
    expect(push).toHaveBeenCalledTimes(2);
    expect(state()).toMatch(/^edit>confirm-delete\|/);
    // The phone's back gesture: no close() call, just history.
    await back(() => window.history.back());
    expect(state()).toMatch(/^edit\|/);
    await back(() => ui.close());
    expect(state()).toMatch(/^list\|/);
  });

  it('runs a follow-up only after the layers have closed', async () => {
    setup();
    act(() => ui.open({ kind: 'edit' }));
    act(() => ui.open({ kind: 'confirm-delete' }));
    const then = vi.fn(() => ui.notify('Deleted Corner Bakery · $12.40'));
    await back(() => ui.close(2, then));
    expect(then).toHaveBeenCalledOnce();
    expect(state()).toBe(
      'list|spendings|table|Deleted Corner Bakery · $12.40|none',
    );
  });

  it('swaps the menu for Settings without a new history entry', async () => {
    setup();
    act(() => ui.open({ kind: 'menu' }));
    const push = vi.spyOn(window.history, 'pushState');
    act(() => ui.replaceTop({ kind: 'settings' }));
    expect(push).not.toHaveBeenCalled();
    expect(state()).toMatch(/^settings\|/);
    await back(() => window.history.back());
    expect(state()).toMatch(/^list\|/);
  });

  it('keeps the import rows while fixing a row, and discards them when leaving the review', async () => {
    setup();
    act(() => ui.open({ kind: 'import' }));
    act(() =>
      ui.setImportSession({
        fileName: 'oct.csv',
        idempotencyKey: '00000000-0000-4000-8000-000000000000',
        rows: [
          {
            key: 'r1',
            draft: {
              date: '',
              merchant: '',
              category: '',
              account: '',
              amount: '',
            },
          },
        ],
      }),
    );
    act(() => ui.open({ kind: 'review' }));
    act(() => ui.open({ kind: 'fix-row', key: 'r1' }));
    await back(() => ui.close());
    expect(state()).toBe('import>review|spendings|table||1');
    await back(() => window.history.back());
    expect(state()).toBe('import|spendings|table||none');
  });

  it('clears the notice on the next action', () => {
    setup();
    act(() => ui.notify('Added 3 spendings from oct.csv'));
    act(() => ui.setChart('pie'));
    expect(state()).toBe('list|spendings|pie||none');
    act(() => ui.notify('again'));
    act(() => ui.setView('by-category'));
    expect(state()).toBe('list|by-category|pie||none');
  });

  it('forgets a stale layer marker on reload, so the list shows', () => {
    window.history.replaceState({ hlbPhone: 2 }, '', '/spendings');
    setup();
    expect(state()).toMatch(/^list\|/);
    expect((window.history.state as { hlbPhone: number }).hlbPhone).toBe(0);
  });

  it('reset() steps back over every open layer', async () => {
    const go = vi.spyOn(window.history, 'go');
    setup();
    act(() => ui.open({ kind: 'import' }));
    act(() => ui.open({ kind: 'review' }));
    await back(() => ui.reset());
    expect(go).toHaveBeenCalledWith(-2);
    expect(state()).toMatch(/^list\|/);
  });
});
