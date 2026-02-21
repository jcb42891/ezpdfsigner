import { expect, test } from '@playwright/test'

test('app loads with upload button', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Upload PDF' })).toBeVisible()
  await expect(page.getByText('Open a PDF to start editing')).toBeVisible()
})
