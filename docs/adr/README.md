# Architecture decision records

An ADR records a decision that outlived the conversation that produced it: why the project is shaped
the way it is, what else was considered, and what it costs. Changes come and go; ADRs are the one
citation allowed in source comments, because they are durable in a way tickets are not.

## When to write one

Write an ADR when a decision is **hard to reverse**, when it **constrains future work**, or when someone
will reasonably ask "why is it like this?" a year from now.

- A choice of runtime, framework, datastore, or protocol
- A trust boundary, or where an authorization check lives
- An approved deviation from `openspec/project.md` — **always**
- A cross-component contract that both sides now depend on
- A deliberate trade-off of one quality against another

Do not write one for a decision a change's `design.md` already carries, or for anything a reader could
work out from the code in a minute. An ADR set nobody trusts to be significant is an ADR set nobody
reads.

## How

One file per decision, numbered sequentially and never renumbered:

```
docs/adr/ADR-001-short-kebab-title.md
```

An ADR is **immutable once accepted**. A decision that changes gets a new ADR that supersedes the old
one; the old one stays, with its status updated and a pointer forward. Editing history is how a record
stops being a record.

## Template

```markdown
# ADR-NNN — Title

- **Status**: Proposed | Accepted | Superseded by ADR-NNN
- **Date**: YYYY-MM-DD
- **Change**: the OpenSpec change this decision came out of, if any

## Context

The forces at play. What is true that makes this a decision rather than an obvious step. Facts, not
justification for a conclusion already reached.

## Decision

What was decided, in the active voice. "We will …"

## Alternatives considered

Each one with the reason it was rejected. An ADR with no rejected alternatives records an assumption,
not a decision — and is the kind that gets re-argued.

## Consequences

What this makes easy, what it makes hard, and what it forecloses. Include the costs honestly; the
next reader needs to know what was accepted, not be sold on it.
```
