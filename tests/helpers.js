// Shared Playwright helpers. The specs drive the game through its dev globals
// (window.__store / __session / __net), exposed only in the dev build.

export async function gotoApp(page, query = '') {
  await page.goto('/' + query)
  await page.waitForFunction(() => window.__store && window.__session)
}

// Start a solo practice set on `skillId` straight from the store, skipping the
// menu taps.
export async function startPractice(page, skillId) {
  await page.evaluate(
    (id) => window.__store.setState({ phase: 'practice', skillId: id, runId: Date.now() }),
    skillId,
  )
  await page.waitForFunction(() => window.__session.activity && window.__session.activity.currentQuestion)
}

// Answer the current question correctly by reading its answer from the session
// mirror. Works for both number-pad and multiple-choice questions.
export async function answerCurrent(page) {
  const q = await page.evaluate(() => {
    const a = window.__session.activity
    return { answer: String(a.currentQuestion.answer), choices: a.currentQuestion.choices, index: a.index }
  })

  if (q.choices) {
    await page.getByRole('button', { name: q.answer, exact: true }).first().click()
  } else {
    for (const ch of q.answer) {
      const name = ch === '-' ? '±' : ch
      await page.getByRole('button', { name, exact: true }).first().click()
    }
    await page.getByRole('button', { name: 'Enter', exact: true }).click()
  }

  // wait for the engine to advance past this question
  await page.waitForFunction(
    (prev) => {
      const a = window.__session.activity
      return a && (a.index > prev || a.done)
    },
    q.index,
  )
}

export async function playWholeSet(page) {
  for (let i = 0; i < 20; i++) {
    const done = await page.evaluate(() => window.__session.activity.done)
    if (done) break
    await answerCurrent(page)
  }
}
