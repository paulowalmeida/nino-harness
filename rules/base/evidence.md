# Evidence rules

- A search, file name, or grep result is location evidence, not proof of
  behavior or ownership.
- A gate, lint, type-check, or test proves only the invariants and scope it
  actually executes.
- Every architectural decision must identify consumers, dependencies,
  registration/composition, and the affected contract.
- Every correction must identify the test or verification that prevents its
  regression.
- A partial result must be described as partial; never as a clean repository.
