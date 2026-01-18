---
title: Session Spec (Pilot)
slug: session-spec
status: draft
summary: '# Session Spec (Pilot)'
tags: []
machine_tags: []
---

# Session Spec (Pilot)

## Purpose

Session is an ecosystem contract for representing a small, read-only subgraph
and an optional narrative route through it. This pilot format is used by Think
Tank for local visualization only. Publish is out of scope.

## Scope

- Data-only, no mutations.
- Session does not contain delta; it may reference external delta sources.
- Canon export remains read-only.

## Structure (v1)

Top-level fields:

- `session_id` (string)
- `title` (string)
- `created_at` (date-time)
- `updated_at` (date-time)
- `subgraph` (object: `nodes`, `edges`)
- `route` (array of node ids)
- `artifacts` (array)

Node shape:

- `id` (string)
- `type` (string)
- `title` (string)
- `summary` (string, optional)
- `refs` (array of strings, optional)

Edge shape:

- `id` (string)
- `from` (string, node id)
- `to` (string, node id)
- `type` (string)
- `label` (string, optional)

Artifact shape:

- `id` (string)
- `type` (string)
- `title` (string)
- `refs` (array of strings, optional)
- `provenance` (required object):
  - `source_ref` (string)
  - `generated_at` (date-time)
  - `model` (string, optional)
  - `prompt_version` (string, optional)

## Invariants

- `route` is a subset of `subgraph.nodes` by node id.
- Optional: neighbors in `route` are connected by an edge in `subgraph.edges`.

## Limits

Limits are defined in `docs/ecosystem/session/SESSION.schema.json` and enforced
by the validator.
