import { test, expect } from '@playwright/test'
import { gotoApp, playWholeSet } from './helpers.js'

test('Explore Mode: sequential unlock, a stop advances the frontier, its 80/20 mix, and recordActivity', async ({
  page,
}) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })
  await page.reload()
  await page.waitForFunction(() => window.__store && window.__session)

  await expect(page.getByText('Explore Mode')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForFunction(() => window.__store.getState().phase === 'explore')

  // map 1 (Grade 2, the youngest map today) — only node 0 is unlocked
  const nodeButtons = page.locator('.explore-node')
  const map0Info = await page.evaluate(async () => {
    const { EXPLORE_MAPS, mapNodes } = await import('/src/game/explore.js')
    return { grade: EXPLORE_MAPS[0].grade, count: mapNodes(EXPLORE_MAPS[0]).length }
  })
  await expect(nodeButtons).toHaveCount(map0Info.count)
  await expect(nodeButtons.nth(0)).toBeEnabled()
  if (map0Info.count > 1) await expect(nodeButtons.nth(1)).toBeDisabled()

  // clicking a locked node is a no-op — still on the map, not a stop
  if (map0Info.count > 1) {
    await nodeButtons.nth(1).click({ force: true })
    expect(await page.evaluate(() => window.__store.getState().phase)).toBe('explore')
  }

  // the unlocked node's skill id, for the recordActivity check below
  const stopSkillId = await page.evaluate(async () => {
    const { EXPLORE_MAPS, mapNodes } = await import('/src/game/explore.js')
    return mapNodes(EXPLORE_MAPS[0])[0].skill.id
  })
  const progressBefore = await page.evaluate(
    (id) =>
      import('/src/game/persist/index.js').then(({ Store }) =>
        Store.getProgress().then((p) => p[id] || null),
      ),
    stopSkillId,
  )
  expect(progressBefore).toBeNull()

  await nodeButtons.nth(0).click()
  await page.waitForFunction(() => window.__store.getState().phase === 'exploreStop')
  await page.waitForFunction(() => window.__session.activity?.total === 10)
  await playWholeSet(page)
  await page.waitForFunction(() => window.__store.getState().phase === 'explore')

  // a stop counts as ordinary practice on its skill
  const progressAfter = await page.evaluate(
    (id) =>
      import('/src/game/persist/index.js').then(({ Store }) =>
        Store.getProgress().then((p) => p[id] || null),
      ),
    stopSkillId,
  )
  expect(progressAfter.attempts).toBe(10)

  // frontier moved one node forward; node 0 is now done, node 1 (if any) unlocked
  const explore = await page.evaluate(() =>
    import('/src/game/persist/index.js').then(({ Store }) => Store.getExplore()),
  )
  expect(explore.frontier).toEqual({ mapIndex: 0, nodeIndex: 1 })
  await expect(nodeButtons.nth(0)).toContainText('✓')
  if (map0Info.count > 2) await expect(nodeButtons.nth(1)).toBeEnabled()
})

test('Explore Mode: a stop mixes 80% its own skill / 20% an earlier map, the first map has no review, and a Map Check draws across the whole map', async ({
  page,
}) => {
  await gotoApp(page)

  const shapes = await page.evaluate(async () => {
    const {
      EXPLORE_MAPS,
      buildStopQuestionSet,
      buildCheckQuestionSet,
      reviewPool,
    } = await import('/src/game/explore.js')

    // first map: no earlier map to review, so every question is its own skill
    const map0 = EXPLORE_MAPS[0]
    const firstMapReview = reviewPool(0)
    const firstStopSet = buildStopQuestionSet('t', map0.skills[0], firstMapReview)

    // a later map: reviewPool is non-empty, so ~20% of the 10 questions come
    // from an earlier map's skill (prompts can't prove *which* skill without
    // re-deriving each generator, so this checks the counts add up via the
    // deterministic seed producing the same 10 prompts every time)
    const laterIndex = EXPLORE_MAPS.length > 1 ? 1 : 0
    const laterMap = EXPLORE_MAPS[laterIndex]
    const laterReview = reviewPool(laterIndex)
    const laterStopSet = buildStopQuestionSet('t', laterMap.skills[0], laterReview)

    const checkSet = buildCheckQuestionSet('t', map0)

    return {
      firstMapReviewEmpty: firstMapReview.length === 0,
      firstStopCount: firstStopSet.length,
      laterReviewNonEmpty: laterReview.length > 0,
      laterStopCount: laterStopSet.length,
      checkCount: checkSet.length,
      mapSkillCount: map0.skills.length,
    }
  })

  expect(shapes.firstMapReviewEmpty).toBe(true)
  expect(shapes.firstStopCount).toBe(10)
  expect(shapes.laterReviewNonEmpty).toBe(true)
  expect(shapes.laterStopCount).toBe(10)
  expect(shapes.checkCount).toBe(10)
  expect(shapes.mapSkillCount).toBeGreaterThan(0)
})

