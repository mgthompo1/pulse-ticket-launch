# Claude Instructions for Pulse Ticket Launch

## Project Overview
This is a React/TypeScript ticket purchasing platform built with Vite, shadcn/ui, Tailwind CSS, and Supabase. The app handles event ticketing with payment processing via Stripe and Windcave.

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Code Quality
Always run `npm run lint` after making changes to ensure code quality.

## Key Technologies & Patterns

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **React Router** for routing
- **React Query** (@tanstack/react-query) for server state
- **React Hook Form** with Zod validation
- **Lucide React** for icons

### Backend/Database
- **Supabase** for database and auth
- **Edge Functions** in `./supabase/functions/`
- **Stripe & Windcave** for payment processing

### State Management
- React Query for server state
- React Hook Form for form state
- Local React state for UI state

## File Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── integrations/  # External service integrations
├── hooks/         # Custom React hooks
└── lib/           # Utilities and configurations
```

## Common Patterns

### Error Handling
```javascript
try {
  // your code
} catch (error) {
  console.error('❌ Operation failed:', error);
}
```

### Component Creation
- Use existing shadcn/ui components from `src/components/ui/`
- Follow the existing TypeScript patterns
- Use Tailwind classes for styling
- Import icons from `lucide-react`

### API Calls
- Use React Query for data fetching
- Supabase client is configured in `src/integrations/supabase/`
- Edge functions are in `./supabase/functions/`

### Forms
- Use React Hook Form with Zod validation
- Follow existing form patterns in the codebase

## Payment Integration
- **Stripe**: Used for card payments
- **Windcave**: Alternative payment processor
- Payment logic primarily in `TicketWidget.tsx` and `TicketFloLIVE.tsx`

## Important Files
- `src/pages/TicketWidget.tsx` - Main ticket purchasing component
- `src/pages/TicketFloLIVE.tsx` - Live ticket purchasing flow
- `src/integrations/supabase/` - Database schema and client setup
- `supabase/functions/` - Edge functions for backend logic

## When Making Changes
1. Check existing patterns in similar components
2. Use TypeScript strictly - no `any` types
3. Follow existing naming conventions
4. Run `npm run lint` before committing
5. Test payment flows carefully if touching payment code
6. Use existing UI components rather than creating new ones
7. Follow the established error handling patterns

## Security Notes
- Never commit API keys or secrets
- Payment processing should go through established edge functions
- Always validate user inputs with Zod schemas