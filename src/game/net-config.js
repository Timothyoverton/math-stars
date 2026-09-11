// Where the multiplayer relay lives.
//
// Local dev: `npm run party:dev` serves on 127.0.0.1:1999 and the client below
// picks that up automatically. (Note: `partykit dev` gets SIGTERM'd under some
// sandboxes — the match Playwright spec points at the deployed relay for that
// reason.)
//
// Production: run `npm run party:deploy` once. PartyKit prints the host, which
// looks like  math-stars.<partykit-username>.partykit.dev  — put it here (or set
// VITE_PARTYKIT_HOST at build time) and redeploy the site.

const PROD_HOST = 'math-stars.timothyoverton.partykit.dev'

export const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ||
  (import.meta.env.DEV ? '127.0.0.1:1999' : PROD_HOST)

export const PARTYKIT_CONFIGURED = !PARTYKIT_HOST.includes('CHANGE-ME')
