import { test, expect } from '@playwright/test'
import { gotoApp, playWholeSet } from './helpers.js'

test('runBot is deterministic and a sharper level scores higher accuracy', async ({ page }) => {
  await gotoApp(page)
  const report = await page.evaluate(async () => {
    const { runBot, BOT_LEVELS } = await import('/src/game/bot.js')
    const { buildQuestionSet } = await import('/src/game/questions.js')
    const questions = buildQuestionSet('seed1', 'mul')

    function play(level) {
      return new Promise((resolve) => {
        const progress = []
        runBot({
          seed: 'seed1',
          skillId: 'mul',
          level: { ...level, thinkMs: [0, 1] }, // near-instant so the test stays fast
          questions,
          onProgress: (p) => progress.push(p),
          onFinish: (f) => resolve({ ...f, progress }),
        })
      })
    }

    const turboA = await play(BOT_LEVELS.find((l) => l.id === 'turbo'))
    const turboB = await play(BOT_LEVELS.find((l) => l.id === 'turbo'))
    const warmup = await play(BOT_LEVELS.find((l) => l.id === 'warmup'))
    return { turboA, turboB, warmup }
  })

  // same seed + level -> byte-identical run, same as every other generator here
  expect(report.turboB.correct).toBe(report.turboA.correct)
  expect(report.turboB.score).toBe(report.turboA.score)
  expect(report.turboA.progress).toHaveLength(20)
  expect(report.turboA.progress.at(-1).q).toBe(20)

  // turbo (95% accuracy) should clear warm-up (55%) on the same 20 questions
  expect(report.turboA.correct).toBeGreaterThan(report.warmup.correct)
})

test('cancelling a bot run stops it firing onFinish', async ({ page }) => {
  await gotoApp(page)
  const fired = await page.evaluate(async () => {
    const { runBot, BOT_LEVELS } = await import('/src/game/bot.js')
    const { buildQuestionSet } = await import('/src/game/questions.js')
    const questions = buildQuestionSet('seed2', 'mul')
    let onFinishCalled = false
    const cancel = runBot({
      seed: 'seed2',
      skillId: 'mul',
      level: { ...BOT_LEVELS[0], thinkMs: [20, 30] },
      questions,
      onProgress: () => {},
      onFinish: () => {
        onFinishCalled = true
      },
    })
    cancel()
    await new Promise((r) => setTimeout(r, 200))
    return onFinishCalled
  })
  expect(fired).toBe(false)
})

test('play the robot: races a bot match through to a result with an outcome', async ({ page }) => {
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

  await playWholeSet(page) // the player finishes almost instantly...

  // ...then the screen waits for the robot to play out its own 20 questions
  await expect(page.getByText(/waiting/i)).toBeVisible()
  await page.waitForFunction(() => window.__store.getState().phase === 'result', null, {
    timeout: 40_000,
  })

  const result = await page.evaluate(() => window.__store.getState().result)
  expect(result.mode).toBe('race')
  expect(result.isBot).toBe(true)
  expect(result.self.correct).toBe(20)
  expect(result.opp.correct).toBeGreaterThan(0)
  expect(['win', 'lose', 'draw']).toContain(result.outcome)

  await expect(page.getByRole('button', { name: 'Race the robot again' })).toBeVisible()
})
