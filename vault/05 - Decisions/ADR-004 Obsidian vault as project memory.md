---
tags: [adr]
status: accepted
date: 2026-11-13
---
# ADR-004: Obsidian vault as project memory

## Context
Sessions start without memory. Organa used a French "LLM wiki" vault (`raw/` + `wiki/`); Horizon Quests used a numbered English vault with Home, journal and ADRs, which worked well over four intense days.

## Decision
Horizon Quests' structure: `00 - Home` (status, next step, map), numbered folders, one journal note per session, ADRs plus an index, templates. **Every file in English**; chat in French. Every Horizon fact names the commit it was read on, **verified** and **to check** apart (Organa's habit).

## Consequences
- Start of session: Home, latest journal, then the notes the task needs. End: journal, roadmap, Home, questions, ADRs.
- Organa's French vault stays in the old folder as raw history.

## Links
- [[Decision index]]
