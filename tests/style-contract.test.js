import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const pickerSource = fs.readFileSync(new URL('../src/features/picker/picker.js', import.meta.url), 'utf8');

describe('floating basket layout contract', () => {
  it('keeps the basket 13px from the right and bottom safe-area edges at every width', () => {
    const bottomBarBlocks = [...styles.matchAll(/\.bottom-bar\s*\{([^}]*)\}/g)]
      .map((match) => match[1]);
    const rightOffsets = bottomBarBlocks.flatMap((block) => (
      [...block.matchAll(/right:\s*calc\((\d+)px\s*\+\s*env\(safe-area-inset-right,0px\)\)/g)]
        .map((match) => Number(match[1]))
    ));
    const bottomOffsets = bottomBarBlocks.flatMap((block) => (
      [...block.matchAll(/bottom:\s*calc\((\d+)px\s*\+\s*env\(safe-area-inset-bottom,0px\)\)/g)]
        .map((match) => Number(match[1]))
    ));

    expect(rightOffsets).toEqual([13]);
    expect(bottomOffsets).toEqual([13]);
  });
});

describe('picker preference row layout contract', () => {
  it('keeps category, dietary and sticky rows at the same 56px height', () => {
    expect(styles).toMatch(
      /\.filter-toolbar\{[^}]*height:56px;[^}]*padding:4px max\(14px,calc\(\(100% - 1160px\)\/2 \+ 24px\)\)/,
    );
    expect(styles).toMatch(
      /\.avoid-section\{position:relative;height:56px;[^}]*padding-block:6px\}/,
    );
  });
});

describe('picker assistant tab layout contract', () => {
  it('keeps both assistant entries side by side with full touch targets', () => {
    expect(styles).toMatch(
      /\.picker-assistants\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
    );
    expect(styles).toMatch(
      /\.picker-assistants>button\{[^}]*min-height:50px;[^}]*justify-content:center/,
    );
    expect(pickerSource).not.toContain('<i aria-hidden="true">→</i>');
  });
});

describe('dish add control icon contract', () => {
  it('draws a compact 10px plus geometrically from the icon center', () => {
    expect(styles).toMatch(
      /\.add-button\[aria-pressed="false"\] \.add-button-icon:before,[\s\S]*top:50%;[\s\S]*left:50%;[\s\S]*width:10px;[\s\S]*height:2px;[\s\S]*transform:translate\(-50%,-50%\)/,
    );
    expect(styles).toMatch(
      /\.add-button\[aria-pressed="false"\] \.add-button-icon:after\{[^}]*rotate\(90deg\)/,
    );
  });
});

describe('dish note editor layout contract', () => {
  it('keeps each dish in one card with a full-width note input', () => {
    expect(styles).toMatch(
      /\.selected-list li\{[^}]*padding:10px 12px;[^}]*border-radius:16px/,
    );
    expect(styles).toMatch(
      /\.selected-dish input\{[^}]*width:100%;[^}]*height:44px/,
    );
    expect(styles).not.toContain('.note-done');
  });
});

describe('mobile search focus contract', () => {
  it('puts the hero-search scrim above the sticky toolbar and below the search field', () => {
    expect(styles).toMatch(
      /html\[data-search-kind="hero"\] \.hero-search\{[^}]*z-index:16/,
    );
    expect(styles).toMatch(
      /html\[data-search-kind="hero"\] \.search-scrim\{[^}]*z-index:15/,
    );
    expect(styles).toMatch(/\.filter-toolbar\{[^}]*z-index:14/);
  });

  it('locks the page and blocks interaction below either active search field', () => {
    expect(styles).toMatch(
      /html\[data-search-kind="hero"\],[\s\S]*html\[data-search-kind="hero"\] body\{[^}]*overflow:hidden/,
    );
    expect(styles).toMatch(
      /html\[data-search-active\] \.search-scrim\{[^}]*pointer-events:auto/,
    );
    expect(styles).toMatch(
      /\.search-scrim\{[^}]*touch-action:none;[^}]*backdrop-filter:blur\(5px\)/,
    );
  });

  it('prevents focus scrolling and treats Enter as keyboard completion', () => {
    expect(pickerSource.match(/enterkeyhint="done"/g)).toHaveLength(2);
    expect(pickerSource).toContain('input.focus({ preventScroll: true })');
    expect(pickerSource).toMatch(
      /event\.key !== 'Enter' \|\| event\.isComposing[\s\S]*event\.preventDefault\(\);[\s\S]*input\.blur\(\)/,
    );
  });
});
