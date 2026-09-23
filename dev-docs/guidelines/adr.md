# ADR Guideline

An Architecture Decision Record preserves a decision whose rationale would otherwise be lost. Create one only when the decision is costly to reverse, surprising without its context, and the result of a real trade-off. If any of these conditions is absent, prefer code, tests, or concise documentation near the relevant contract.

## Scope and naming

Cross-cutting architectural decisions belong in `dev-docs/adr/`. Keep one decision per file and name it `YYYYMMDD_<short-kebab-case>.md`, following the repository's existing chronology.

Write ADRs in English. Describe the decision at the level that should remain useful after the implementation changes; avoid inventories of files, configuration options, lint rules, and step-by-step procedures.

## Content

Use the existing ADR structure when each section contributes meaningful information:

```markdown
# <Decision title>

## Status

accepted

## Context

<The forces, constraints, and alternatives that made a decision necessary.>

## Decision

<What was chosen and why.>

## Consequences

<Important benefits, costs, risks, and constraints created by the decision.>

## References

<Links needed to understand the decision.>
```

Context explains the problem rather than retelling implementation history. Decision states the durable boundary or choice. Consequences include meaningful disadvantages and follow-up constraints, not only benefits. Omit References when none are needed.

## Lifecycle

Do not rewrite history when the decision changes. Add a new ADR that supersedes the old one and update their statuses or cross-references. Correct factual errors directly; use a dated addendum only when later information clarifies the same decision without replacing it.

Do not create ADRs for obvious choices, readily reversible implementation details, or decisions with no credible alternative. The purpose is to preserve scarce architectural context, not to document every change.
