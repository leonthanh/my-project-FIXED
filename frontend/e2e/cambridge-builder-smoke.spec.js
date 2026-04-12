const { test, expect } = require('@playwright/test');

const teacherUser = {
  id: 9100,
  name: 'Smoke Teacher',
  role: 'teacher',
  canManageTests: true,
  phone: '0900000091',
};

test.describe.serial('Cambridge builder smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('accessToken', 'smoke.teacher.token');
    }, teacherUser);
  });

  test('KET reading builder renders key sections', async ({ page }) => {
    await page.goto('/admin/create/ket-reading');

    await expect(page.getByRole('heading', { name: 'KET Reading & Writing', level: 1 })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loại câu hỏi hỗ trợ')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Lưu' })).toBeVisible({ timeout: 20000 });
  });

  test('Movers listening builder renders key sections', async ({ page }) => {
    await page.goto('/admin/create-movers-listening');

    await expect(page.getByText('MOVERS Listening')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Thông tin đề thi')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Audio chính \(toàn bài/i)).toBeVisible({ timeout: 20000 });
  });
});