# Adapter: nino-api

## Repository

`../nino-api`

## Required instructions

- `../nino-api/.agents/AGENTS.md`;
- `../nino-api/.agents/rules/`;
- skills `api-architecture-boundaries`, `api-domain-organization`,
  `api-security-integrity`, and `api-email-templates` when applicable.

## Enforcement and gates

- architecture guard;
- integrity gate;
- `lint:domain`;
- typecheck;
- testes Jest escopados ou globais;
- additional gates defined in the repository.

The central harness does not replace these rules or invent NestJS/Prisma
abstractions.
