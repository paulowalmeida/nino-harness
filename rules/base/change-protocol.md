# Change protocol

Estas regras são comuns aos projetos do Nino.

- Antes de editar, identifique escopo, owner, consumidores, contrato público,
  dependências, testes e gates aplicáveis.
- Não inferir ownership por nome de pasta, código legado, alias ou semelhança
  visual; inspecione os consumidores reais.
- Preservar comportamento e contratos públicos salvo autorização explícita.
- Se um defeito pode reaparecer mecanicamente, atualizar regra, hook, gate ou
  teste de regressão junto com a correção.
- Não enfraquecer ou contornar um checker para fazer a mudança passar.
- Antes de concluir, revisar o diff final e separar evidência escopada,
  validação global, limitações e decisões humanas.
- `NEEDS-EVIDENCE` não pode ser reportado como `PASS`.
- Código legado explica dívida existente; não autoriza repetir o padrão em
  código novo ou alterado.
