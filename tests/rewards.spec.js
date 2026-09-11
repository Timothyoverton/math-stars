import { test, expect } from '@playwright/test'
import { gotoApp, startPractice, playWholeSet } from './helpers.js'

test('gemFor picks a tier per the roadmap thresholds, and nothing for a dud set', async ({ page }) => {
  await gotoApp(page)
  const report = await page.evaluate(async () => {
    const { gemFor } = await import('/src/game/rewards.js')
    const { GEMS_BY_ID } = await import('/src/game/gems.js')
    const firstPick = (list) => list[0]
    const tierOf = (input) => {
      const id = gemFor(input, firstPick)
      return id ? GEMS_BY_ID[id].tier : null
    }
    return {
      dud: tierOf({ stars: 0 }),
      common: tierOf({ stars: 1 }),
      uncommon: tierOf({ stars: 2 }),
      rare: tierOf({ stars: 3 }),
      epicPerfect: tierOf({ stars: 3, perfect: true }),
      epicMastery: tierOf({ stars: 2, firstFullMastery: true }),
      specialWin: tierOf({ stars: 3, perfect: true, raceWin: true }),
      specialStreak: tierOf({ stars: 1, tenStreak: true }),
      specialBest: tierOf({ stars: 2, newBest: true }),
    }
  })
  expect(report.dud).toBeNull()
  expect(report.common).toBe('common')
  expect(report.uncommon).toBe('uncommon')
  expect(report.rare).toBe('rare')
  expect(report.epicPerfect).toBe('epic')
  expect(report.epicMastery).toBe('epic')
  expect(report.specialWin).toBe('special')
  expect(report.specialStreak).toBe('special')
  expect(report.specialBest).toBe('special')
})

test('Store.awardGem accumulates count and reports isNew only the first time', async ({ page }) => {
  await gotoApp(page)
  const report = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
    const first = await Store.awardGem('ruby')
    const second = await Store.awardGem('ruby')
    const other = await Store.awardGem('jade')
    const collection = await Store.getCollection()
    const count = await Store.getGemCount()
    return { first, second, other, collection, count }
  })
  expect(report.first).toMatchObject({ count: 1, isNew: true })
  expect(report.second).toMatchObject({ count: 2, isNew: false })
  expect(report.other).toMatchObject({ count: 1, isNew: true })
  expect(report.collection.ruby.count).toBe(2)
  expect(report.collection.jade.count).toBe(1)
  expect(report.count).toBe(3)
})

test('a finished solo set drops a gem, shown on the result screen and saved to the collection', async ({
  page,
}) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })
  await startPractice(page, 'mul')
  await playWholeSet(page)
  await page.waitForFunction(() => window.__store.getState().result)

  const result = await page.evaluate(() => window.__store.getState().result)
  expect(result.correct).toBe(20)
  expect(result.gem).toBeTruthy()
  expect(result.gem.name).toBeTruthy()

  await expect(page.locator('.gem-drop b')).toContainText(result.gem.name)

  const collection = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    return Store.getCollection()
  })
  expect(collection[result.gem.id].count).toBe(1)
})
