# Frontend Testing

This directory contains tests for the frontend application using Vitest and React Testing Library.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `src/lib/__tests__/` - Tests for utility functions (API client, helpers)
- `src/components/__tests__/` - Tests for React components
- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Global test setup and mocks

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### API Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { api } from '../api';

describe('API', () => {
  it('should make GET request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    const result = await api.get('/endpoint');
    expect(result).toEqual({ data: 'test' });
  });
});
```

## Mocked Modules

The following are automatically mocked in `vitest.setup.ts`:

- `next/navigation` - useRouter, useSearchParams, usePathname
- `localStorage` - Full localStorage implementation
- `fetch` - Global fetch function

## Coverage

Test coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.
