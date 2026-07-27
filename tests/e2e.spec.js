import { test, expect } from '@playwright/test';
test('select, share, open menu and create shopping list', async ({ page }) => {
  await page.goto('/');
  for (const name of ['西红柿炒鸡蛋','芹菜炒肉','紫菜蛋花汤']) await page.getByRole('button',{name:`加入菜单：${name}`}).click();
  await expect(page.locator('.header-menu b')).toHaveText('3');
  await expect(page.locator('.bottom-bar b')).toHaveText('3');
  const menuButton = page.getByRole('button',{name:/查看菜单/});
  await menuButton.click();
  const menuDialog = page.getByRole('dialog',{name:'今日菜单'});
  await expect(menuDialog).toBeFocused();
  await menuDialog.press('Escape');
  await expect(menuButton).toBeFocused();
  await menuButton.click();
  await page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'}).click();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).fill('不要葱');
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).dispatchEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true});
  await expect(page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'})).toBeVisible();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).press('Enter');
  await expect(page.getByText('不要葱')).toBeVisible();
  const editNote = page.getByRole('button',{name:'修改西红柿炒鸡蛋的备注'});
  await expect(editNote).toBeVisible();
  await expect(editNote).not.toBeFocused();
  await page.getByRole('button',{name:'删除西红柿炒鸡蛋的备注'}).click();
  await expect(page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'})).toBeVisible();
  await page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'}).click();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).fill('不要葱');
  await page.getByRole('button',{name:'完成西红柿炒鸡蛋备注'}).click();
  await page.getByRole('button',{name:'完成选菜'}).click();
  await expect(page.getByRole('dialog',{name:'把今晚的好味分享出去'})).toBeFocused();
  const href = await page.getByRole('link',{name:'预览菜单'}).getAttribute('href');
  await page.goto(href);
  await expect(page.getByRole('heading',{name:'今晚吃这些'})).toBeVisible();
  await expect(page.getByText('不要葱')).toBeVisible();
  await expect(page.getByRole('link',{name:/菜谱来源/})).toHaveCount(0);
  const viewport = page.viewportSize();
  const recipesTitleBox = await page.getByRole('heading',{name:'菜谱详情'}).boundingBox();
  expect(Math.abs(recipesTitleBox.x + recipesTitleBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
  const shoppingTrigger = page.locator('.shopping-trigger');
  await shoppingTrigger.click();
  await expect(page.getByRole('heading',{name:'采购清单'})).toBeVisible();
  await expect(page.getByText('勾选状态会保存在这台设备上',{exact:true})).toBeVisible();
  await expect(shoppingTrigger).toHaveAttribute('aria-expanded', 'true');
  const shoppingPanelBox = await page.locator('.shopping-panel').boundingBox();
  expect(Math.abs(shoppingPanelBox.x - (viewport.width - shoppingPanelBox.width) / 2)).toBeLessThanOrEqual(1);
  const shoppingTitleBox = await page.getByRole('heading',{name:'采购清单'}).boundingBox();
  expect(Math.abs(shoppingTitleBox.x + shoppingTitleBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
  await expect(page.locator('.ingredient-source').filter({hasText:/用于：/}).first()).toBeVisible();
  const firstShoppingItem = page.locator('.shopping-panel input[type="checkbox"]').first();
  await firstShoppingItem.check();
  const vegetableGroup = page.locator('.shopping-group').filter({hasText:'蔬菜'});
  await expect(vegetableGroup).toHaveAttribute('open', '');
  await vegetableGroup.locator('summary').click();
  await expect(firstShoppingItem).toBeHidden();
  await vegetableGroup.locator('summary').click();
  await expect(firstShoppingItem).toBeChecked();
  await page.locator('.shopping-panel').getByRole('button',{name:/收起/}).click();
  await expect(page.getByRole('heading',{name:'采购清单'})).toBeHidden();
  await expect(shoppingTrigger).toBeFocused();
  await expect(shoppingTrigger).toHaveAttribute('aria-expanded', 'false');
  await shoppingTrigger.click();
  await expect(page.getByRole('heading',{name:'采购清单'})).toBeVisible();
  await expect(firstShoppingItem).toBeChecked();
});

test('share a new-dish suggestion without selecting a dish', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByLabel('想添加的新菜').fill('糖醋里脊、锅包肉');
  await page.getByRole('button',{name:'发送建议'}).click();
  await expect(page.getByText('持有链接的人可以查看这条建议',{exact:true})).toBeVisible();
  const href = await page.getByRole('link',{name:'预览建议'}).getAttribute('href');
  await page.goto(href);
  await expect(page.getByRole('heading',{name:'收到新菜建议'})).toBeVisible();
  await expect(page.getByText('糖醋里脊')).toBeVisible();
  await expect(page.getByText('锅包肉')).toBeVisible();
});

test('updates servings in place and preserves focus and drawer scroll', async ({ page, browserName }) => {
  await page.goto('/');
  for (let index = 0; index < 5; index += 1) {
    await page.locator('.dish-card:not(.selected) .add-button').first().click();
  }
  await page.getByRole('button',{name:/查看菜单/}).click();
  const drawer = page.getByRole('dialog',{name:'今日菜单'});
  const plus = page.getByRole('button',{name:'增加人数'});
  await drawer.evaluate((element) => { element.dataset.instance = 'stable'; });
  await plus.scrollIntoViewIfNeeded();
  await plus.focus();
  const originalScrollTop = await drawer.evaluate((element) => element.scrollTop);
  await plus.click();
  await expect(drawer).toHaveAttribute('data-instance','stable');
  await expect(drawer.locator('output')).toHaveText('3 人');
  // Headless WebKit reports the button as inactive after a click; real iOS Safari
  // keeps focus here, confirmed on device. Assert focus only where the harness
  // matches the platform.
  if (browserName !== 'webkit') await expect(plus).toBeFocused();
  await expect.poll(() => drawer.evaluate((element) => element.scrollTop)).toBe(originalScrollTop);
  for (let value = 4; value <= 8; value += 1) await plus.click();
  await expect(drawer.locator('output')).toHaveText('8 人');
  await expect(plus).toBeDisabled();
  const minus = page.getByRole('button',{name:'减少人数'});
  await minus.click();
  await expect(drawer.locator('output')).toHaveText('7 人');
  if (browserName !== 'webkit') await expect(minus).toBeFocused();
});

test('dietary filters preserve selected dishes, notes and order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#avoid-title')).toHaveText('忌口');
  const eggDish = page.getByRole('article').filter({hasText:'西红柿炒鸡蛋'});
  await eggDish.getByRole('button',{name:'加入菜单：西红柿炒鸡蛋'}).click();
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'}).click();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).fill('不要葱');
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).press('Enter');
  await page.getByRole('button',{name:'继续选菜'}).click();
  await page.locator('.avoid-section').getByRole('button',{name:'不要鸡蛋'}).click();
  await expect(page.locator('.header-menu b')).toHaveText('1');
  await expect(eggDish).toHaveCount(0);
  await page.getByRole('button',{name:/查看菜单/}).click();
  await expect(page.getByText('已保留 1 道与当前忌口冲突的菜，请确认是否移除')).toBeVisible();
  await expect(page.getByText('与当前忌口冲突',{exact:true})).toBeVisible();
  await expect(page.getByText('不要葱')).toBeVisible();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('home-menu-draft')));
  expect(draft.selected).toEqual(['tomato-egg']);
  expect(draft.notes).toEqual({'tomato-egg':'不要葱'});
});

