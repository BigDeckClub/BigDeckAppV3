# Testing Guide

This guide covers testing practices and infrastructure for BigDeckAppV3.

## Test Framework

We use **Vitest** as our test runner with **React Testing Library** for component tests.

### Key Dependencies

- `vitest` - Test runner (Vite-native, fast)
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - DOM matchers
- `jsdom` - DOM environment for tests

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- useWizardState.test.js

# Run tests matching pattern
npm test -- --grep "useInventoryChecks"
```

## Test Organization

```
BigDeckAppV3/
├── src/
│   └── __tests__/          # Frontend tests
│       ├── setup.js        # Test setup and global mocks
│       ├── *.test.js       # Hook tests
│       └── *.test.jsx      # Component tests
└── server/
    └── __tests__/          # Backend tests
        ├── *.test.js       # Service and utility tests
        └── routes/         # Route handler tests
```

## Test Coverage

### Current Test Files

| File | Type | Lines | Coverage |
|------|------|-------|----------|
| `logger.test.js` | Utility | ~100 | Server logging |
| `schemas.test.js` | Validation | ~350 | Zod schemas |
| `useWizardState.test.js` | Hook | ~250 | Wizard state machine |
| `useInventoryChecks.test.js` | Hook | ~220 | Inventory queries |

### Coverage Goals

- **Hooks**: 80%+ coverage
- **Services**: 75%+ coverage
- **Utilities**: 90%+ coverage
- **Components**: 60%+ coverage (UI components)

## Writing Tests

### Unit Tests for Hooks

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../hooks/useMyHook';

describe('useMyHook', () => {
  let result;

  beforeEach(() => {
    const hook = renderHook(() => useMyHook());
    result = hook.result;
  });

  it('should have initial state', () => {
    expect(result.current.value).toBe(0);
  });

  it('should update state', () => {
    act(() => {
      result.current.increment();
    });

    expect(result.current.value).toBe(1);
  });
});
```

### Unit Tests for Services

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { myService } from '../services/myService';

describe('MyService', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
  });

  it('should fetch data', async () => {
    const result = await myService.fetchData();
    expect(result).toBeDefined();
  });

  it('should handle errors', async () => {
    // Mock fetch to throw error
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    await expect(myService.fetchData()).rejects.toThrow('Network error');
  });
});
```

### Component Tests

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Validation Schema Tests

```javascript
import { describe, it, expect } from 'vitest';
import { MySchema } from '../validation/schemas';

describe('MySchema', () => {
  it('should accept valid data', () => {
    const data = { name: 'Test', age: 25 };
    const result = MySchema.parse(data);
    expect(result).toEqual(data);
  });

  it('should reject invalid data', () => {
    const data = { name: '', age: -1 };
    expect(() => MySchema.parse(data)).toThrow();
  });

  it('should apply defaults', () => {
    const data = { name: 'Test' };
    const result = MySchema.parse(data);
    expect(result.age).toBe(18); // Default value
  });
});
```

## Testing Best Practices

### 1. Test Structure (AAA Pattern)

```javascript
it('should do something', () => {
  // Arrange - Set up test data
  const input = { value: 10 };

  // Act - Execute the code being tested
  const result = processInput(input);

  // Assert - Verify the result
  expect(result).toBe(20);
});
```

### 2. Descriptive Test Names

✅ **Good:**
```javascript
it('should return empty array when inventory is empty', () => { ... });
it('should calculate total price including tax', () => { ... });
```

❌ **Bad:**
```javascript
it('test 1', () => { ... });
it('works', () => { ... });
```

### 3. Test One Thing

```javascript
// Good - focused test
it('should validate email format', () => {
  expect(validateEmail('test@example.com')).toBe(true);
  expect(validateEmail('invalid')).toBe(false);
});

// Bad - testing multiple unrelated things
it('should validate and send email', () => {
  // Validation
  expect(validateEmail('test@example.com')).toBe(true);
  // Sending (different concern)
  expect(sendEmail('test@example.com')).resolves.toBe(true);
});
```

### 4. Use Mocks Appropriately

```javascript
// Mock external dependencies
vi.mock('../utils/apiClient', () => ({
  get: vi.fn(() => Promise.resolve({ data: [] }))
}));

// Don't mock what you're testing
// ❌ Don't do this
vi.mock('../hooks/useMyHook'); // You're testing this!
```

### 5. Clean Up After Tests

```javascript
import { afterEach } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  // Reset any global state
});
```

## Mocking Patterns

### Mock API Calls

```javascript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mock data' })
  })
);
```

### Mock Context Providers

```javascript
const mockInventory = [{ name: 'Sol Ring', quantity: 4 }];

const wrapper = ({ children }) => (
  <InventoryProvider value={{ inventory: mockInventory }}>
    {children}
  </InventoryProvider>
);

const { result } = renderHook(() => useInventoryChecks(), { wrapper });
```

### Mock Timers

```javascript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should wait 1 second', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

## Common Testing Scenarios

### Testing Async Functions

```javascript
it('should fetch data asynchronously', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// Or with resolves/rejects
it('should resolve with data', () => {
  return expect(fetchData()).resolves.toEqual({ data: 'test' });
});

it('should reject with error', () => {
  return expect(fetchData()).rejects.toThrow('Error');
});
```

### Testing State Updates

```javascript
it('should update state', () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

### Testing useEffect

```javascript
it('should call effect on mount', () => {
  const effect = vi.fn();

  renderHook(() => {
    useEffect(() => {
      effect();
    }, []);
  });

  expect(effect).toHaveBeenCalledOnce();
});
```

## Debugging Tests

### View Test Output

```bash
# Verbose output
npm test -- --reporter=verbose

# Show all console.log statements
npm test -- --silent=false
```

### Debug Specific Test

```javascript
it.only('should debug this test', () => {
  console.log('Debug output');
  expect(true).toBe(true);
});
```

### Skip Tests Temporarily

```javascript
it.skip('should test this later', () => {
  // This test won't run
});

describe.skip('Feature X', () => {
  // All tests in this block are skipped
});
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-commit hook (optional)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

## Next Steps

### Planned Test Coverage

- [ ] Service layer tests
  - [ ] `scryfallService.test.js`
  - [ ] `edhrecService.test.js`
  - [ ] `deckGenerationService.test.js`
- [ ] Hook tests
  - [ ] `useDeckGeneration.test.js`
  - [ ] `usePrintProxies.test.js`
  - [ ] `useApiClient.test.js`
- [ ] Component tests
  - [ ] `DeckStatsSidebar.test.jsx`
  - [ ] `PrintProxiesModal.test.jsx`
- [ ] Route handler tests
  - [ ] `ai.routes.test.js`
  - [ ] `decks.routes.test.js`
  - [ ] `inventory.routes.test.js`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Questions?

- Check existing tests in `src/__tests__/` for examples
- Review [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for architecture details
