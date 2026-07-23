import { test, expect } from '@playwright/test';
test('select, share, open menu and create shopping list', async ({ page }) => {
  await page.goto('/');
  for (const name of ['西红柿炒鸡蛋','芹菜炒肉','紫菜蛋花汤']) await page.getByRole('article').filter({hasText:name}).getByRole('button').click();
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'}).click();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).fill('不要葱');
  await page.getByRole('button',{name:'完成西红柿炒鸡蛋备注'}).click();
  await expect(page.getByText('不要葱')).toBeVisible();
  await expect(page.getByRole('button',{name:'修改西红柿炒鸡蛋的备注'})).toBeVisible();
  await page.getByRole('button',{name:'删除西红柿炒鸡蛋的备注'}).click();
  await expect(page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'})).toBeVisible();
  await page.getByRole('button',{name:'给西红柿炒鸡蛋添加备注'}).click();
  await page.getByRole('textbox',{name:'给西红柿炒鸡蛋添加备注'}).fill('不要葱');
  await page.getByRole('button',{name:'完成西红柿炒鸡蛋备注'}).click();
  await page.getByRole('button',{name:'生成菜单'}).click();
  const href = await page.getByRole('link',{name:'预览菜单'}).getAttribute('href');
  await page.goto(href);
  await expect(page.getByRole('heading',{name:'今晚吃这些'})).toBeVisible();
  await expect(page.getByText('不要葱')).toBeVisible();
  await page.getByRole('button',{name:/生成采购清单/}).click();
  await expect(page.getByRole('heading',{name:'采购清单'})).toBeVisible();
});

test('share a new-dish suggestion without selecting a dish', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button',{name:/查看菜单/}).click();
  await page.getByLabel('想添加的新菜').fill('糖醋里脊、锅包肉');
  await page.getByRole('button',{name:'发送建议'}).click();
  const href = await page.getByRole('link',{name:'预览菜单'}).getAttribute('href');
  await page.goto(href);
  await expect(page.getByRole('heading',{name:'收到新菜建议'})).toBeVisible();
  await expect(page.getByText('糖醋里脊')).toBeVisible();
  await expect(page.getByText('锅包肉')).toBeVisible();
});
