# Explore Mode

Tim, 2026-09-11: *"I want to enter explore mode, this moves your avatar
along a map, where you go digging, prospecting for gems and diamonds. At
each stop, is a new maths challenge. Each level is a new map, the new maps
will touch on concepts of the old map ensuring you understand the old map
(20%) and 80% new concepts, your avatar moves through the maps... this idea
is borrowed from Reading Eggs."*

## Reading Eggs research (what it actually does)

Reading Eggs (a K-2 reading app) structures its content as **maps**: ~12-13
maps total, each with ~10 lessons. Each map renders as an illustrated path
with numbered stops; the avatar walks the path lesson to lesson. Progression
is **strictly sequential** — a lesson unlocks only once the previous one is
done, though a completed lesson can always be revisited. Each map ends in a
**quiz / proficiency check** before the next map opens. Finishing a lesson
earns a collectible (an egg/creature) as the reward hook. Skills build
map-to-map: e.g. maps 1-4 cover letter sounds and 3-letter words, maps 5-8
move to short vowels and sight words, maps 9-12 to long vowels and
comprehension — each new map assumes the previous one's content, not a
clean break.

## Mapping onto Math Stars

Math Stars already has almost everything this needs — the design below is
about **reusing** existing systems, not building a parallel content engine.

| Reading Eggs concept | Math Stars equivalent |
| --- | --- |
| A map | One grade tier from `SKILLS_BY_GRADE` (grades 2-7 today) |
| A lesson / stop | One skill within that grade |
| Sequential unlock | A new `explore` Store key tracking a "frontier" position |
| Lesson content | The skill's own `generate(rng)` — nothing new to write |
| Map quiz / proficiency check | A "Map Check" node at the end of each map: a
  mixed set drawn from every skill in that map |
| Collectible reward | The existing gem economy — `gemFor()` / `awardGem()` |
| Illustrated path + avatar | Plain SVG/CSS circles and a connecting line,
  same visual language as the rest of the app (emoji icons, CSS-drawn gem
  facets) — **not** a hand-drawn illustrated scene. The app already tried
  that once for the background and it wasn't good enough (see
  `docs/ROADMAP.md`); a functional diagram of nodes-on-a-path is a different
  kind of visual than an illustrated scene and has been fine elsewhere
  (the stacked-fraction CSS, the gem facets) |

### Maps and stops

Each grade `G` in `SKILLS_BY_GRADE` is one map, in ascending grade order.
Each skill in that grade is one stop, in the order it's declared in
`BASE_SKILLS` (already deterministic). A map with `N` skills has `N + 1`
nodes on its path: the `N` skill stops, then one **Map Check** node.

```
Map (Grade 3)
●──●──●──●──●──●──◆
add sub mul div wp $   Map Check
```

### The 80/20 mix

Reading Eggs' "20% old, 80% new" becomes, per stop: **8 questions from the
stop's own skill, 2 questions drawn from a random skill in an earlier
completed map** (0 review questions for Map 1 / Grade 2, since there's no
earlier map yet). This is a new small function
(`buildExploreStopSet` in `game/explore.js`), not a change to the existing
`buildQuestionSet` — the mixing-across-skills shape doesn't fit that
function's one-skill-per-seed contract, and races/daily/solo practice must
never gain this behavior by accident.

The **Map Check** node draws its questions evenly across every skill in the
current map (one skill picked per question) — it's explicitly a check on
*this* map, not a review of earlier ones.

Stops are **10 questions** (not the usual 20) — Reading Eggs' lessons are
short, and a map with up to 9 stops plus a check needs to stay a snappy
session, not a marathon.

### Progression, storage, rewards

A new `Store` key, `math-stars:v1:explore`, holds:

```js
{
  frontier: { mapIndex: 0, nodeIndex: 0 }, // furthest playable node
  results: {
    "3:add": { correct, total, score, completedAt },   // stop, keyed "grade:skillId"
    "3:check": { correct, total, passed, completedAt }, // map check, keyed "grade:check"
  },
}
```

Playing the node at or before the frontier is allowed; anything past it is
locked. Finishing the node exactly at the frontier advances it (to the next
stop, or — if it was the last stop — to that map's Check node; finishing a
passed Check advances to the next map's first stop). Replaying an
already-completed node just updates its `results` entry; it never moves the
frontier backward or skips it forward.

A stop's completion also calls `Store.recordActivity()` for its skill, same
as ordinary solo practice — an explore stop *is* practice on that skill,
just shorter and wrapped in the map theme, so it should count toward that
skill's normal mastery/stars exactly like any other set. The Map Check
doesn't attribute to a single skill, so it skips `recordActivity` and only
writes its own `results` entry.

**Passing a Map Check** needs ≥50% correct — deliberately forgiving, in
keeping with the house rule of no punishing mechanics for a 9-year-old
audience. Falling short doesn't lock anything or lose progress; the node
just stays at the frontier so it can be tried again, same spirit as "no
negative marking."

Every node completion (stop or check) runs through the existing
`gemFor()` / `awardGem()` gem-drop logic — digging for gems is literally
the fiction, so this is a natural fit with zero new reward code.

### UI

- `ExploreMap.jsx` — the path view for the current map: SVG circles per
  node connected by a line, an avatar marker on the frontier node, a lock
  icon on unreached nodes, a checkmark/star on completed ones. Tapping an
  unlocked node starts it.
- `ExploreStop.jsx` — wraps `useQuiz` the same way `Practice.jsx` does, for
  one stop or the Map Check's question set. On finish, updates `explore`
  progress + calls `recordActivity`/gem-award as above, then returns
  straight to the map view (no separate results screen — the map itself
  shows a brief completion banner) so map-to-map flow stays snappy.
- Two new phase-machine states, `explore` and `exploreStop`, alongside the
  existing `menu / warmup / practice / lobby / countdown / match / result`.
  Entered from a new "🗺️ Explore" button on the Menu.

### What's deliberately out of scope for the first version

- No difficulty adaptation inside a stop (it already gets a fixed 80/20 mix;
  layering the existing adaptive-difficulty `ctx` on top would be a lot of
  extra complexity for a first playable map).
- No head-to-head explore — it's a solo mode, same as Practice.
- No new illustrated art — see the visual-language note above.
- No "unlock the whole game" shortcut UI — nodes past the frontier are
  simply locked with no way to preview them, matching Reading Eggs.
