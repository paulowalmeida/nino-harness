# Nino Agent Harness

Este projeto é a camada compartilhada de governança dos agentes do Nino. Ele
orienta o trabalho entre `nino-api`, `nino-app` e `nino-docs`; as regras
específicas de cada repositório continuam sendo obrigatórias.

## Ordem de carregamento

Antes de atuar, o agente deve:

1. identificar o repositório e o escopo real da tarefa;
2. ler o adapter correspondente em `adapters/`;
3. ler o `.agents/AGENTS.md` local, quando existir;
4. ler as rules e skills aplicáveis do repositório-alvo;
5. identificar hooks, gates, testes e contratos que a mudança pode afetar;
6. só então propor ou executar trabalho.

## Regra do orchestrator

O `nino-orchestrator` é read-only por padrão. Ele investiga, planeja,
classifica dependências e prepara handoffs. Não altera código nem dispara
implementação sem autorização explícita ou sem um workflow que já tenha sido
aprovado.

## Contrato de handoff

Todo agente delegado deve devolver:

- escopo realmente inspecionado;
- arquivos alterados ou nenhuma alteração;
- evidências e comandos executados;
- decisões tomadas e premissas;
- riscos, limitações e `NEEDS-EVIDENCE` restantes;
- próximo agente recomendado, se houver.

Um gate aprovado não substitui julgamento arquitetural. Um agente não deve
declarar o repositório inteiro limpo a partir de uma validação parcial.

## Regra de retroalimentação

Ao final de cada trabalho, o agente deve avaliar se surgiu um aprendizado
reutilizável, uma falha recorrente ou uma lacuna de enforcement. Quando houver,
deve retroalimentar o artefato normativo mais estreito que governa o caso —
perfil do agente, Skill, rule, hook, gate ou template — com a evidência e o
escopo da mudança. Não basta mencionar o aprendizado na resposta final.

A retroalimentação deve ser específica, testável quando possível e não pode
transformar uma observação isolada em regra geral sem evidência de recorrência.
Depois de editar o harness, o agente deve reler o trecho alterado e executar a
validação aplicável, registrando limitações ou `NEEDS-EVIDENCE` restantes.