test('native share failure copies the link and explains the fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'share',{
      configurable:true,
      value:async () => {
        const error = new Error('unavailable');
        error.name = 'NotAllowedError';
        throw error;
      }
    });
    Object.defineProperty(navigator,'clipboard',{
      configurable:true,
      value:{writeText:async (text) => { window.__copiedShareUrl = text; }}
    });
  });
  await page.goto('/');
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByLabel('想添加的新菜').fill('锅包肉');
  await page.getByRole('button',{name:'发送建议'}).click();
  await page.getByRole('button',{name:'系统分享'}).click();
  await expect(page.getByRole('status')).toHaveText('系统分享不可用，链接已复制');
  await expect.poll(() => page.evaluate(() => window.__copiedShareUrl)).toContain('suggestion=');
});

test('floating menu stays inside compact, large-text and landscape viewports', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.header-menu')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.basket-button')).toHaveAttribute('aria-hidden','true');
  await page.getByRole('button',{name:'加入菜单：蒜蓉西兰花'}).click();
  await page.evaluate(() => window.scrollTo(0,600));
  await expect(page.locator('.bottom-bar')).toHaveClass(/is-visible/);
  await expect(page.locator('.header-menu')).toHaveAttribute('aria-hidden','true');
  await expect(page.locator('.basket-button')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.basket-count')).toHaveText('1');

  for (const viewport of [{width:360,height:780},{width:320,height:700},{width:780,height:360}]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const rect = document.querySelector('.bottom-bar').getBoundingClientRect();
      return {
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        pageWidth: document.documentElement.scrollWidth,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      };
    });
    expect(layout.pageWidth).toBe(layout.viewportWidth);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.top).toBeGreaterThanOrEqual(0);
    expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  }

  await page.setViewportSize({width:360,height:780});
  await page.addStyleTag({content:'html{font-size:125%}'});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test('mobile search locks the page while typing and Enter dismisses the keyboard', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const heroSearch = page.locator('.hero-search input');
  await page.locator('.hero-search').click({position:{x:28,y:25}});
  await expect(heroSearch).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-search-kind','hero');
  const heroFocusLayer = await page.evaluate(() => {
    const search = document.querySelector('.hero-search').getBoundingClientRect();
    const toolbar = document.querySelector('.filter-toolbar').getBoundingClientRect();
    const scrim = document.querySelector('.search-scrim');
    const scrimStyle = getComputedStyle(scrim);
    return {
      searchBottom: Math.ceil(search.bottom),
      scrimTop: Math.round(scrim.getBoundingClientRect().top),
      scrimZIndex: Number(scrimStyle.zIndex),
      searchZIndex: Number(getComputedStyle(document.querySelector('.hero-search')).zIndex),
      toolbarHitTarget: document.elementFromPoint(innerWidth / 2, toolbar.top + toolbar.height / 2)?.className,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow
    };
  });
  expect(heroFocusLayer.scrimTop).toBe(heroFocusLayer.searchBottom);
  expect(heroFocusLayer.scrimZIndex).toBeGreaterThan(14);
  expect(heroFocusLayer.searchZIndex).toBeGreaterThan(heroFocusLayer.scrimZIndex);
  expect(heroFocusLayer.toolbarHitTarget).toBe('search-scrim');
  expect(heroFocusLayer.htmlOverflow).toBe('hidden');
  expect(heroFocusLayer.bodyOverflow).toBe('hidden');
  await page.evaluate(() => window.scrollTo(0,500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await heroSearch.press('Enter');
  await expect(heroSearch).not.toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-search-kind');

  await page.evaluate(() => window.scrollTo(0,900));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(900);
  const compactSearch = page.locator('.compact-search input');
  const scrollBeforeTap = await page.evaluate(() => window.scrollY);
  await page.locator('.compact-search').click({position:{x:24,y:23}});
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeTap);
  await expect(compactSearch).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-search-active','');
  const focusLayer = await page.evaluate(() => {
    const search = document.querySelector('.compact-search').getBoundingClientRect();
    const scrim = document.querySelector('.search-scrim');
    const rect = scrim.getBoundingClientRect();
    const style = getComputedStyle(scrim);
    return {
      searchBottom: Math.ceil(search.bottom),
      scrimTop: Math.round(rect.top),
      scrimBottom: Math.round(rect.bottom),
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      hitTarget: document.elementFromPoint(innerWidth / 2, Math.min(innerHeight - 1, rect.top + 80))?.className
    };
  });
  expect(focusLayer.scrimTop).toBe(focusLayer.searchBottom);
  expect(focusLayer.scrimBottom).toBe(844);
  expect(focusLayer.opacity).toBe('1');
  expect(focusLayer.pointerEvents).toBe('auto');
  expect(focusLayer.backdropFilter).toContain('blur(5px)');
  expect(focusLayer.hitTarget).toBe('search-scrim');
  const lockedScrollY = await page.evaluate(() => window.scrollY);

  await page.evaluate(() => window.scrollTo(0,1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(lockedScrollY);

  await compactSearch.fill('鸡蛋');
  await compactSearch.press('Enter');
  await expect(compactSearch).not.toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-search-active');
  await expect(page.locator('.search-scrim')).toHaveCSS('pointer-events','none');
  await expect(page.getByText('西红柿鸡蛋汤',{exact:true})).toBeVisible();
});

test('basket badge stays integrated for 0, 1, 9, 10, and 12 dishes', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('.dish-card').nth(8).scrollIntoViewIfNeeded();
  await expect(page.locator('.bottom-bar')).toHaveClass(/is-visible/);
  await page.waitForTimeout(250);

  const badge = page.locator('.basket-count');
  const basket = page.locator('.basket-button');
  await expect(badge).toHaveText('0');
  await expect(basket).toHaveAttribute('aria-label','查看菜单，已选 0 道菜');

  const widths = {};
  for (let count = 1; count <= 12; count += 1) {
    await page.locator('.add-button[aria-pressed="false"]').first().click();
    if ([1,9,10,12].includes(count)) {
      await expect(badge).toHaveText(String(count));
      await expect(basket).toHaveAttribute('aria-label',`查看菜单，已选 ${count} 道菜`);
      widths[count] = await badge.evaluate((element) => element.getBoundingClientRect().width);
    }
  }
  expect(widths[1]).toBeGreaterThanOrEqual(22);
  expect(Math.abs(widths[9] - widths[1])).toBeLessThan(1);
  expect(widths[10]).toBeGreaterThanOrEqual(widths[9]);
  expect(Math.abs(widths[12] - widths[10])).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('mobile candidates use compact two-column tiles with accessible actions', async ({ page }) => {
  for (const viewport of [{width:390,height:844},{width:360,height:780},{width:320,height:700}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.dish-card')).toHaveCount(40);
    await page.evaluate(() => {
      const grid = document.querySelector('.dish-grid');
      const toolbar = document.querySelector('.filter-toolbar');
      window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY - toolbar.offsetHeight);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('.dish-grid');
      const toolbar = document.querySelector('.filter-toolbar');
      const cards = [...grid.querySelectorAll('.dish-card')];
      const buttons = cards.map((card) => card.querySelector('.add-button'));
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        cardHeights: cards.slice(0, 10).map((card) => card.getBoundingClientRect().height),
        buttonWidths: buttons.slice(0, 10).map((button) => button.getBoundingClientRect().width),
        buttonHeights: buttons.slice(0, 10).map((button) => button.getBoundingClientRect().height),
        buttonHitSizes: buttons.slice(0, 10).map((button) => {
          const rect = button.getBoundingClientRect();
          const hitInset = Math.abs(Number.parseFloat(getComputedStyle(button,'::before').insetBlockStart));
          return [rect.width + 2 * hitInset, rect.height + 2 * hitInset];
        }),
        dishCapacity: 2 * Math.floor(
          (innerHeight - toolbar.offsetHeight + Number.parseFloat(getComputedStyle(grid).rowGap))
          / (cards[0].getBoundingClientRect().height + Number.parseFloat(getComputedStyle(grid).rowGap))
        )
      };
    });

    expect(layout.pageWidth).toBe(layout.viewportWidth);
    expect(layout.columns).toBe(2);
    expect(layout.cardHeights.every((height) => height >= 76 && height <= 80)).toBe(true);
    expect(layout.buttonWidths.every((width) => width >= 32 && width <= 36)).toBe(true);
    expect(layout.buttonHeights.every((height) => height >= 32 && height <= 36)).toBe(true);
    expect(layout.buttonHitSizes.every(([width,height]) => width >= 44 && height >= 44)).toBe(true);
    if (viewport.width === 390) {
      expect(layout.dishCapacity).toBeGreaterThanOrEqual(14);
      expect(layout.dishCapacity).toBeLessThanOrEqual(18);
    }
  }

  await expect(page.getByRole('button',{name:'加入菜单：手撕包菜'})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'加入菜单：手撕包菜'}).click();
  await expect(page.getByRole('button',{name:'已加入：手撕包菜'})).toHaveAttribute('aria-pressed','true');
});

test('candidate display defaults by screen size and remembers the user choice', async ({ page }) => {
  await page.setViewportSize({width:1024,height:800});
  await page.goto('/');

  const grid = page.locator('.dish-grid');
  const largeButton = page.getByRole('button',{name:'大卡片显示'});
  const compactButton = page.getByRole('button',{name:'小卡片显示'});

  await expect(grid).toHaveClass(/view-large/);
  await expect(largeButton).toHaveAttribute('aria-pressed','true');
  await expect(compactButton).toHaveAttribute('aria-pressed','false');

  await compactButton.click();
  await expect(grid).toHaveClass(/view-compact/);
  await expect(compactButton).toHaveAttribute('aria-pressed','true');
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(5);

  await page.reload();
  await expect(grid).toHaveClass(/view-compact/);

  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await expect(grid).toHaveClass(/view-compact/);
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const heading = document.querySelector('.section-heading');
    window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 420);
  });
  const compactAnchor = await page.locator('.section-heading').evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    scrollY: window.scrollY,
  }));
  await largeButton.evaluate((button) => button.click());
  await expect(grid).toHaveClass(/view-large/);
  const largeAnchor = await page.locator('.section-heading').evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    scrollY: window.scrollY,
  }));
  expect(Math.abs(largeAnchor.top-compactAnchor.top)).toBeLessThan(.5);
  expect(largeAnchor.scrollY).toBe(compactAnchor.scrollY);
  await compactButton.evaluate((button) => button.click());
  await expect(grid).toHaveClass(/view-compact/);

  await page.setViewportSize({width:521,height:844});
  await page.reload();
  await expect(grid).toHaveClass(/view-compact/);
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(521);

  await page.setViewportSize({width:530,height:844});
  await page.reload();
  await expect(grid).toHaveClass(/view-compact/);
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  expect(await grid.locator('.dish-card').first().evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(160);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(530);

  await page.setViewportSize({width:599,height:844});
  await page.reload();
  const paddingBefore = await page.locator('.dish-section').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop));
  await page.setViewportSize({width:601,height:844});
  const paddingAfter = await page.locator('.dish-section').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop));
  expect(Math.abs(paddingAfter-paddingBefore)).toBeLessThan(1);
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(601);

  await largeButton.click();
  await expect(grid).toHaveClass(/view-large/);
  await page.reload();
  await expect(grid).toHaveClass(/view-large/);
});

