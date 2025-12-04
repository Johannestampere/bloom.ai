# MindBloom — System Overview (For Cursor AI)

This file describes the **concept**, **architecture**, **data model**, **frontend structure**, **backend logic**, and **rules** for generating consistent code for the collaborative real-time mindmap app called **[name]**.

Cursor must treat this file as the **canonical system definition**.

---

# 1. Concept Summary

MindBloom is a **real-time collaborative idea-mapping tool**.

Users brainstorm in teams by entering words, themes, or ideas. These appear as nodes in a dynamic D3 mindmap. The system grows organically as collaborators type.

AI provides:
- Idea expansions
- Subtree summaries
- Concrete project ideas
- Merge suggestions (non-automatic)

Team members can:
- Like nodes → nodes glow/grow visually
- Activate a node → new child nodes attach here
- Click nodes → open an Idea Panel showing AI-generated insights
- Customize theme, fonts, colors, backgrounds
- Invite collaborators into a mindmap

Supabase Realtime synchronizes all updates across clients.

---

# 2. Architecture Overview

## Frontend (Next.js + TypeScript)
Responsible for:
- Rendering the D3 mindmap
- Zustand store for state
- Live sync of nodes via Supabase Realtime
- User interactions (activating nodes, typing content, liking nodes, zooming/panning)
- Calling FastAPI for AI features

## Backend (FastAPI + Python)
Responsible for:
- AI idea expansions
- Subtree summaries
- Merge suggestions
- Mindmap CRUD
- Node CRUD
- Vote logic (liking)
- Authentication/permissions
- Invite flow

## Database (Supabase Postgres)
Tables used:

- `users`
- `mindmaps`
- `collaborators`
- `nodes`
- `votes`

Supabase also broadcasts row-level updates in real time.