import { test, expect } from '@playwright/test'

async function mockApiDefaults(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.endsWith('/api/auth/login')) {
      await route.fallback()
      return
    }
    if (url.endsWith('/api/auth/refresh')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { page: 1, page_size: 20, total: 0 } }) })
  })
}

function mockLogin(page: import('@playwright/test').Page, role: 'admin' | 'commander' | 'user') {
  return page.route('**/api/auth/login', async (route) => {
    const body = JSON.stringify({
      data: {
        accessToken: `header.${btoa(JSON.stringify({ sub: '1', role, unit_id: '1' }))}.sig`,
        refreshToken: 'refresh-token',
        role,
      },
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body })
  })
}

function inputByRussianLabel(page: import('@playwright/test').Page, labelText: string) {
  // In the current UI labels are not associated via htmlFor/aria-label,
  // so we resolve the input by DOM structure: <div><label>...</label><input .../></div>
  return page.locator('label', { hasText: labelText }).locator('..').locator('input')
}

test.describe('auth + routing', () => {
  test('unauthenticated admin route redirects to /login', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Вход в систему')).toBeVisible()
  })

  test('admin login redirects to /admin/users', async ({ page }) => {
    await mockApiDefaults(page)
    await mockLogin(page, 'admin')
    await page.goto('/login')
    await inputByRussianLabel(page, 'Логин').fill('admin')
    await inputByRussianLabel(page, 'Пароль').fill('password')
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page).toHaveURL(/\/admin\/users$/)
  })

  test('commander login redirects to /raskhod', async ({ page }) => {
    await mockApiDefaults(page)
    await mockLogin(page, 'commander')
    await page.goto('/login')
    await inputByRussianLabel(page, 'Логин').fill('commander')
    await inputByRussianLabel(page, 'Пароль').fill('password')
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page).toHaveURL(/\/raskhod$/)
  })
})

