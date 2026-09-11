// A shareable result-card image for a Star Race win — drawn on a <canvas>, not
// a static asset (same reasoning as the CSS-drawn gems: no image to ship).
// Returns a PNG data URL; the caller decides when to build one (it's a little
// too heavy to render on every result screen unasked).

const W = 600
const H = 315

export function renderShareCard({
  skillLabel,
  youName,
  youAvatar,
  youCorrect,
  total,
  youScore,
  oppName,
  oppCorrect,
  oppScore,
}) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#2b2f77')
  bg.addColorStop(1, '#12142c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffd75e'
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.fillText('⭐ MATH STARS', 28, 38)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 38px system-ui, sans-serif'
  ctx.fillText('🏆 You win!', 28, 92)

  ctx.fillStyle = '#c9cbe8'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText(`${skillLabel} · Star Race`, 28, 120)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px system-ui, sans-serif'
  ctx.fillText(`${youAvatar} ${youName} — ${youCorrect}/${total} · ⭐${youScore}`, 28, 180)
  ctx.font = '22px system-ui, sans-serif'
  ctx.fillStyle = '#c9cbe8'
  ctx.fillText(`vs ${oppName} — ${oppCorrect}/${total} · ⭐${oppScore}`, 28, 216)

  ctx.font = '14px system-ui, sans-serif'
  ctx.fillStyle = '#8d90bd'
  ctx.fillText('play at math-stars', 28, H - 24)

  return canvas.toDataURL('image/png')
}

// A shareable card for a finished Daily Challenge — same canvas/style as the
// race win card above, no opponent to show.
export function renderDailyShareCard({
  skillLabel,
  dateLabel,
  name,
  avatar,
  correct,
  total,
  score,
  stars,
}) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#2b2f77')
  bg.addColorStop(1, '#12142c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffd75e'
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.fillText('⭐ MATH STARS', 28, 38)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 34px system-ui, sans-serif'
  ctx.fillText('🗓️ Daily Challenge', 28, 88)

  ctx.fillStyle = '#c9cbe8'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText(`${dateLabel} · ${skillLabel}`, 28, 116)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px system-ui, sans-serif'
  ctx.fillText(`${avatar} ${name} — ${correct}/${total} · ⭐${score}`, 28, 176)

  ctx.fillStyle = '#ffd75e'
  ctx.font = '26px system-ui, sans-serif'
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 28, 214)

  ctx.font = '14px system-ui, sans-serif'
  ctx.fillStyle = '#8d90bd'
  ctx.fillText('play at math-stars', 28, H - 24)

  return canvas.toDataURL('image/png')
}
