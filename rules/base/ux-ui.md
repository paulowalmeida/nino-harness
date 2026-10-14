# UX/UI ownership and quality rule

## Scope

This rule applies to new user-facing screens, materially reshaped screens, new
journeys and changes with unresolved interaction, visual, responsive,
accessibility, content or internationalization decisions. Repository-specific
rules remain mandatory and win when stricter.

A purely mechanical implementation that preserves an already approved design
may mark `ux-design` not applicable only with evidence that no user-visible
decision changed. Backend-only work is outside this rule unless it changes a
user-visible state or journey.

## Design authority

`ux-ui` is the design authority within approved business scope. Product
priority and business behavior remain with the Product Owner; technical
contracts and ownership remain with architecture; source implementation
remains with `frontend-dev`.

For applicable work, `ux-ui` must produce an approved `ux-design` before
`frontend-dev` implements the screen. The frontend implementer must not invent
missing visual, interaction, responsive, accessibility or
internationalization decisions. Missing material decisions return
`NEEDS-DECISION` to `tech-lead`.

After implementation, `ux-ui` must produce `ux-review` before technical QA.
The review compares the implemented surface with the approved design and does
not silently replace it with a new direction.

## Required design coverage

An applicable `ux-design` must define:

- user goal, primary action, journey and information hierarchy;
- current-surface evidence and intentional continuity or change;
- visual direction, typography, density, color, spacing and purposeful motion;
- initial, loading, empty, partial, error, success, disabled, permission and
  recovery behavior when applicable;
- mobile-first behavior and explicit changes at existing breakpoints;
- keyboard, focus, semantics, announcements, contrast, target size and
  reduced-motion behavior;
- translatable content, text expansion, plural/variable handling,
  locale-aware formatting and directionality assumptions;
- Design System candidates inspected and the reuse/composition/local decision;
- implementation acceptance criteria and visual-QA checks; and
- assumptions, out-of-scope items, open decisions and evidence gaps.

## Design System boundary

The target repository's Design System is the visual implementation source of
truth. The UX/UI agent may propose a missing capability but must not declare a
component absent without inspecting plausible current candidates. A local
implementation requires a concrete gap and evidence that composition is
insufficient. A Design System contract change is an explicit architecture
decision, not a convenience edit.

## Accessibility standard

Applicable work targets WCAG 2.2 Level AA. Use semantic HTML first. Custom
composite widgets must define the keyboard and assistive-technology behavior
using the relevant WAI-ARIA Authoring Practices pattern as informative
guidance. Automated checks are partial evidence; keyboard, focus, screen
reader-facing semantics, zoom/reflow and reduced-motion behavior require
semantic or interactive verification when applicable.

Primary standard: https://www.w3.org/TR/WCAG22/

## Internationalization readiness

The current locale does not permit fixed-layout assumptions. User-facing
designs must allow complete-message translation, text expansion, plural and
variable reordering, locale-aware date/time/number/currency formatting,
flexible names and addresses, Unicode input and direction-neutral layout when
future locale support is in scope. Do not concatenate sentence fragments or
encode meaning only through visual direction.

Primary guidance: https://www.w3.org/International/quicktips/

## Fail-closed behavior

`READY-FOR-IMPLEMENTATION` and `PASS` are forbidden when an applicable
business decision, Design System decision, critical state, responsive
behavior, accessibility requirement or internationalization behavior remains
unresolved or unverified. Report `NEEDS-DECISION`, `NEEDS-EVIDENCE` or
`BLOCKED` with the exact missing prerequisite.
