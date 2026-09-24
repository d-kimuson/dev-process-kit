# Coding Guideline

## Model the domain explicitly

Represent meaningful states and transitions with discriminated unions rather than combinations of loosely related flags. Keep domain data immutable, and make invalid or incomplete states difficult to construct.

Treat data from storage, authored JSON, DOM boundaries, and public methods as untrusted until a runtime schema has validated it. A compile-time type alone does not establish that external data satisfies the contract.

## Prefer pure transformations

Build domain behavior from functions over plain data. Express a state transition through its inputs and output, and keep time, randomness, storage, DOM access, and other effects at the edge of the system.

Separate presentation derivation from rendering. A presentation function should answer what the UI needs to show without knowing how the DOM will be updated.

Text the kit renders itself comes from the module's `messages.ts` dictionary, one per language, never from a literal in code. A presentation function receives the dictionary as an input; the element resolves the locale from `lang` through `LocaleController`, on connect and again when the reader picks a language in the template header ([ADR](../adr/20260925_ui-localization.md)). The `conventions/localized-text` lint rule rejects Japanese text outside the dictionaries.

Use an existing, focused library before introducing a local utility for a solved general-purpose problem. Keep project code focused on domain behavior.

## Keep changes understandable

Give each module one coherent responsibility. Split a module when independent reasons to change have accumulated; line count is only a signal, not the design rule.

Comments explain constraints and intent that the code cannot make evident. Record durable, costly-to-reverse decisions in an ADR rather than narrating the implementation.

Do not mix a behavior change with an unrelated structural refactor. Keeping them separate makes both the tests and the review evidence easier to interpret.

## Work in short feedback loops

Use test-driven development for behavior changes:

1. Reproduce the missing or incorrect behavior with a failing test.
2. Make the smallest coherent change that passes it.
3. Refactor while preserving the behavior.
4. Run the checks appropriate to the affected boundary.

Choose tests by observable behavior, not by implementation structure. A refactor should normally leave behavioral tests unchanged.
