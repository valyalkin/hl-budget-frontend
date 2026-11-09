import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EChart from '@/app/ui/charts/echart';

const chart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  dispatchAction: vi.fn(),
};
const init = vi.fn<(...args: unknown[]) => typeof chart>(() => chart);

vi.mock('@/app/ui/charts/echarts-setup', () => ({
  init: (...args: unknown[]) => init(...args),
}));

const describeItem = (index: number) => `Item ${index}`;
const buildOption = vi.fn(({ narrow }: { narrow: boolean }) => ({ narrow }));

function chartWith(dataKey: string) {
  return (
    <EChart
      label="Bar chart of things"
      itemsLabel="Things"
      count={3}
      dataKey={dataKey}
      buildOption={buildOption}
      describe={describeItem}
      height={320}
    />
  );
}

async function ready() {
  await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
}

function slider() {
  return screen.getByRole('slider', { name: 'Things' });
}

const tip = (dataIndex: number) => ({
  type: 'showTip',
  seriesIndex: 0,
  dataIndex,
});

describe('EChart (specs/011 R-004, R-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts ECharts with the SVG renderer, sets the option, and disposes on unmount', async () => {
    const { unmount } = render(chartWith('a'));
    await ready();
    expect(init).toHaveBeenCalledWith(expect.any(HTMLElement), null, {
      renderer: 'svg',
    });
    expect(chart.setOption).toHaveBeenCalledWith(
      { narrow: expect.any(Boolean) },
      { notMerge: true },
    );
    unmount();
    expect(chart.dispose).toHaveBeenCalled();
  });

  it('sets the option again only when the data changes', async () => {
    const { rerender } = render(chartWith('a'));
    await ready();
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    rerender(chartWith('a'));
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    rerender(chartWith('b'));
    await waitFor(() => expect(chart.setOption).toHaveBeenCalledTimes(2));
  });

  it('is an image named by its summary, with a keyboard slider over it', async () => {
    render(chartWith('a'));
    expect(
      screen.getByRole('img', { name: 'Bar chart of things' }),
    ).toBeInTheDocument();
    expect(slider()).toHaveAttribute('tabindex', '0');
    expect(slider()).toHaveAttribute('aria-valuemax', '2');
    expect(slider()).toHaveAttribute(
      'aria-valuetext',
      'Use the arrow keys to read each one',
    );
    await ready();
  });

  it('steps through items with the arrow keys and reads each out', async () => {
    render(chartWith('a'));
    await ready();
    act(() => slider().focus());
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(0));
    expect(slider()).toHaveAttribute('aria-valuetext', 'Item 0');
    fireEvent.keyDown(slider(), { key: 'ArrowRight' });
    fireEvent.keyDown(slider(), { key: 'ArrowDown' });
    fireEvent.keyDown(slider(), { key: 'ArrowRight' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(2));
    expect(slider()).toHaveAttribute('aria-valuenow', '2');
    expect(slider()).toHaveAttribute('aria-valuetext', 'Item 2');
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(1));
    fireEvent.keyDown(slider(), { key: 'ArrowUp' });
    fireEvent.keyDown(slider(), { key: 'ArrowUp' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(0));
    fireEvent.keyDown(slider(), { key: 'End' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(2));
    fireEvent.keyDown(slider(), { key: 'Home' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith(tip(0));
    fireEvent.keyDown(slider(), { key: 'Escape' });
    expect(chart.dispatchAction).toHaveBeenLastCalledWith({ type: 'hideTip' });
  });

  it('hides the tooltip on blur and on a tap outside the chart', async () => {
    render(chartWith('a'));
    await ready();
    act(() => slider().focus());
    act(() => slider().blur());
    expect(chart.dispatchAction).toHaveBeenLastCalledWith({ type: 'hideTip' });
    chart.dispatchAction.mockClear();
    fireEvent.pointerDown(screen.getByRole('img'));
    expect(chart.dispatchAction).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(chart.dispatchAction).toHaveBeenLastCalledWith({ type: 'hideTip' });
  });
});