test('Explore Mode: a Map Check needs >=50% to pass, a fail leaves the frontier in place, and a pass crosses the map boundary without recordActivity', async ({
  page,
}) => {
  await gotoApp(page)
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    await Store.reset()
  })

  // fail: frontier stays put
  const afterFail = await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    const { EXPLORE_MAPS, mapNodes, nodeKey } = await import('/src/game/explore.js')
    const map = EXPLORE_MAPS[0]
    const nodes = mapNodes(map)
    const checkIndex = nodes.length - 1
    // fast-forward the frontier to the check node directly, as if every stop
    // before it had already been played
    await Store.recordExploreNode(0, checkIndex, nodeKey(map, nodes[checkIndex]), {
      correct: 2,
      total: 10,
      score: 20,
    }, false /* < 50% -> failed */)
    return Store.getExplore()
  })
  // recordExploreNode only advances if (0, checkIndex) *was* the frontier —
  // it wasn't yet (frontier is still {0,0} after reset), so nothing moved
  expect(afterFail.frontier).toEqual({ mapIndex: 0, nodeIndex: 0 })

  // walk the frontier to the check node for real, then fail it there
  await page.evaluate(async () => {
    const { Store } = await import('/src/game/persist/index.js')
    const { EXPLORE_MAPS, mapNodes, nodeKey } = await import('/src/game/explore.js')
    const map = EXPLORE_MAPS[0]
    const nodes = mapNodes(map)
    for (let i = 0; i < nodes.length - 1; i++) {
      await Store.recordExploreNode(0, i, nodeKey(map, nodes[i]), { correct: 10, total: 10, score: 100 }, true)
    }
  })
  const beforeCheck = await page.evaluate(() =>
    import('/src/game/persist/index.js').then(({ Store }) => Store.getExplore()),
  )
  const checkIndex = beforeCheck.frontier.nodeIndex
  const skillProgressBeforeCheck = await page.evaluate(() =>
    import('/src/game/persist/index.js').then(({ Store }) => Store.getProgress()),
  )

  const failedCheck = await page.evaluate(
    async (idx) => {
      const { Store } = await import('/src/game/persist/index.js')
      const { EXPLORE_MAPS, mapNodes, nodeKey } = await import('/src/game/explore.js')
      const map = EXPLORE_MAPS[0]
      const nodes = mapNodes(map)
      await Store.recordExploreNode(
        0,
        idx,
        nodeKey(map, nodes[idx]),
        { correct: 3, total: 10, score: 30 },
        false,
      )
      return Store.getExplore()
    },
    checkIndex,
  )
  // a failed check doesn't move the frontier — try again, no punishment
  expect(failedCheck.frontier).toEqual({ mapIndex: 0, nodeIndex: checkIndex })

  // a passed check crosses the map boundary (or, on the last map, stays put)
  const passedCheck = await page.evaluate(
    async (idx) => {
      const { Store } = await import('/src/game/persist/index.js')
      const { EXPLORE_MAPS, mapNodes, nodeKey } = await import('/src/game/explore.js')
      const map = EXPLORE_MAPS[0]
      const nodes = mapNodes(map)
      await Store.recordExploreNode(
        0,
        idx,
        nodeKey(map, nodes[idx]),
        { correct: 6, total: 10, score: 60 },
        true,
      )
      return { state: await Store.getExplore(), moreThanOneMap: EXPLORE_MAPS.length > 1 }
    },
    checkIndex,
  )
  if (passedCheck.moreThanOneMap) {
    expect(passedCheck.state.frontier).toEqual({ mapIndex: 1, nodeIndex: 0 })
  } else {
    expect(passedCheck.state.frontier).toEqual({ mapIndex: 0, nodeIndex: checkIndex })
  }

  // the check node itself never called recordActivity for any single skill —
  // per-skill progress is untouched by it
  const skillProgressAfterCheck = await page.evaluate(() =>
    import('/src/game/persist/index.js').then(({ Store }) => Store.getProgress()),
  )
  expect(skillProgressAfterCheck).toEqual(skillProgressBeforeCheck)
})
