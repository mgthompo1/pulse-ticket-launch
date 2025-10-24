# Testing Guide for TicketFlo

This project uses a comprehensive testing setup with **Vitest** for unit and component tests, and **Deno** for end-to-end integration tests.

## Test Structure

```
src/
├── components/
│   └── ui/
│       └── button.test.tsx         # Component tests
├── hooks/
│   └── use-toast.test.tsx          # Hook tests
└── test/
    ├── setup.ts                     # Test configuration
    └── utils.test.ts                # Utility function tests

tests/                               # E2E Deno tests
```

## Running Tests

### Unit & Component Tests (Vitest)

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests (Deno)

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test suites
npm run test:e2e:unit
npm run test:e2e:integration

# Watch mode for E2E tests
npm run test:e2e:watch
```

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<YourComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYourHook } from './useYourHook';

describe('useYourHook', () => {
  it('returns expected values', () => {
    const { result } = renderHook(() => useYourHook());

    expect(result.current.value).toBe('expected');
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useYourHook());

    act(() => {
      result.current.updateValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### Utility Function Tests

```typescript
import { describe, it, expect } from 'vitest';
import { yourUtilityFunction } from '@/lib/utils';

describe('yourUtilityFunction', () => {
  it('processes input correctly', () => {
    const result = yourUtilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('handles edge cases', () => {
    expect(yourUtilityFunction('')).toBe('default');
    expect(yourUtilityFunction(null)).toBe('default');
  });
});
```

## Test Configuration

### vitest.config.ts

- **Environment**: jsdom (for DOM testing)
- **Globals**: Enabled (no need to import describe, it, expect)
- **Setup Files**: `src/test/setup.ts` (runs before each test)
- **Coverage**: v8 provider with text, JSON, and HTML reports

### src/test/setup.ts

- Auto-cleanup after each test
- Mocked Supabase client
- Mocked React Router hooks
- Mocked window.matchMedia

## Mocking

### Supabase Client

The Supabase client is automatically mocked in `src/test/setup.ts`. To customize the mock for specific tests:

```typescript
import { vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock a specific query
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: { id: '1', name: 'Test' },
    error: null
  }),
} as any);
```

### Navigation

React Router hooks are mocked by default. To customize:

```typescript
import { vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-id' }),
  };
});
```

## Best Practices

1. **Test behavior, not implementation**: Focus on what the component does, not how it does it
2. **Use testing-library queries properly**:
   - Prefer `getByRole` over `getByTestId`
   - Use `queryBy*` for assertions about non-existence
   - Use `findBy*` for async elements
3. **Mock external dependencies**: Always mock API calls, routing, and third-party services
4. **Keep tests isolated**: Each test should be independent and not rely on others
5. **Test user interactions**: Use `@testing-library/user-event` for realistic user interactions
6. **Coverage targets**:
   - Aim for >80% coverage on critical business logic
   - 100% coverage on utility functions
   - Focus on edge cases and error handling

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (via husky, if configured)
- Pull request checks
- Main branch deployments

## Debugging Tests

### VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Browser Debugging

```bash
# Run tests with UI for visual debugging
npm run test:ui
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event](https://testing-library.com/docs/user-event/intro)
