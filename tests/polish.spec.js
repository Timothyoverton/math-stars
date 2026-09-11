import { test, expect } from '@playwright/test'
import { gotoApp, answerCurrent, playWholeSet } from './helpers.js'

async function resetAndReload(page) {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })
  // Menu already read (empty) progress on its first mount — reload so it
  // reads again post-reset, same as a real player opening a fresh browser.
  await page.reload()
  await page.waitForFunction(() => window.__store && window.__session)
}

test('a never-played skill opens with a 5-question warm-up that does not touch progress', async ({
  page,
}) => {
  await resetAndReload(page)

  // Division facts is a Grade 3 skill; only the lowest grade (2) is open by
  // default in the picker, so its section needs expanding first.
  await page.getByRole('button', { name: /Grade 3/ }).click()
  await page.getByRole('button', { name: /Division facts/ }).click()
  await page.getByRole('button', { name: 'Practise 20 questions' }).click()

  await page.waitForFunction(() => window.__store.getState().phase === 'warmup')
  await expect(page.getByText('Get ready — warm-up 1/5')).toBeVisible()

  for (let i = 0; i < 5; i++) {
    const phase = await page.evaluate(() => window.__store.getState().phase)
    if (phase !== 'warmup') break
    await answerCurrent(page)
  }

  // hands off straight into the real, scored 20-question set
  await page.waitForFunction(() => window.__store.getState().phase === 'practice')
  await page.waitForFunction(() => window.__session.activity?.total === 20)

  const midProgress = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    return Store.getProgress()
  })
  expect(midProgress.div).toBeUndefined() // the warm-up itself recorded nothing

  await playWholeSet(page)
  await page.waitForFunction(() => window.__store.getState().phase === 'result')

  const progress = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    return Store.getProgress()
  })
  expect(progress.div.attempts).toBe(20) // only the real set counted, not 25
})

test('a skill with existing progress skips the warm-up on its next practice', async ({ page }) => {
  await resetAndReload(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.recordActivity({ skillId: 'div', total: 20, correct: 20, score: 300, timeMs: 9000, mode: 'solo' })
  })
  await page.reload()
  await page.waitForFunction(() => window.__store && window.__session)

  await page.getByRole('button', { name: /Grade 3/ }).click()
  await page.getByRole('button', { name: /Division facts/ }).click()
  await page.getByRole('button', { name: 'Practise 20 questions' }).click()

  await page.waitForFunction(() => window.__store.getState().phase === 'practice')
  await page.waitForFunction(() => window.__session.activity?.currentQuestion)
})

test('a bot race win offers a downloadable share card', async ({ page }) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })

  await page.evaluate(async () => {
    const mp = await import('/src/game/mp.js')
    await mp.playBot('mul', 'turbo')
  })
  await page.waitForFunction(() => window.__store.getState().phase === 'match', null, {
    timeout: 20_000,
  })
  await page.waitForFunction(() => window.__session.activity?.currentQuestion)
  await playWholeSet(page) // player answers every question correctly, and fast — always wins

  await page.waitForFunction(() => window.__store.getState().phase === 'result', null, {
    timeout: 40_000,
  })
  const result = await page.evaluate(() => window.__store.getState().result)
  expect(result.outcome).toBe('win')

  await page.getByRole('button', { name: 'Make a share card' }).click()
  const img = page.locator('.share-card img')
  await expect(img).toBeVisible()
  const src = await img.getAttribute('src')
  expect(src).toMatch(/^data:image\/png;base64,/)

  await expect(page.getByRole('link', { name: 'Save image' })).toHaveAttribute(
    'download',
    'math-stars-win.png',
  )
})
