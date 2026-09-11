import { test, expect } from '@playwright/test'
import { gotoApp, answerCurrent } from './helpers.js'

// Two browser contexts race each other through the real relay. Locally the
// relay is `npm run party:dev` (started by playwright.config.js); in a sandbox
// that kills it, run with PARTYKIT_HOST=math-stars.<user>.partykit.dev.

async function playToFinish(page) {
  for (let i = 0; i < 20; i++) {
    const done = await page.evaluate(() => window.__session.activity?.done)
    if (done) break
    await answerCurrent(page)
  }
}

test('star race: shared questions, synced start, a winner, rematch', async ({ browser }) => {
  const host = await (await browser.newContext()).newPage()
  const guest = await (await browser.newContext()).newPage()

  await gotoApp(host)
  await host.evaluate(async () => {
    const mp = await import('/src/game/mp.js')
    await mp.hostRace('sub')
  })
  await host.waitForFunction(() => window.__net.session.roomCode)
  const code = await host.evaluate(() => window.__net.session.roomCode)

  // no relay reachable (sandbox kills `partykit dev`, nothing deployed) -> skip
  const connected = await host
    .waitForFunction(() => window.__net.netState.connected, null, { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  test.skip(!connected, 'no PartyKit relay reachable — set PARTYKIT_HOST or run `npm run party:dev`')

  await gotoApp(guest, `?join=${code}`)
  await guest.waitForFunction(() => window.__net.session.roster.length === 2)
  await host.waitForFunction(() => window.__net.session.roster.length === 2)

  // both ready
  await host.evaluate(() => window.__net.session, {})
  await host.getByRole('button', { name: /ready/i }).click()
  await guest.getByRole('button', { name: /ready/i }).click()

  // both reach the match
  await host.waitForFunction(() => window.__store.getState().phase === 'match', null, {
    timeout: 20_000,
  })
  await guest.waitForFunction(() => window.__store.getState().phase === 'match', null, {
    timeout: 20_000,
  })

  // identical first question — proves the seed sync
  const hq = await host.evaluate(() => window.__session.activity.questions[0].prompt)
  const gq = await guest.evaluate(() => window.__session.activity.questions[0].prompt)
  expect(hq).toBe(gq)

  await playToFinish(host)
  await playToFinish(guest)

  // both land on a result with an outcome
  await host.waitForFunction(() => window.__store.getState().phase === 'result')
  await guest.waitForFunction(() => window.__store.getState().phase === 'result')

  const hr = await host.evaluate(() => window.__store.getState().result)
  const gr = await guest.evaluate(() => window.__store.getState().result)
  expect(['win', 'lose', 'draw']).toContain(hr.outcome)
  expect(hr.self.correct).toBe(20)
  expect(gr.opp.correct).toBe(20)

  // rematch returns both to the lobby
  await host.getByRole('button', { name: 'Rematch' }).click()
  await host.waitForFunction(() => window.__store.getState().phase === 'lobby')
  await guest.waitForFunction(() => window.__store.getState().phase === 'lobby')
})
