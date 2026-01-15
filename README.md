# bloom.ai

**AI-powered collaborative mindmapping for teams that want to move fast.**

Turn messy brainstorming into structured execution. bloom.ai helps teams explore ideas in real time, surface the best directions, and move from chaos to clarity.

**Live:** https://bloom-mindmaps.fly.dev

## What is bloom.ai?

bloom.ai is a real-time collaborative brainstorming platform where AI actively helps you expand, refine, and connect ideas.

Create mindmaps with your team, vote on promising directions, and let AI suggest new branches when you get stuck. Perfect for hackathons, startups, group projects, and creative sessions.

## Key Features

- **AI-powered idea expansion**  
  Generate contextual node suggestions using AI to unblock creative thinking.

- **Real-time collaboration**  
  Multiple users can edit the same mindmap live with instant sync.

- **Voting & prioritization**  
  Upvote strong ideas to visually surface the best concepts.

- **Minimal, focused UI**  
  Clean interface designed to keep you in flow.

## Tech Stack 

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Zustand (global state)
- Tailwind CSS

### Backend
- FastAPI
- PostgreSQL (Supabase)
- SQLAlchemy ORM
- Redis (rate limiting)
- OpenAI API

### Infrastructure
- Fly.io (containerized deployments)
- Supabase (auth + database)
- Upstash (Redis)
