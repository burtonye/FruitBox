# Fruit Box Test Suite

Comprehensive Playwright test suite to ensure UI stability during development and updates.

## Overview

This test suite covers:
- **Core UI Elements**: Verifies all game components render correctly
- **Game Mechanics**: Tests selection, scoring, and game controls
- **Game State**: Validates timer, victory, and game over conditions
- **Feature Toggles**: Ensures compact mode, light mode, and music toggle work properly

## Installation

Install test dependencies:

```bash
npm install
```

This will install Playwright and its browser dependencies.

If browsers aren't automatically installed, run:

```bash
npx playwright install
```

## Running Tests

### Run all tests (headless mode)
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests with browser visible
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/ui-elements.spec.js
```

### Run tests in a specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Organization

### `tests/ui-elements.spec.js`
Tests all UI components are present and visible:
- Page title and headings
- Game info displays (score, target, apples left, timer)
- Control buttons and inputs
- Game board rendering
- Instructions
- Overlays and selection feedback

### `tests/game-mechanics.spec.js`
Tests core gameplay functionality:
- Drag selection with visual feedback
- Apple highlighting during selection
- Sum calculation and display
- New game functionality
- Target sum configuration and validation
- Timer reset on new game
- Instructions update with target changes

### `tests/game-state.spec.js`
Tests game state transitions:
- Timer countdown
- Game over on timeout
- Victory when all apples cleared
- Game over when no valid moves exist
- Restart functionality
- Score persistence and reset
- Prevention of interactions after game over

### `tests/feature-toggles.spec.js`
Tests optional features:
- Light color mode toggle and styles
- Compact board layout (8×12 vs 10×17)
- Game restart on layout change
- Background music toggle
- Feature state persistence during gameplay
- Multiple simultaneous toggles
- Responsive layout (auto-compact on mobile)

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

This opens an interactive report showing:
- Pass/fail status for each test
- Screenshots of failures
- Execution traces
- Performance metrics

## CI/CD Integration

The test suite is configured for CI environments:
- Automatic retries on flaky tests
- Screenshots on failure
- Trace collection for debugging
- HTML report generation

### GitHub Actions Example

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Writing New Tests

When adding new features to Fruit Box, add corresponding tests:

1. **Create a new spec file** or add to existing:
   ```javascript
   const { test, expect } = require('@playwright/test');

   test.describe('Feature Name', () => {
     test.beforeEach(async ({ page }) => {
       await page.goto('/index.html');
       await page.waitForSelector('.game-board');
     });

     test('should do something', async ({ page }) => {
       // Test implementation
     });
   });
   ```

2. **Use descriptive test names** that explain the expected behavior
3. **Test user-visible behavior**, not implementation details
4. **Include both positive and negative test cases**
5. **Consider edge cases** (empty states, boundaries, errors)

## Best Practices

### Waiting for Elements
```javascript
// Good: Wait for specific element
await page.waitForSelector('.game-board');

// Avoid: Arbitrary timeouts (use only when necessary)
await page.waitForTimeout(500);
```

### Assertions
```javascript
// Good: Clear, specific assertions
await expect(page.locator('#score')).toHaveText('0');

// Good: Check visibility before interacting
await expect(button).toBeVisible();
await button.click();
```

### Page Interactions
```javascript
// Good: Use role-based selectors for accessibility
await page.getByRole('button', { name: 'New Game' }).click();

// Good: Use data attributes for test stability
await page.locator('[data-testid="score-display"]').click();
```

## Debugging Failed Tests

1. **Run in headed mode** to see browser:
   ```bash
   npm run test:headed
   ```

2. **Use debug mode** to pause execution:
   ```bash
   npm run test:debug
   ```

3. **Check screenshots** in `test-results/` directory

4. **View trace** for detailed timeline:
   ```bash
   npx playwright show-trace test-results/.../*.zip
   ```

## Mobile Testing

Tests include mobile viewport testing:
- Automatic compact mode on small screens
- Touch interaction support
- Responsive layout verification

To test mobile specifically:
```bash
npx playwright test --project=mobile-chrome
```

## Performance Considerations

- Tests use `waitForSelector` to ensure elements are ready
- Screenshots only taken on failure to reduce overhead
- Parallel execution enabled for faster test runs
- Cached browser instances for repeated runs

## Troubleshooting

### Port Already in Use
If port 3000 is occupied:
```bash
# Change port in playwright.config.js
command: 'python3 -m http.server 3001',
url: 'http://localhost:3001',
```

### Browser Not Installed
```bash
npx playwright install chromium
```

### Tests Timeout
Increase timeout in playwright.config.js:
```javascript
timeout: 60000, // 60 seconds
```

## Contributing

When adding tests:
1. Follow existing test structure and naming
2. Add tests for both success and failure paths
3. Keep tests isolated and independent
4. Update this README if adding new test categories
5. Ensure tests pass locally before committing

## Questions?

See the [Playwright documentation](https://playwright.dev/) for more information on writing and running tests.