test('candidate sorting is stable, persisted, and uses local pick history', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const sort = page.getByLabel('候选排序');
  const firstDishName = () => page.locator('.dish-card h3').first();
  await expect(sort).toBeVisible();
  const headingLayout = await page.evaluate(() => {
    const title = document.querySelector('#dish-title').getBoundingClientRect();
    const actions = document.querySelector('.candidate-heading-actions').getBoundingClientRect();
    const select = document.querySelector('.sort-control select').getBoundingClientRect();
    return {
      titleRight: title.right,
      actionsLeft: actions.left,
      selectLeft: select.left,
      selectRight: select.right,
      viewportWidth: innerWidth,
    };
  });
  expect(headingLayout.titleRight).toBeLessThanOrEqual(headingLayout.actionsLeft);
  expect(headingLayout.selectLeft).toBeGreaterThanOrEqual(0);
  expect(headingLayout.selectRight).toBeLessThanOrEqual(headingLayout.viewportWidth);

  await expect(sort).toHaveValue('recommended');
  await expect(firstDishName()).toHaveText('西红柿炒鸡蛋');

  await sort.selectOption('fastest');
  await expect(firstDishName()).toHaveText('紫菜蛋花汤');
  await page.reload();
  await expect(sort).toHaveValue('fastest');
  await expect(firstDishName()).toHaveText('紫菜蛋花汤');

  await sort.selectOption('category');
  const firstCategories = await page.locator('.dish-category-compact').evaluateAll((elements) => elements.slice(0,8).map((element) => element.textContent));
  expect(firstCategories.every((category) => category === '素菜')).toBe(true);

  await sort.selectOption('name');
  await expect(firstDishName()).toHaveText('白菜猪肉炖粉条');

  await page.evaluate(() => localStorage.setItem('home-menu-pick-history',JSON.stringify({'mapo-tofu':5,'cola-wings':2})));
  await page.reload();
  await sort.selectOption('frequent');
  await expect(firstDishName()).toHaveText('麻婆豆腐');
  const firstIdsBeforePick = await page.locator('.dish-card').evaluateAll((cards) => cards.slice(0,6).map((card) => card.querySelector('[data-preview-id]').dataset.previewId));
  await page.locator('.add-button[aria-pressed="false"]').nth(6).click();
  const firstIdsAfterPick = await page.locator('.dish-card').evaluateAll((cards) => cards.slice(0,6).map((card) => card.querySelector('[data-preview-id]').dataset.previewId));
  expect(firstIdsAfterPick).toEqual(firstIdsBeforePick);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('dish preview shows decision details without changing the menu', async ({ page, browserName }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('.filter-toolbar')).not.toHaveClass(/is-stuck/);

  const card = page.getByRole('article').filter({hasText:'酸辣土豆丝'});
  const previewButton = card.getByRole('button',{name:'查看酸辣土豆丝概览'});
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0,900);
  });
  await expect(page.locator('.filter-toolbar')).toHaveClass(/is-stuck/);
  const previewOriginY = await page.evaluate(() => scrollY);
  // Click in-page: Playwright's click scrolls the target into view first, which
  // legitimately un-sticks the toolbar and would mask the sticky-state assertions.
  await page.evaluate(() => document.querySelector('[data-preview-id="hot-sour-potato"]').click());

  const preview = page.getByRole('dialog',{name:'酸辣土豆丝'});
  await expect(preview).toBeFocused();
  await expect(page.locator('.dish-preview-backdrop')).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(page.locator('.dish-preview-backdrop')).toHaveCSS('border-radius','0px');
  await expect(page.locator('.dish-preview-backdrop')).toHaveCSS('padding','0px');
  await expect(page.locator('.dish-preview-backdrop')).toHaveCSS('backdrop-filter','none');
  await expect(page.locator('#app')).toHaveClass(/dish-preview-background/);
  await expect(page.locator('#app')).toHaveCSS('filter','none');
  await expect(page.locator('#app')).toHaveCSS('opacity','0');
  await expect(page.locator('#app')).toHaveAttribute('aria-hidden','true');
  expect(await page.locator('#app').evaluate((element) => element.inert)).toBe(false);
  await expect(page.locator('body')).not.toHaveClass(/no-scroll/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(previewOriginY);
  if (browserName === 'webkit') {
    // Mobile WebKit has no wheel at all, so Playwright refuses mouse.wheel there.
    // The equivalent on iOS is the capture-phase touchmove blocker, so assert the
    // listener is what actually holds the page still.
    const moved = await page.evaluate(() => {
      const event = new TouchEvent('touchmove', { bubbles:true, cancelable:true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(moved).toBe(true);
  } else {
    await page.mouse.move(2,2);
    await page.mouse.wheel(0,400);
  }
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(previewOriginY);
  await expect(preview.getByText('土豆、干辣椒',{exact:true})).toBeVisible();
  await expect(preview.getByText('清爽',{exact:true})).toBeVisible();
  await expect(preview.getByText('有辣味',{exact:true})).toBeVisible();
  await expect(page.locator('.header-menu b')).toHaveText('0');

  await preview.press('Tab');
  await expect(page.getByRole('button',{name:'关闭酸辣土豆丝概览'})).toBeFocused();
  await preview.press('Shift+Tab');
  await expect(preview.getByRole('button',{name:'加入菜单'})).toBeFocused();

  await preview.getByRole('button',{name:'加入菜单'}).click();
  const removeFromPreview = preview.getByRole('button',{name:'移出菜单'});
  await expect(removeFromPreview).toBeEnabled();
  await expect(removeFromPreview).toHaveAttribute('aria-pressed','true');
  await expect(removeFromPreview).toHaveClass(/is-remove/);
  await expect(page.locator('.header-menu b')).toHaveText('1');

  await removeFromPreview.click();
  const addFromPreview = preview.getByRole('button',{name:'加入菜单'});
  await expect(addFromPreview).toBeEnabled();
  await expect(addFromPreview).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.header-menu b')).toHaveText('0');

  await addFromPreview.click();
  await expect(preview.getByRole('button',{name:'移出菜单'})).toBeEnabled();
  await expect(page.locator('.header-menu b')).toHaveText('1');
  await preview.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(page.locator('#app')).not.toHaveClass(/dish-preview-background/);
  await expect(page.locator('#app')).not.toHaveAttribute('aria-hidden');
  await expect(page.getByRole('button',{name:'查看酸辣土豆丝概览'})).toBeFocused();

  await page.evaluate(() => scrollTo(0,0));
  await expect(page.locator('.filter-toolbar')).not.toHaveClass(/is-stuck/);

  await card.getByRole('button',{name:'已加入：酸辣土豆丝'}).click();
  await expect(page.locator('.header-menu b')).toHaveText('0');
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toHaveCount(0);

  await previewButton.click();
  const sheetBox = await page.getByRole('dialog',{name:'酸辣土豆丝'}).boundingBox();
  expect(sheetBox.x).toBeGreaterThanOrEqual(0);
  expect(sheetBox.x + sheetBox.width).toBeLessThanOrEqual(390);
  await expect.poll(async () => {
    const box = await page.getByRole('dialog',{name:'酸辣土豆丝'}).boundingBox();
    return Math.ceil(box.y + box.height);
  }).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.mouse.click(2,2);
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toHaveCount(0);

  await page.setViewportSize({width:320,height:700});
  await page.getByRole('button',{name:'查看酸辣土豆丝概览'}).click();
  const narrowBox = await page.getByRole('dialog',{name:'酸辣土豆丝'}).boundingBox();
  expect(narrowBox.x).toBeGreaterThanOrEqual(0);
  expect(narrowBox.x + narrowBox.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('dish preview solid background covers the viewport at every scroll position', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    document.documentElement.style.scrollBehavior = 'auto';
  });
  await page.reload();
  // The loop below reaches straight into the DOM, so the grid must exist first;
  // otherwise querySelector returns null and the test dies in ~80ms.
  await expect(page.locator('.dish-card').first()).toBeVisible();

  const scenarios = [
    {id:'tomato-egg', name:'西红柿炒鸡蛋', scrollY:0},
    {id:'mapo-tofu', name:'麻婆豆腐', scrollY:900},
    {id:'cabbage-pork-noodle-stew', name:'白菜猪肉炖粉条', scrollY:2400},
  ];

  for (const scenario of scenarios) {
    await page.evaluate(({id, scrollY}) => {
      window.scrollTo(0,scrollY);
      document.querySelector(`[data-preview-id="${id}"]`).click();
    },scenario);

    const backdrop = page.locator('.dish-preview-backdrop');
    await expect(backdrop).toBeVisible();
    await expect(backdrop).not.toHaveAttribute('popover');
    await expect(backdrop).not.toHaveClass(/drawer-backdrop/);
    const coverage = await page.evaluate(() => {
      const element = document.querySelector('.dish-preview-backdrop');
      const rect = element.getBoundingClientRect();
      const points = [
        [0,0],
        [innerWidth - 1,0],
        [0,innerHeight - 1],
        [innerWidth - 1,innerHeight - 1],
        [innerWidth / 2,0],
        [innerWidth / 2,innerHeight - 1],
      ];
      return {
        top:rect.top,
        left:rect.left,
        right:rect.right,
        bottom:rect.bottom,
        width:innerWidth,
        height:innerHeight,
        covered:points.map(([x,y]) => document.elementFromPoint(x,y)?.closest('.dish-preview-backdrop') === element),
        backdropRadius:getComputedStyle(element).borderRadius,
        backdropPadding:getComputedStyle(element).padding,
      };
    });
    expect(coverage.top).toBeLessThanOrEqual(0);
    expect(coverage.left).toBeLessThanOrEqual(0);
    expect(coverage.right).toBeGreaterThanOrEqual(coverage.width);
    expect(coverage.bottom).toBeGreaterThanOrEqual(coverage.height);
    expect(coverage.covered).toEqual([true,true,true,true,true,true]);
    expect(coverage.backdropRadius).toBe('0px');
    expect(coverage.backdropPadding).toBe('0px');
    await page.getByRole('button',{name:`关闭${scenario.name}概览`}).click();
    await expect(backdrop).toHaveCount(0);
  }
});

test('theme, canvas, header, sticky toolbar and preview keep one cream material', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    document.documentElement.style.scrollBehavior = 'auto';
  });
  await page.reload();

  const toolbar = page.locator('.filter-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    'width=device-width, initial-scale=1.0',
  );
  const readMaterial = () => page.evaluate(() => {
    const rootColor = getComputedStyle(document.documentElement).backgroundColor;
    const body = getComputedStyle(document.body);
    const header = getComputedStyle(document.querySelector('.site-header'));
    const toolbarStyle = getComputedStyle(document.querySelector('.filter-toolbar'));
    return {
      themeColor:document.querySelector('meta[name="theme-color"]')?.content,
      rootColor,
      bodyColor:body.backgroundColor,
      bodyImage:body.backgroundImage,
      headerColor:header.backgroundColor,
      headerImage:header.backgroundImage,
      headerShadow:header.boxShadow,
      headerBackdrop:header.backdropFilter,
      toolbarColor:toolbarStyle.backgroundColor,
      toolbarImage:toolbarStyle.backgroundImage,
      toolbarShadow:toolbarStyle.boxShadow,
      toolbarBackdrop:toolbarStyle.backdropFilter,
    };
  });
  const expectedMaterial = await readMaterial();
  expect(expectedMaterial.themeColor).toBe('#f7f1e7');
  expect(expectedMaterial.rootColor).toBe('rgb(247, 241, 231)');
  expect(expectedMaterial.bodyColor).toBe(expectedMaterial.rootColor);
  expect(expectedMaterial.bodyImage).toBe('none');
  expect(expectedMaterial.headerColor).toBe(expectedMaterial.rootColor);
  expect(expectedMaterial.headerImage).toBe('none');
  expect(expectedMaterial.toolbarColor).toBe(expectedMaterial.rootColor);
  expect(expectedMaterial.headerShadow).toBe('none');
  expect(expectedMaterial.headerBackdrop).toBe('none');
  expect(expectedMaterial.toolbarShadow).toBe('none');
  expect(expectedMaterial.toolbarBackdrop).toBe('none');
  expect(expectedMaterial.toolbarImage).toBe('none');
  await expect(toolbar).not.toHaveClass(/is-stuck/);
  await expect(page.locator('.sticky-toolbar-surface')).toHaveCount(0);
  const compactToolbarMetrics = await page.evaluate(() => {
    const toolbarElement = document.querySelector('.filter-toolbar');
    const avoidSection = document.querySelector('.avoid-section');
    const controls = [...toolbarElement.querySelectorAll('button'), ...avoidSection.querySelectorAll('button')]
      .filter((control) => {
        const rect = control.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    return {
      toolbarHeight: toolbarElement.getBoundingClientRect().height,
      avoidHeight: avoidSection.getBoundingClientRect().height,
      minimumControlHeight: Math.min(...controls.map((control) => control.getBoundingClientRect().height)),
    };
  });
  expect(compactToolbarMetrics.toolbarHeight).toBe(56);
  expect(compactToolbarMetrics.avoidHeight).toBe(56);
  expect(compactToolbarMetrics.minimumControlHeight).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.scrollTo(0,900));
  await expect(toolbar).toHaveClass(/is-stuck/);
  expect(await toolbar.evaluate((element) => element.getBoundingClientRect().height)).toBe(56);
  expect(await readMaterial()).toEqual(expectedMaterial);

  await page.evaluate(() => window.scrollTo(0,0));
  await expect(toolbar).not.toHaveClass(/is-stuck/);
  expect(await readMaterial()).toEqual(expectedMaterial);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.evaluate(() => window.scrollTo(0,900));
    await expect(toolbar).toHaveClass(/is-stuck/);
    expect(await readMaterial()).toEqual(expectedMaterial);
    await page.evaluate(() => window.scrollTo(0,0));
    await expect(toolbar).not.toHaveClass(/is-stuck/);
    expect(await readMaterial()).toEqual(expectedMaterial);
  }

  await page.evaluate(() => window.scrollTo(0,900));
  await expect(toolbar).toHaveClass(/is-stuck/);
  await page.evaluate(() => document.querySelector('#toast').classList.add('is-visible'));
  await page.evaluate(() => document.querySelector('[data-preview-id="hot-sour-potato"]').click());
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toBeVisible();
  expect(await readMaterial()).toEqual(expectedMaterial);
  await expect(page.locator('.dish-preview-backdrop')).toHaveCSS('background-color',expectedMaterial.rootColor);
  await expect(page.locator('#toast')).toHaveCSS('visibility','hidden');
  await page.getByRole('button',{name:'关闭酸辣土豆丝概览'}).click();
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toHaveCount(0);
  await expect(page.locator('#toast')).toHaveCSS('visibility','visible');
  await page.evaluate(() => document.querySelector('#toast').classList.remove('is-visible'));
  expect(await readMaterial()).toEqual(expectedMaterial);

  // The same material also survives a preview opened from the non-sticky top.
  await page.evaluate(() => window.scrollTo(0,0));
  await expect(toolbar).not.toHaveClass(/is-stuck/);
  await page.evaluate(() => document.querySelector('[data-preview-id="hot-sour-potato"]').click());
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toBeVisible();
  await expect(page.locator('.dish-preview-backdrop')).toHaveCSS('background-color',expectedMaterial.rootColor);
  expect(await readMaterial()).toEqual(expectedMaterial);
  await page.getByRole('button',{name:'关闭酸辣土豆丝概览'}).click();
  await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toHaveCount(0);
  expect(await readMaterial()).toEqual(expectedMaterial);
});

