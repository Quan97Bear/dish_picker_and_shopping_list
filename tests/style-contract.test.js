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
