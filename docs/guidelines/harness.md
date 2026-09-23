# Harness Guideline

This repository assumes that coding agents will create and maintain much of the framework and its documentation. Agent context is finite, so every instruction must justify the context it consumes.

## Progressive disclosure

`AGENTS.md` is the single entrypoint. Keep it limited to the project overview, major ownership boundaries, and an index that tells an agent which focused guide to read for a task.

Put task-specific knowledge in `docs/guidelines/` and load it only when relevant. Do not duplicate the same instruction across the entrypoint, guidelines, and tool-specific files. `CLAUDE.md` remains a compatibility symlink to the canonical `AGENTS.md`.

Developer guidelines and user documentation have different audiences. Guidelines direct contributors and agents; `docs/index.md`, `docs/components/`, and `docs/templates/` explain the shipped contract to consumers. Keep these audiences separate.

## Prefer executable policy

If a rule can be decided deterministically, encode it in lint, types, tests, or a verification script rather than prose. Test the enforcement by introducing a representative violation and confirming that the check rejects it.

Guidelines are reserved for rationale, trade-offs, semantic boundaries, and judgment that static checks cannot express. Do not copy option names, rule inventories, or configuration details into a guideline; the configuration is the source of truth for those facts.

Turn repeated multi-step procedures into scripts. Documentation should explain when and why to use the procedure, not duplicate an implementation that can drift.

## Add documentation deliberately

Before adding an instruction, decide where its source of truth belongs:

- Deterministic constraints belong in an executable check.
- Stable but surprising, costly-to-reverse decisions belong in an ADR.
- Task-specific judgment belongs in a focused guideline.
- Consumer-facing contracts belong in public documentation.

Delete guidance that merely restates code or configuration. When prose remains necessary, state the intent once and link to the authoritative source instead of repeating its contents.
