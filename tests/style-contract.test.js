import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

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
