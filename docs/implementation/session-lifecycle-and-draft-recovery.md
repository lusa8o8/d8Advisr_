# Session Lifecycle and Draft Recovery

Status: implemented locally; browser acceptance pending

## Discovery

Supabase refreshes the current session when a hidden browser tab becomes visible.
That refresh can emit a new user object for the same identity. The protected
consumer and admin guards treated that object replacement like an account
change, returned to their blocking loading screen, and unmounted the protected
page. The admin page then returned to its default Venues section and discarded
the create form's component-local state.

The partner guard was less sensitive to refresh events, but partner editors and
consumer onboarding still lost component-local state after a genuine reload or
route remount.

## Implemented Contract

- Same-user SIGNED_IN and TOKEN_REFRESHED events preserve the current user
  object's identity.
- Protected scope checks are keyed to the authenticated user ID, not token
  refreshes, query-string changes, or object replacement.
- The selected admin section is represented by the section query parameter.
- Admin listing creation, consumer onboarding, and partner venue/event editors
  keep versioned, per-user drafts in sessionStorage.
- Successful submissions clear their draft.
- Credential fields are never included in draft recovery.
- Raw File objects are never serialized. Already-uploaded image URLs recover,
  while a user must reselect any local file after a full reload.

sessionStorage is intentional: drafts survive reloads in the current browser tab
but are not treated as durable server data or shared across devices.

## Deferred UX

Replace the true initial authentication bootstrap spinner with a portal-specific
skeleton. This is presentation work only. Background token refreshes should no
longer show either a spinner or skeleton because protected content remains
mounted.
