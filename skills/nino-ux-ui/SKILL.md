---
name: nino-ux-ui
description: Define or review Nino user-facing screens when a feature needs product-specific UX, modern visual direction, responsive behavior, accessibility, internationalization readiness, or Design System decisions. Do not use for backend-only work or purely mechanical UI edits with no unresolved design decision.
---

# Nino UX/UI

Create implementation-ready experience decisions for Nino, then verify the
implemented result. Preserve the approved business scope and current product
identity while raising the visual and interaction quality.

## Load before deciding

Read the approved business brief, affected surface inventory, current running
behavior when available, `agents/ux-ui.md`, `rules/base/ux-ui.md`, the target
repository adapter, and every applicable local rule. For `nino-app`, inspect
the actual Design System components, exports and tokens before proposing UI.
Search is location evidence; inspect plausible candidates before accepting or
rejecting them.

## Choose the mode

- **Design:** use before implementation for new or materially reshaped
  user-facing work. Return `ux-design`.
- **Review:** use after implementation to compare the result with an approved
  design and product intent. Return `ux-review`.
- **Not applicable:** use only when evidence proves the change has no
  user-facing behavior or presentation impact. State the reason.

## Design method

1. Ground the work in one concrete user, context and job. Identify the primary
   action and the cost of failure or confusion.
2. Inspect the existing journey and nearby screens. Preserve learned product
   conventions unless changing them solves an approved problem.
3. Define information hierarchy and interaction before decoration. Make the
   most important state and next action obvious without relying on color.
4. Establish a deliberate visual direction using Nino tokens and typography.
   Spend distinctiveness in one justified signature element; keep supporting
   surfaces disciplined.
5. Specify every meaningful state: initial, loading, empty, partial, error,
   success, disabled, permission, offline/retry and destructive confirmation
   when applicable.
6. Define mobile-first behavior, touch ergonomics, content priority and the
   exact layout changes at existing project breakpoints. Do not describe
   responsiveness as "stack on mobile" without resolving order, overflow,
   persistence and action placement.
7. Define semantics, accessible names, keyboard order and operation, focus
   entry/return, announcements, contrast, target size and reduced motion.
8. Define localization behavior: translatable complete messages, plural and
   variable handling, locale-aware dates/numbers/currency, text expansion,
   flexible names/addresses and direction-neutral layout assumptions.
9. Record the Design System decision for each UI responsibility: reuse,
   compose, reject with inspected evidence, or local implementation for a
   concrete gap.
10. Produce observable acceptance criteria that a frontend implementer and QA
    can verify without guessing the intended design.

## Visual craft

Aim for a contemporary operational product, not a generic admin template.
Use typography, spacing, density, grouping and contrast to encode task
priority. Prefer clear composition and useful data over decorative cards,
gratuitous gradients, excessive pills, ornamental metrics or motion scattered
across unrelated elements. Avoid trend-driven redesign when the existing Nino
language already communicates the job well.

Motion must explain state change, continuity or causality. Copy must use the
user's vocabulary, active verbs and one stable name for each action. Empty and
error states must tell the user what happened and what valid next action is
available.

## Accessibility and internationalization sources

Use WCAG 2.2 Level AA as the conformance target for applicable criteria:
https://www.w3.org/TR/WCAG22/. Use WAI-ARIA APG as informative implementation
guidance for custom interaction patterns:
https://www.w3.org/WAI/ARIA/apg/patterns/. Use the W3C Internationalization
quick tips for language, Unicode, local formats and directionality:
https://www.w3.org/International/quicktips/.

These sources do not replace target-repository rules. Native HTML and the
current Design System remain preferred over recreating APG examples.

## Boundaries

Do not change business rules, API contracts, domain ownership or production
code. Do not invent content that implies unavailable capability. Do not call a
screen accessible, responsive, localized or Design-System compliant without
evidence for the inspected scope. Material uncertainty is an explicit
decision or evidence gap, not permission for the implementer to improvise.

## Completion

Run the applicable UX/UI gate. In design mode, return the contract defined by
`contracts/ux-design.schema.json`. In review mode, return the contract defined
by `contracts/ux-review.schema.json`. Keep optional enhancements separate from
blocking defects and state exactly what was not observed.
