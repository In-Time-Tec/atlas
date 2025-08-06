# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas is an AI-powered search engine built with Next.js 15, TypeScript, and the Vercel AI SDK. It provides multiple specialized search modes and integrates with various AI models (xAI, Anthropic, Google, OpenAI) and data sources.

## Key Architecture

### Tech Stack

- **Framework**: Next.js 15.4 with App Router and React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with PostCSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with social providers (GitHub, Google, Twitter)
- **AI Integration**: Vercel AI SDK with multiple model providers
- **State Management**: React Query (TanStack Query)
- **Package Manager**: Bun (not npm or yarn)

### Project Structure

```
/app            # Next.js app router pages and API routes
/components     # React components (UI, features, shared)
/lib            # Core utilities, database, tools, and business logic
  /db           # Database schema and queries
  /tools        # AI tool implementations for search features
/hooks          # Custom React hooks
/ai             # AI model provider configurations
/public         # Static assets
```

## Development Commands

```bash
# Install dependencies
bun install

# Run development server with Turbopack
bun dev

# Build for production, do not use, opt for code quality commands
bun build

# Run production server
bun start

# Lint code
bun lint

# Database operations
bun db:generate    # Generate migrations
bun db:migrate     # Run migrations
bun db:push        # Push schema changes
bun db:studio      # Open Drizzle Studio

# Code Quality
bun check          # Run all checks (types, lint, format) in parallel
bun check:types    # Type check with TypeScript
bun check:lint     # Lint code with ESLint (max warnings: 0)
bun check:format   # Check code formatting with Prettier
bun fix            # Auto-fix formatting and linting issues
bun fix:format     # Auto-format code with Prettier
bun fix:lint       # Auto-fix linting issues with ESLint
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure required API keys. Critical keys include:

- AI providers: XAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
- Database: DATABASE_URL
- Auth: BETTER_AUTH_SECRET, social provider credentials
- Search APIs: EXA_API_KEY, TAVILY_API_KEY

## Key Features & Tools

The application implements various search tools in `/lib/tools/`:

- Web search (Tavily)
- Academic search (Exa)
- Social media search (X/Twitter, Reddit)
- Media search (YouTube, Movies/TV)
- Financial tools (stock charts, currency conversion)
- Location services (maps, weather, flights)
- Code interpreter (Daytona sandbox)
- Memory management (Mem0)

## Database Schema

Key tables (defined in `/lib/db/schema.ts`):

- `user`: User accounts and profiles
- `chat`: Conversation sessions
- `message`: Chat messages with parts/attachments
- `subscription`: User subscriptions (Polar)
- `payment`: Payment records (DodoPayments)
- `stream`: Streaming session management

## Authentication Flow

Authentication uses Better Auth with:

- Social providers: GitHub, Google, Twitter
- Session management with cookies
- Integration with payment providers (Polar, DodoPayments)
- User data caching for performance

## AI Model Integration

Models are configured in `/ai/providers.ts` with support for:

- Streaming responses
- Tool/function calling
- Vision capabilities (for applicable models)
- Custom system prompts per search mode

## Search Modes

Different search modes are available:

- Web: General internet search
- Academic: Research papers and academic content
- X/Reddit: Social media search
- YouTube: Video search with transcripts
- Analysis: Code execution and data analysis
- Memory: Personal knowledge management
- Extreme: Multi-step deep research

## Code Style Guidelines

- Use functional components with TypeScript
- Prefer server components where possible
- Use `'use client'` directive only when necessary
- Follow existing patterns for error handling
- Use Tailwind CSS for styling
- Implement proper loading and error states

## State Management Patterns

### TanStack Query for Server State (IMPORTANT)

- **DO NOT use React Context providers for server state** - TanStack Query's global cache automatically shares data between components
- Components using the same query key automatically share cached data without any providers
- This avoids unnecessary re-renders and complexity that context providers introduce

#### Correct Pattern:

```typescript
// ✅ GOOD - Direct hook usage with TanStack Query
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  });
}

// Any component can use this - data is automatically shared via cache
function ComponentA() {
  const { data } = useOrganizations(); // Cached globally
}

function ComponentB() {
  const { data } = useOrganizations(); // Same cached data, no provider needed
}
```

#### Anti-Pattern to Avoid:

```typescript
// ❌ BAD - Unnecessary context provider with TanStack Query
const DataContext = createContext();
// Don't wrap TanStack Query data in contexts!
```

### Key Principles:

- Use TanStack Query for ALL server/API state
- Query keys are the single source of truth for data sharing
- Only add client state managers (Zustand, Valtio) for substantial client-only state
- Consistent query key patterns enable automatic cache sharing
- Use query key factories for organization (see `/hooks/use-organization.ts` for patterns)

## Testing Approach

Currently, the project doesn't have a test suite configured. When implementing tests:

- Check for existing test configurations first
- Follow Next.js testing best practices
- Use appropriate testing libraries for the stack

## Performance Considerations

- Implements caching with Redis for user data
- Uses React Query for client-side data caching
- Database queries are optimized with proper indexes
- Image optimization configured in `next.config.ts`
- Streaming AI responses for better UX

## Deployment

- Configured for Vercel deployment
- Uses standalone output mode
- Docker support available
- Environment-specific configurations for dev/prod

# Development Notes for Atlas

## Important Architecture Decisions

### TanStack Query vs Context Providers

**Date: 2025-01-06**
**Decision: Use TanStack Query's global cache instead of React Context providers for server state**

#### Why No Context Providers:

1. **TanStack Query's global cache automatically shares data** between components using the same query key - no need for providers
2. **Performance benefits**: Avoids unnecessary re-renders that plague context providers
3. **Simpler architecture**: No provider hierarchy, no prop drilling, no boilerplate
4. **Better DX**: Just use hooks directly, data automatically shared via query keys

#### Pattern to Follow:

```typescript
// ✅ Good - Direct hook usage with TanStack Query
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  });
}

// Component A
function OrgList() {
  const { data } = useOrganizations(); // Automatically cached
}

// Component B - shares same cache
function OrgSelector() {
  const { data } = useOrganizations(); // Same data, no provider needed
}

// ❌ Bad - Unnecessary context provider
const OrgContext = createContext();
// Don't do this when using TanStack Query!
```

#### Key Principles:

- Use TanStack Query for ALL server state (API data)
- Query keys are the source of truth for data sharing
- Only add client state managers (Zustand, etc.) for substantial client-only state
- Components using identical query keys automatically share cached data

This approach aligns with modern React best practices and the capabilities of TanStack Query v5.
