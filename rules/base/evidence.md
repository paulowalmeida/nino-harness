# Evidence rules

- Busca, nome de arquivo ou resultado de grep é evidência de localização, não
  prova de comportamento ou ownership.
- Gate, lint, typecheck e teste provam apenas os invariantes e o escopo que
  realmente executam.
- Toda decisão arquitetural deve registrar consumidores, dependências,
  registro/composição e contrato afetado.
- Toda correção deve registrar o teste ou verificação que impediria a
  regressão.
- Resultado parcial deve ser descrito como parcial; nunca como repositório
  inteiro limpo.
