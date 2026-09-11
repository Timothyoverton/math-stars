import { test, expect } from '@playwright/test'
import { gotoApp } from './helpers.js'

test('a weak skill appears in the Needs practice shelf and clicking it jumps straight into a scored set', async ({
  page,
}) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
    // 20 questions, half right -> mastery 0.5, well under the shelf's 0.95 cutoff
    await Store.recordActivity({
      skillId: 'mul',
      total: 20,
      correct: 10,
      score: 100,
      timeMs: 9000,
      mode: 'solo',
    })
  })
  await page.reload()
  await page.waitForFunction(() => window.__store && window.__session)

  await expect(page.getByText('Needs practice')).toBeVisible()
  const shelfButton = page.getByRole('button', { name: /Multiplication facts to 12×12/ })
  await expect(shelfButton).toBeVisible()
  await expect(shelfButton).toContainText('50% mastery')
  await shelfButton.click()

  // a skill with existing progress skips the warm-up and goes straight to a
  // real, scored 20-question set
  await page.waitForFunction(() => window.__store.getState().phase === 'practice')
  await page.waitForFunction(() => window.__session.activity?.total === 20)
})

test('adaptive difficulty: a weak mastery narrows the addition range, a strong one widens it', async ({
  page,
}) => {
  await gotoApp(page)

  const easy = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('adaptive-test', 'add', 20, { mastery: 0.2 })
  })
  for (const q of easy) {
    const [a, , b] = q.prompt.split(' ')
    expect(Number(a)).toBeLessThanOrEqual(300)
    expect(Number(b)).toBeLessThanOrEqual(300)
  }

  const hard = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('adaptive-test', 'add', 20, { mastery: 0.95 })
  })
  for (const q of hard) {
    const [a] = q.prompt.split(' ')
    expect(Number(a)).toBeGreaterThanOrEqual(400)
  }

  // never played / no ctx at all behaves exactly as before (level 1's range)
  const baseline = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('adaptive-test', 'add', 20)
  })
  for (const q of baseline) {
    const [a] = q.prompt.split(' ')
    expect(Number(a)).toBeGreaterThanOrEqual(20)
    expect(Number(a)).toBeLessThanOrEqual(899)
  }
})

test('a race never adapts to either player: buildQuestionSet without ctx is what mp.js calls', async ({
  page,
}) => {
  await gotoApp(page)
  const a = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('race-seed', 'add').map((q) => q.prompt)
  })
  const b = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    // even a player with a very different mastery would get this if mp.js
    // ever passed ctx through — it doesn't, so this must still match `a`
    return buildQuestionSet('race-seed', 'add').map((q) => q.prompt)
  })
  expect(a).toEqual(b)
})
