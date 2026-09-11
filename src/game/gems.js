// The gem collection — data only, one object per gem, same spirit as
// skills.js. `gemFor()` in rewards.js decides which tier a finished set
// earns; a gem within that tier is picked at random.
//
//   id      stable key, used in the collection store
//   name    shown in the collection screen
//   tier    'common' | 'uncommon' | 'rare' | 'epic' | 'special'
//   colors  [start, end] for the gem's CSS gradient

export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'special']

export const TIER_LABEL = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  special: 'Special',
}

export const GEMS = [
  // common — finish any set, pass mark (≥60%, 1 star)
  { id: 'tigers-eye', name: "Tiger's eye", tier: 'common', colors: ['#caa15a', '#7a5a20'] },
  { id: 'quartz', name: 'Quartz', tier: 'common', colors: ['#f4f2f8', '#c7c4d6'] },
  { id: 'agate', name: 'Agate', tier: 'common', colors: ['#8fb3ad', '#3f6b66'] },

  // uncommon — 2-star set (≥80%)
  { id: 'amethyst', name: 'Amethyst', tier: 'uncommon', colors: ['#c199e8', '#6b3fa0'] },
  { id: 'citrine', name: 'Citrine', tier: 'uncommon', colors: ['#ffd873', '#d99a1f'] },
  { id: 'jade', name: 'Jade', tier: 'uncommon', colors: ['#8fe3b0', '#2f9e63'] },

  // rare — 3-star set (≥95%)
  { id: 'sapphire', name: 'Sapphire', tier: 'rare', colors: ['#6fa3ff', '#1c46b3'] },
  { id: 'emerald', name: 'Emerald', tier: 'rare', colors: ['#4fd18b', '#0f7a49'] },
  { id: 'ruby', name: 'Ruby', tier: 'rare', colors: ['#ff6f8e', '#b3123a'] },

  // epic — perfect 20/20, or first time a skill hits full mastery
  { id: 'diamond', name: 'Diamond', tier: 'epic', colors: ['#ffffff', '#a9d6ff'] },

  // special — a Star Race win, a 10-streak, a new best score
  { id: 'star-ruby', name: 'Star ruby', tier: 'special', colors: ['#ff5ca8', '#7a1150'] },
  { id: 'black-opal', name: 'Black opal', tier: 'special', colors: ['#3a3a55', '#0d0d1a'] },
]

export const GEMS_BY_ID = Object.fromEntries(GEMS.map((g) => [g.id, g]))
export const GEMS_BY_TIER = TIERS.reduce((acc, t) => {
  acc[t] = GEMS.filter((g) => g.tier === t)
  return acc
}, {})

export function getGem(id) {
  return GEMS_BY_ID[id] || null
}
