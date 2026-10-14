# UX/UI gate

The gate applies to new or materially changed user-facing experiences.

## Before implementation

- [ ] The approved business objective, users and primary journey are explicit.
- [ ] The existing surface and nearby Nino patterns were inspected.
- [ ] `ux-ui` produced a valid `ux-design` before `frontend-dev` started.
- [ ] Information hierarchy, primary action and every applicable state are defined.
- [ ] Mobile-first behavior and existing-breakpoint changes are explicit.
- [ ] Keyboard, focus, semantics, announcements, contrast, touch and motion are explicit.
- [ ] Internationalization and locale-format assumptions are explicit.
- [ ] Design System candidates and reuse/composition/local decisions have evidence.
- [ ] Implementation and visual-QA acceptance criteria are observable.
- [ ] Material open decisions are resolved or the status is `NEEDS-DECISION`.

## After implementation

- [ ] `ux-ui` compared the running surface with the approved `ux-design`.
- [ ] Relevant viewport widths, zoom/reflow and content expansion were observed.
- [ ] Keyboard order, visible focus, focus return and interaction feedback were observed.
- [ ] Loading, empty, error, success, disabled and permission states were verified when applicable.
- [ ] Reduced motion and assistive-technology semantics were verified when applicable.
- [ ] Design System implementation matches the approved decision.
- [ ] Findings distinguish blockers, defects, evidence gaps and optional improvements.
- [ ] Technical QA receives a valid `ux-review`; unresolved applicable items prevent `PASS`.
