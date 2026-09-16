# Feature delivery workflow

Workflow padrão para uma feature que atravessa produto, API, aplicação e
documentação.

```text
Orchestrator
    ↓
Requirements / decisions
    ↓
Architecture and contracts
    ├── Backend implementation
    └── Frontend implementation
            ↓
    Security + Testing + QA
            ↓
    Documentation
            ↓
    Release gate
```

## Fases

1. **Brief:** registrar objetivo, usuário, resultado observável e fora de
   escopo.
2. **Evidence:** mapear código atual, consumidores, contratos e limitações.
3. **Architecture:** definir owner, dependências, estados, integração e
   compatibilidade.
4. **Contract:** aprovar payloads, respostas, estados e eventos antes de
   paralelizar implementações.
5. **Surface discovery:** QA mapeia rotas, telas, módulos, endpoints, papéis,
   estados e fluxos relacionados antes da implementação.
6. **Implementation:** delegar para os repositórios e agentes corretos usando
   o inventário descoberto.
7. **Adversarial review:** testar erro, repetição, concorrência, permissão,
   dados inválidos e recuperação quando aplicável.
8. **QA:** validar critérios de aceite e fluxos reais, registrando evidências
   reproduzíveis. Falhas retornam ao agente responsável pela correção.
9. **Documentation:** atualizar contratos, operação e decisões relevantes.
10. **Release:** executar gates escopados e globais; separar falhas não
   relacionadas; revisar o diff final.

Nenhuma fase pode declarar PASS sem a evidência exigida pelo repositório que
possui o código.
