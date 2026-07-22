import { test, expect } from '@playwright/test';
test('select, share, open menu and create shopping list', async ({ page }) => {
  await page.goto('/');
  for (const name of ['西红柿炒鸡蛋','芹菜炒肉','紫菜蛋花汤']) await page.getByRole('article').filter({hasText:name}).getByRole('button').click();
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByLabel('给西红柿炒鸡蛋添加备注').fill('不要葱');
  await page.getByRole('button',{name:'生成菜单'}).click();
  const href = await page.getByRole('link',{name:'预览菜单'}).getAttribute('href');
  await page.goto(href);
  await expect(page.getByRole('heading',{name:'今晚吃这些'})).toBeVisible();
  await expect(page.getByText('不要葱')).toBeVisible();
  await page.getByRole('button',{name:/生成采购清单/}).click();
  await expect(page.getByRole('heading',{name:'采购清单'})).toBeVisible();
});
