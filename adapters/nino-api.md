# Adapter: nino-api

## Repositório

`../nino-api`

## Instruções obrigatórias

- `../nino-api/.agents/AGENTS.md`;
- `../nino-api/.agents/rules/`;
- skills `api-architecture-boundaries`, `api-domain-organization`,
  `api-security-integrity` e `api-email-templates` quando aplicáveis.

## Enforcement e gates

- architecture guard;
- integrity gate;
- `lint:domain`;
- typecheck;
- testes Jest escopados ou globais;
- gates adicionais definidos no repositório.

O harness central não substitui essas regras nem inventa abstrações de
NestJS/Prisma.
