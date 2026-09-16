# nino-harness

Harness compartilhado para os agentes que trabalham no ecossistema Nino.

## O que vive aqui

- `agents/`: perfis de agentes e responsabilidades;
- `adapters/`: como cada repositório carrega o harness;
- `contracts/`: formatos estruturados de handoff e work order;
- `rules/base/`: regras comuns a todos os projetos;
- `gates/`: checkpoints compartilhados de qualidade;
- `hooks/`: verificações mecânicas da integridade do próprio harness;
- `registry.yaml`: catálogo de agentes, permissões e capacidades;
- `workflows/`: sequências de trabalho entre agentes;
- `templates/`: formatos de handoff, work order e relatórios opcionais.

Hooks, gates e regras que dependem da estrutura de um repositório permanecem
no próprio repositório. O harness central define o protocolo; o projeto local
fornece a implementação técnica.

## Perfis atuais

- `nino-orchestrator`: planejamento, roteamento e coordenação;
- `backend-dev`: implementação disciplinada de NestJS/Prisma no `nino-api`;
- `frontend-dev`: implementação disciplinada de Pages, facades, Hooks, estado
  e Design System no `nino-app`;
- `qa`: discovery da superfície, validação funcional, integração e regressão
  com evidências;
- os agentes `testing`, `security`, `ux-ui`,
  `documentation` e `release` são perfis em evolução.

O workflow estruturado está em `workflows/feature-delivery.yaml`. O arquivo
`agents/registry.yaml` é um catálogo de capacidades e permissões; ele não
dispara agentes sozinho. Um runtime de orquestração será adicionado depois,
quando os contratos forem exercitados em uma feature real.

## Harness gate

Antes de publicar mudanças neste repositório, execute:

```bash
npm run harness:guard
```

Esse comando valida registry, referências, perfis, contratos e padrões de
credenciais. Ele não substitui os hooks e gates específicos dos projetos.

## Aprendizado dos agentes

Retrospectivas e avaliações de uma execução devem ser temporárias por padrão,
em `/tmp/nino-harness-feedback/<run-id>`. O `learning-curator` pode encaminhar
esse contexto para a próxima iteração e descartar o material depois. Somente
lições aprovadas, evidenciadas e protegidas por uma regra, Skill, hook, gate,
documentação ou teste podem entrar em `feedback/retained/`.

O guard do harness valida os registros retidos:

```bash
npm run harness:feedback:guard
```

## Regra de evolução

Uma regra comum entra aqui somente quando vale para pelo menos dois projetos.
Uma regra específica de NestJS, Prisma, Pages, Design System ou Docusaurus
fica no adapter e no repositório que possui aquele contexto.