test('opening and closing the preview never moves the page, scrolling down or back up', async ({ page }) => {
  // Cover both directions: an earlier focus-restoration bug was only reachable
  // after scrolling down and coming back up.
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.dish-card').first()).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });

  const readState = () => page.evaluate(() => ({
    y: Math.round(window.scrollY),
    stuck: document.querySelector('.filter-toolbar').classList.contains('is-stuck'),
  }));
  const waitForStableStickyState = () => expect.poll(() => page.evaluate(() => {
    const toolbar = document.querySelector('.filter-toolbar');
    const sentinel = document.querySelector('.sticky-sentinel');
    return toolbar.classList.contains('is-stuck') === (sentinel.getBoundingClientRect().bottom <= 0);
  })).toBe(true);

  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const stops = [0, 300, Math.round(maxScroll / 2), maxScroll];
  const journey = [...stops, ...stops.slice(0, -1).reverse()];

  for (const target of journey) {
    await page.evaluate((value) => window.scrollTo(0, value), target);
    await waitForStableStickyState();
    const before = await readState();
    await page.evaluate(() => document.querySelector('[data-preview-id="hot-sour-potato"]').click());
    await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toBeVisible();
    const during = await page.evaluate(() => Math.round(window.scrollY));
    expect(during).toBe(before.y);

    await page.evaluate(() => document.querySelector('[data-close-preview]').click());
    await expect(page.getByRole('dialog',{name:'酸辣土豆丝'})).toHaveCount(0);
    await waitForStableStickyState();
    const after = await readState();
    expect(after.y).toBe(before.y);
    expect(after.stuck).toBe(before.stuck);
  }
});
