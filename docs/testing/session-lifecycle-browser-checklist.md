# Session Lifecycle Browser Checklist

Use the local staging-mode consumer and partner servers.

## Admin

- [ ] Open /admin?section=create, enter distinctive venue data, switch to
  another browser tab, wait briefly, and return.
- [ ] Confirm there is no blocking auth spinner, the Create section remains
  selected, and every entered value remains.
- [ ] Reload the page and confirm the text/select form state recovers.
- [ ] Confirm any unsubmitted local image must be selected again after reload.
- [ ] Submit once, choose Create another, reload, and confirm the previous
  successful listing does not repopulate the form.
- [ ] Navigate directly between /admin?section=venues and
  /admin?section=create and confirm the matching section opens.

## Consumer

- [ ] While signed in, switch tabs and return from several protected routes.
  Confirm no blocking auth spinner appears and the current route remains.
- [ ] Start onboarding, advance at least one step, reload, and confirm the step
  and answers recover for the same consumer.
- [ ] Complete onboarding and confirm a later visit does not restore the
  completed draft.

## Partner

- [ ] Enter venue changes, switch tabs, and return. Confirm the editor remains
  mounted with its values.
- [ ] Reload the venue editor and confirm text, selections, hours, and existing
  image URLs recover.
- [ ] Repeat for a new event and an existing event.
- [ ] Confirm an unuploaded local file is not restored after reload and the UI
  requires it to be selected again.
- [ ] Successfully save each editor and confirm the submitted draft does not
  return.

## Isolation and Credentials

- [ ] Sign out with an unfinished draft, sign in as a different staging user,
  and confirm the first user's draft is not shown.
- [ ] Confirm sign-in, sign-up, reset, and password-update fields never recover
  a password after reload.

The skeleton replacement for the legitimate initial auth bootstrap is deferred
and is not an acceptance blocker for this fix.
