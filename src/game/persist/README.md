# persist/ — how to add the real backend

Every persistent read/write in Math Stars goes through the **`Store` facade** in
[`index.js`](index.js). Nothing else in the app touches storage. Every `Store`
method is `async` even though `sessionStorage` is synchronous, so the swap below
never touches a caller.

## The adapter contract

That's all an adapter is:

```js
{
  read(key):        Promise<any | null>,
  write(key, value): Promise<void>,
  remove(key):      Promise<void>,
}
```

`Store` is built on **one** adapter, chosen in `index.js` (or by the `VITE_STORE`
env var):

| file                | backing              | when                          |
| ------------------- | -------------------- | ----------------------------- |
| `sessionAdapter.js` | `sessionStorage`     | **now** — lost on tab close   |
| `memoryAdapter.js`  | a `Map`              | tests (`VITE_STORE=memory`)   |
| `remoteAdapter.js`  | network + auth token | later — the real backend      |

Want progress to survive a reload before the real backend lands? Change
`window.sessionStorage` to `window.localStorage` in `sessionAdapter.js`. One line.

## Keys

Versioned: `math-stars:v1:profile`, `math-stars:v1:progress`, `math-stars:v1:history`.
A schema change bumps `v1` and migrates or discards cleanly.

## Writing `remoteAdapter.js`

1. Implement `read` / `write` / `remove` against the backend, keyed per student
   by a login token.
2. Map the three keys to rows / documents / KV entries.
3. Select it in `index.js` (or wire `VITE_STORE=remote`).

The brief's recommendation is **Supabase** (Postgres + auth + row-level security)
unless the product stays strictly single-student with no teacher dashboard, in
which case **PartyKit room storage** (a Durable Object per student) is the
lighter fit since the relay is already deployed.
