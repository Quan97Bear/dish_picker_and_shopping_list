import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMenuPrimaryActionLabel, stepServings } from '../src/features/picker/menu-drawer.js';
import { getDietaryConflictIds } from '../src/features/picker/picker.js';
import { getNextResultTabIndex, getShoppingCollapseState } from '../src/features/recipient/recipient.js';
import { resetScrollForInstantViewChange } from '../src/shared/route-transition.js';
import { copyText, shareUrl } from '../src/shared/share.js';
import { getShareDialogCopy } from '../src/shared/share-dialog.js';

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
    expect(getMenuPrimaryActionLabel([])).toBe('查看想吃清单');
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

describe('result page controls', () => {
  it('presents menu sharing as a secondary result-page action', () => {
    expect(getShareDialogCopy(true)).toEqual({
      eyebrow: '菜单已备好',
      title: '把今晚的好味分享出去',
      description: '持有链接的人可以查看菜单和菜单外想吃的菜'
    });
    expect(getShareDialogCopy(false)).toEqual({
      eyebrow: '想吃清单已备好',
      title: '把想吃的菜分享出去',
      description: '持有链接的人可以查看这些菜单外想吃的菜'
    });
  });

  it('supports wrapping arrow navigation and Home/End between result tabs', () => {
    expect(getNextResultTabIndex(0, 'ArrowRight', 2)).toBe(1);
    expect(getNextResultTabIndex(1, 'ArrowRight', 2)).toBe(0);
    expect(getNextResultTabIndex(0, 'ArrowLeft', 2)).toBe(1);
    expect(getNextResultTabIndex(1, 'Home', 2)).toBe(0);
    expect(getNextResultTabIndex(0, 'End', 2)).toBe(1);
  });

  it('keeps the shopping heading available while collapsing only its groups', () => {
    expect(getShoppingCollapseState(false)).toEqual({
      ariaExpanded: 'false',
      label: '展开整个采购清单',
      groupsHidden: true
    });
    expect(getShoppingCollapseState(true)).toEqual({
      ariaExpanded: 'true',
      label: '收起整个采购清单',
      groupsHidden: false
    });
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
