# Consumer desktop width policy

Status: Slice 1 implemented  
Decision date: 26 August 2026

## Why this exists

The authenticated desktop shell provides a 240px sidebar and a flexible main
area, but it does not impose a content width. Home already constrains its
desktop discovery content to `max-w-5xl`, while several other consumer pages
render their forms, lists, and cards across the entire remaining viewport.
That makes otherwise correct screens feel stretched on wide monitors.

The shell must remain flexible because maps, admin operations, and selected
media heroes are intentionally full width. Width is therefore a consumer-page
content policy, not a blanket `DesktopShell` rule.

## Width tokens

Use the narrowest width that fits the content. These are desktop constraints;
mobile remains full width with the page's existing horizontal padding.

| Token | Tailwind width | Use for |
| --- | --- | --- |
| `reading` | `max-w-2xl` (672px) | Settings, profile utilities, forms, notifications, and single-column editors |
| `standard` | `max-w-5xl` (1024px) | Home-style feeds, plans lists, and ordinary discovery content |
| `wide` | `max-w-6xl` (1152px) | Only genuinely dense future desktop content |

Each constrained surface is centered with `mx-auto w-full`. The page or hero
background can still span the shell; only the readable content surface is
constrained.

## Deliberate full-width exceptions

- Map canvas and map overlays
- Admin operational workspace
- Full-bleed event and venue media heroes
- Full-width background treatments whose inner content is separately bounded

These exceptions should receive an inner width wrapper when their text or
controls become difficult to scan; their visual background should not be
constrained merely to satisfy this policy.

## Mini implementation plan

1. Add shared width tokens in `SharedUI` so page choices are named and
   consistent. **Done.**
2. Apply `reading` to standard utility/form pages and `standard` to the
   saved-plans/discovery-style pages. Keep Home's existing `max-w-5xl` shape.
   **Done for the first standard-page slice.**
   The first browser review found that constraining a page root also constrained
   its background and sticky header. Plans, Notifications, and Profile now keep
   the page canvas full width and constrain only their header contents and
   readable body.
   Remaining pages should follow this same inner-surface pattern as they are
   reviewed.
3. Leave map, admin, media heroes, and onboarding-specific layouts untouched
   in this slice. **Done.**
4. Run the consumer containment check, workspace typecheck, and diff hygiene;
   then perform a desktop browser pass at a wide viewport and at the 1024px
   shell breakpoint. **Automated checks and the wide-viewport browser pass are
   done for Plans, Notifications, and Profile; the 1024px pass and remaining
   page review are still open.**

## Acceptance notes

- At desktop widths, reviewed surfaces keep their background/header full width
  while the content column is centered (`standard` or `reading`).
- At mobile widths, layout and full-bleed feed behavior are unchanged.
- At the `lg` breakpoint, existing desktop shell spacing remains stable.
- Full-width exceptions continue to use the entire available canvas.
