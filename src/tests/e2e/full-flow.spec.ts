import { expect, test } from '@playwright/test'

test('upload, add text/signature, copy-paste signature, and export', async ({ page }) => {
  page.on('dialog', async (dialog) => {
    if (dialog.message().includes('Edit text')) {
      await dialog.accept('Approved')
      return
    }
    await dialog.dismiss()
  })

  await page.goto('/')

  await page.locator('input[type="file"]').setInputFiles('src/tests/fixtures/sample.pdf')

  await expect(page.getByText('Page 1')).toBeVisible()
  await expect(page.getByText('Page 2')).toBeVisible()

  await page.getByRole('button', { name: 'Text' }).click()
  await page
    .locator('.pdf-page-canvas-wrapper canvas')
    .nth(1)
    .click({ position: { x: 180, y: 120 } })

  await expect(page.getByText('1 annotations')).toBeVisible()
  await expect(page.locator('.status-bar__editor input').first()).toHaveValue('Approved')

  await page.getByRole('button', { name: 'Draw Signature' }).click()
  await page.getByLabel('Signature name').fill('QA Signature')
  await page.locator('.signature-modal__canvas').hover({ position: { x: 120, y: 80 } })
  await page.mouse.down()
  await page.mouse.move(180, 95)
  await page.mouse.move(230, 105)
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save Signature' }).click()

  await page
    .locator('.pdf-page-canvas-wrapper canvas')
    .nth(1)
    .click({ position: { x: 220, y: 220 } })

  await expect(page.getByText('2 annotations')).toBeVisible()

  await page
    .locator('.pdf-page-canvas-wrapper canvas')
    .nth(1)
    .click({ position: { x: 220, y: 220 } })

  await page.keyboard.press('Control+C')
  await page.keyboard.press('Control+V')

  await expect(page.getByText('3 annotations')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PDF' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('sample-signed.pdf')
})
