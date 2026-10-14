# Tech Lead Briefing: Balcao Draft Isolation Audit

Status: BLOCKED — the harness preflight passed, but the automated Product Owner stage timed out in the configured Claude runner before the Tech Lead could return a contract-validated work order. This document preserves the verified audit evidence and is ready for Tech Lead handoff; it does not claim that the Tech Lead stage completed.

## Objective

Prevent a Balcao order draft from carrying customer, destination, address, delivery-fee, or payment state into a different order, while preserving the valid ordering flow and preventing duplicate or invalid charges.

## Repositories and scope

- `nino-app`: Balcao UI, draft lifecycle, destination form, cart reset, fee display, and review state.
- `nino-api`: order creation validation, destination and delivery-fee calculation, customer/address persistence, and server-side invariants.
- Required regression coverage for the complete Balcao flow.

Out of scope: additional real orders, production deployment, and unverified API penetration testing.

## Verified evidence

- The published Balcao page loaded all seven categories and 55 products.
- Required product customization, the three-extra maximum, quantity changes, removal, and separate configured variants passed.
- Retirada, No local, and Entrega branches were exercised.
- Cash exact payment, change calculation, and below-total validation passed.
- A script payload entered as a customer name was rendered as text and did not execute.
- An invalid CEP blocked continuation; a valid CEP restored the address flow.
- The official `Limpar Pedido` action cleared the draft.

## Finding BALCAO-001 — stale order context after item removal

Severity: High

### Reproduction

1. Start a Balcao draft with one synthetic item.
2. Select `Entrega` and fill synthetic customer and address data.
3. Close the flow or remove the final item through the item controls.
4. Add a new item and open the cart again.

### Observed behavior

The new draft retained the previous `Entrega` destination, customer name, phone, address, and the R$3.00 delivery fee. A zero-item draft could also retain the delivery fee. The next cart could therefore show a newly added item plus data and a fee belonging to the previous draft.

### Impact

The operator can expose a previous customer's personal data to the next customer and charge the next order an incorrect delivery fee. This is both a privacy issue and an order-total integrity issue.

### Probable ownership

The defect crosses the frontend draft state and backend order invariant boundary. The frontend must reset all draft-scoped state when the draft is discarded or reaches zero items; the backend must reject inconsistent combinations and recalculate the final total from the submitted order data rather than trusting stale client state.

## Acceptance criteria

- Removing the last item resets destination, customer, phone, address, delivery fee, payment method, received amount, and review state.
- Closing or abandoning a draft cannot make its customer or address data appear in a subsequent draft.
- A draft with zero items always has total R$0.00 and no delivery fee.
- Adding a new item after abandoning a delivery draft starts with no destination selected and no delivery fee.
- The server rejects an order with zero items, a delivery fee without a delivery destination, or a total inconsistent with its items and configured delivery rules.
- The final review and persisted order contain only the current draft's data.
- Regression tests cover the reproduction above and the existing happy path.
- Security tests confirm that customer and address data cannot cross draft boundaries and that untrusted text remains escaped.

## Recommended Tech Lead delegation graph

1. `tech-lead` → `architecture`: define the draft lifecycle invariant and the frontend/backend ownership boundary.
2. `tech-lead` → `backend-dev`: enforce server-side item, destination, fee, and total invariants; add API regression tests.
3. `tech-lead` → `frontend-dev`: reset draft-scoped state and correct fee/review derivation after discard or zero items.
4. `tech-lead` → `security`: verify privacy isolation, tampering resistance, and authorization boundaries.
5. `tech-lead` → `testing`: execute the full Balcao matrix and add regression coverage.
6. `tech-lead` → `qa`: re-run the complete UI flow and verify every acceptance criterion.

Recommended order: architecture, backend contract/invariants, frontend reset, security and testing, then QA and business regression.

## Required gates

- Orchestration preflight before technical inspection or implementation.
- Architecture/ownership approval for the cross-repository boundary.
- Contract approval for server-side total and destination invariants.
- Security review and regression testing.
- QA handoff followed by Product Owner business regression.
- No production action without explicit approval.

## Evidence limitations

The audit was black-box against the published development environment. It did not inspect source code, API requests, persistence, IDOR, CSRF, authorization, or server-side validation. Those items remain `NEEDS-EVIDENCE` for the delegated specialists.

## Runtime evidence

- Preflight: passed.
- Run: `run-e1ae6676-7ca6-46c5-be7d-401fd93aa85e`.
- Product Owner runner: timed out after approximately 170 seconds with no model output; the retry was interrupted to avoid further waste.
