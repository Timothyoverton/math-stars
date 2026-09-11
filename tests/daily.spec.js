import { test, expect } from '@playwright/test'
import { gotoApp, playWholeSet } from './helpers.js'

test('the Daily Challenge card starts a fixed, date-seeded set and marks itself complete', async ({
  page,
}) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })
  await page.reload()
  await page.waitForFunction(() => window.__store && window.__session)

  await expect(page.getByText("Today's Challenge")).toBeVisible()
  await page.getByRole('button', { name: 'Play' }).click()

  await page.waitForFunction(() => window.__store.getState().phase === 'practice')
  await page.waitForFunction(() => window.__store.getState().daily === true)
  await expect(page.getByText('🗓️ Daily Challenge ·')).toBeVisible()

  // the same date+skill always builds the exact same 20 questions
  const questions = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    const { dailySeed, dailySkill, todayKey } = await import('/src/game/daily.js')
    const dateKey = todayKey()
    return buildQuestionSet(dailySeed(dateKey), dailySkill(dateKey).id).map((q) => q.prompt)
  })
  expect(await page.evaluate(() => window.__session.activity.currentQuestion.prompt)).toBe(
    questions[0],
  )

  await playWholeSet(page)
  await page.waitForFunction(() => window.__store.getState().phase === 'result')
  await expect(page.getByText('🗓️ Daily Challenge complete')).toBeVisible()

  // back on the menu, the card now shows today's result instead of "Play"
  await page.getByRole('button', { name: 'Back to menu' }).click()
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
  await expect(page.getByText(/✓ \d+\/20/)).toBeVisible()

  const saved = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    const { todayKey } = await import('/src/game/daily.js')
    return Store.getDailyChallenge(todayKey())
  })
  expect(saved.total).toBe(20)
})
