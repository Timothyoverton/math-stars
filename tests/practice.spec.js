import { test, expect } from '@playwright/test'
import { gotoApp, startPractice, playWholeSet, answerCurrent } from './helpers.js'

test('solo practice: 20 questions, score + stars on the result, progress persisted', async ({
  page,
}) => {
  await gotoApp(page)
  await startPractice(page, 'mul')

  await playWholeSet(page)

  // result screen
  await expect(page.getByText('Set complete!').or(page.getByText('Perfect set! 🎉'))).toBeVisible()
  await expect(page.getByText('SCORE', { exact: true })).toBeVisible()

  const score = await page.evaluate(() => window.__store.getState().result.score)
  expect(score).toBeGreaterThan(0)

  const result = await page.evaluate(() => window.__store.getState().result)
  expect(result.total).toBe(20)
  expect(result.correct).toBe(20)
  expect(result.stars).toBe(3) // all correct -> 100% -> 3 stars

  // sessionStorage progress updated
  const progress = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('math-stars:v1:progress')),
  )
  expect(progress.mul.attempts).toBe(20)
  expect(progress.mul.correct).toBe(20)
  expect(progress.mul.stars).toBe(3)
})

test('a wrong answer scores 0 and resets the streak', async ({ page }) => {
  await gotoApp(page)
  await startPractice(page, 'add')

  // answer the first question wrong on the number pad
  await page.getByRole('button', { name: '9', exact: true }).first().click()
  await page.getByRole('button', { name: '9', exact: true }).first().click()
  await page.getByRole('button', { name: '9', exact: true }).first().click()
  await page.getByRole('button', { name: 'Enter', exact: true }).click()

  await page.waitForFunction(() => window.__session.activity.index === 1)
  const s = await page.evaluate(() => window.__session.activity)
  // 999 is not a valid sum of two numbers < 100, so this is reliably wrong
  expect(s.score).toBe(0)
  expect(s.streak).toBe(0)
  expect(s.correct).toBe(0)

  // and a correct answer after that starts the streak again
  await answerCurrent(page)
  const s2 = await page.evaluate(() => window.__session.activity)
  expect(s2.streak).toBe(1)
  expect(s2.correct).toBe(1)
})

test('a multiple-choice fraction skill plays through the DOM to a result', async ({ page }) => {
  await gotoApp(page)
  await startPractice(page, 'fracadd')
  await playWholeSet(page)
  await expect(page.getByText('SCORE', { exact: true })).toBeVisible()
  const r = await page.evaluate(() => window.__store.getState().result)
  expect(r.correct).toBe(20)
  expect(r.stars).toBe(3)
})

test('every skill generates 20 questions whose own answer marks correct', async ({ page }) => {
  await gotoApp(page)
  const report = await page.evaluate(async () => {
    const { SKILLS } = await import('/src/game/skills.js')
    const { buildQuestionSet, isCorrect } = await import('/src/game/questions.js')
    return SKILLS.map((s) => {
      const set = buildQuestionSet('check-' + s.id, s.id)
      const bad = set.filter(
        (q) => !q.prompt || q.answer == null || !isCorrect(String(q.answer), q.answer),
      )
      const choiceBad = set.filter((q) => q.choices && !q.choices.map(String).includes(String(q.answer)))
      return { id: s.id, count: set.length, bad: bad.length, choiceBad: choiceBad.length }
    })
  })
  for (const r of report) {
    expect(r.count, r.id).toBe(20)
    expect(r.bad, `${r.id} has answers that don't self-check`).toBe(0)
    expect(r.choiceBad, `${r.id} has a question whose answer isn't among its choices`).toBe(0)
  }
})

test('the same seed builds the same questions', async ({ page }) => {
  await gotoApp(page)
  const a = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('seed-xyz', 'div').map((q) => q.prompt)
  })
  const b = await page.evaluate(async () => {
    const { buildQuestionSet } = await import('/src/game/questions.js')
    return buildQuestionSet('seed-xyz', 'div').map((q) => q.prompt)
  })
  expect(a).toEqual(b)
  expect(a).toHaveLength(20)
})
