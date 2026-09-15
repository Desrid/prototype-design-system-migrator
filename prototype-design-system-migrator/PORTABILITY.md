# Portability

The canonical `SKILL.md` uses only `name` and `description` frontmatter and avoids agent-specific interpolation, shell injection, or tool declarations.

## Codex

Install to:

```text
<project>/.agents/skills/prototype-design-system-migrator/
```

Invoke explicitly as `$prototype-design-system-migrator` when needed.

## Claude Code

Install to:

```text
<project>/.claude/skills/prototype-design-system-migrator/
```

Invoke explicitly as `/prototype-design-system-migrator` when needed.

## Limitations

Cross-agent portability does not guarantee identical tool access, browser automation, shell permissions, or context behavior. A real clean run in each agent is required before claiming READY compatibility.
