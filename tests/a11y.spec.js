import { test, expect } from '@playwright/test'
import { gotoApp, startPractice } from './helpers.js'

test('a new question moves focus to the prompt for number-pad skills', async ({ page }) => {
  await gotoApp(page)
  await startPractice(page, 'add')

  // Question.jsx focuses the (tabIndex=-1) prompt on mount so a screen
  // reader announces each new question without the player needing to tab.
  await expect(page.locator('.prompt')).toBeFocused()
})

test('multiple-choice questions auto-focus the first choice and support arrow-key and digit-key selection', async ({
  page,
}) => {
  await gotoApp(page)
  await startPractice(page, 'estimate')

  const choices = page.locator('.choice')
  await expect(choices.first()).toBeFocused()

  // arrow-right/down move focus forward and wrap
  const n = await choices.count()
  await page.keyboard.press('ArrowRight')
  await expect(choices.nth(1)).toBeFocused()
  for (let i = 2; i < n; i++) {
    await page.keyboard.press('ArrowRight')
    await expect(choices.nth(i)).toBeFocused()
  }
  await page.keyboard.press('ArrowRight') // wraps back to the first
  await expect(choices.first()).toBeFocused()

  await page.keyboard.press('ArrowLeft') // wraps the other way
  await expect(choices.nth(n - 1)).toBeFocused()

  // digit key 1 selects the first choice outright, without needing focus on it
  const q = await page.evaluate(() => {
    const a = window.__session.activity
    return { index: a.index }
  })
  await page.keyboard.press('1')
  await page.waitForFunction(
    (prev) => window.__session.activity.index > prev || window.__session.activity.done,
    q.index,
  )
})
