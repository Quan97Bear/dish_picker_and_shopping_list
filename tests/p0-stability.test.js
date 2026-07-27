import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMenuPrimaryActionLabel, stepServings } from '../src/features/picker/menu-drawer.js';
import { getDietaryConflictIds } from '../src/features/picker/picker.js';
import { resetScrollForInstantViewChange } from '../src/shared/route-transition.js';
import { copyText, shareUrl } from '../src/shared/share.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('servings stepper', () => {
  it('moves one serving at a time and clamps to 1–8', () => {
    expect(stepServings(2, 1)).toBe(3);
    expect(stepServings(2, -1)).toBe(1);
    expect(stepServings(1, -1)).toBe(1);
    expect(stepServings(8, 1)).toBe(8);
  });

  it('handles consecutive changes without resetting to the initial value', () => {
    let servings = 2;
    for (let index = 0; index < 10; index += 1) servings = stepServings(servings, 1);
    expect(servings).toBe(8);
    for (let index = 0; index < 10; index += 1) servings = stepServings(servings, -1);
    expect(servings).toBe(1);
  });
});

describe('menu completion action', () => {
  it('finishes a selected menu without presenting sharing as the primary action', () => {
    expect(getMenuPrimaryActionLabel(['tomato-egg'])).toBe('完成选菜');
    expect(getMenuPrimaryActionLabel([])).toBe('发送建议');
  });

  it('resets to the result-page top without exposing smooth scrolling', () => {
    const page = { style: { scrollBehavior: 'smooth' } };
    const scrollTo = vi.fn(() => {
      expect(page.style.scrollBehavior).toBe('auto');
    });
    let restore;

    resetScrollForInstantViewChange({
      documentRef: { documentElement: page },
      windowRef: { scrollTo },
      scheduleFrame: (callback) => { restore = callback; }
    });

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(page.style.scrollBehavior).toBe('auto');
    restore();
    expect(page.style.scrollBehavior).toBe('smooth');
  });
});

describe('dietary conflicts', () => {
  it('reports conflicts without changing selected IDs or notes', () => {
    const selected = ['tomato-egg', 'garlic-broccoli'];
    const notes = { 'tomato-egg': '不要葱' };
    const dishMap = new Map([
      ['tomato-egg', { avoid: ['egg'] }],
      ['garlic-broccoli', { avoid: [] }]
    ]);

    expect([...getDietaryConflictIds(selected, dishMap, new Set(['egg']))]).toEqual(['tomato-egg']);
    expect(selected).toEqual(['tomato-egg', 'garlic-broccoli']);
    expect(notes).toEqual({ 'tomato-egg': '不要葱' });
  });
});

describe('share fallback', () => {
  it('returns shared after native sharing succeeds', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });

    await expect(shareUrl('https://example.test/menu')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: '今晚的菜单',
      text: '今晚吃这些，点开看菜谱和采购清单。',
      url: 'https://example.test/menu'
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(shareUrl('https://example.test/menu')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://example.test/menu');
  });

  it('copies after a real native-share failure', async () => {
    const error = new Error('share unavailable');
    error.name = 'NotAllowedError';
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(error),
      clipboard: { writeText }
    });

    await expect(shareUrl('https://example.test/menu')).resolves.toBe('copied-after-failure');
    expect(writeText).toHaveBeenCalledWith('https://example.test/menu');
  });

  it('treats user cancellation as cancellation and does not copy', async () => {
    const error = new Error('cancelled');
    error.name = 'AbortError';
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(error),
      clipboard: { writeText }
    });

    await expect(shareUrl('https://example.test/menu')).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('uses the legacy textarea copy fallback and removes it afterward', async () => {
    const select = vi.fn();
    const remove = vi.fn();
    const area = { value: '', style: {}, select, remove };
    const append = vi.fn();
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(area),
      body: { append },
      execCommand
    });

    await copyText('https://example.test/menu');

    expect(area.value).toBe('https://example.test/menu');
    expect(area.style).toMatchObject({ position: 'fixed', opacity: '0' });
    expect(append).toHaveBeenCalledWith(area);
    expect(select).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(remove).toHaveBeenCalledOnce();
  });
});
