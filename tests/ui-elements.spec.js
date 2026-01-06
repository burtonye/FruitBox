const { test, expect } = require('@playwright/test');

test.describe('Core UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should display the home screen initially', async ({ page }) => {
    const homeView = page.locator('#home-view');
    await expect(homeView).toBeVisible();

    const playButton = page.locator('#home-play-btn');
    await expect(playButton).toBeVisible();
  });

  test('should display the page title on home screen', async ({ page }) => {
    // The home screen has the game title
    const titleElements = page.locator('h1');
    await expect(titleElements.first()).toBeVisible();
  });

  test('should display all game info elements', async ({ page }) => {
    // Check for score display
    await expect(page.locator('#score')).toBeVisible();
    await expect(page.locator('#score')).toHaveText('0');

    // Check for target display
    await expect(page.locator('#target-display')).toBeVisible();
    await expect(page.locator('#target-display')).toHaveText('10');

    // Check for layout display
    await expect(page.locator('#layout-display')).toBeVisible();

    // Check for apples left display
    await expect(page.locator('#apples-left')).toBeVisible();

    // Check for time remaining display
    await expect(page.locator('#time-remaining')).toBeVisible();
  });

  test('should display control buttons', async ({ page }) => {
    // Check for target input
    const targetInput = page.locator('#target-input');
    await expect(targetInput).toBeVisible();
    await expect(targetInput).toHaveValue('10');

    // Check for New Game button
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();

    // Check for Music toggle
    await expect(page.locator('#bgm-toggle')).toBeVisible();

    // Check for Light Colors toggle
    await expect(page.locator('#light-toggle')).toBeVisible();

    // Check for Compact Board toggle
    await expect(page.locator('#compact-toggle')).toBeVisible();
  });

  test('should display the game board after clicking Play', async ({ page }) => {
    // Click Play to enter game view
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');

    const gameBoard = page.locator('.game-board');
    await expect(gameBoard).toBeVisible();

    // Check that apples are rendered
    const apples = page.locator('.apple');
    const appleCount = await apples.count();
    expect(appleCount).toBeGreaterThan(0);
  });

  test('should display instructions after clicking Play', async ({ page }) => {
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');

    const instructions = page.locator('.instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText('Drag to select apples');
  });

  test('should render apples with numbers after clicking Play', async ({ page }) => {
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');

    const firstApple = page.locator('.apple').first();
    await expect(firstApple).toBeVisible();

    // Check that the apple has a numeric value
    const text = await firstApple.textContent();
    expect(parseInt(text)).toBeGreaterThanOrEqual(1);
    expect(parseInt(text)).toBeLessThanOrEqual(9);
  });

  test('should display correct initial layout (10x17)', async ({ page }) => {
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');

    const layoutDisplay = page.locator('#layout-display');
    await expect(layoutDisplay).toHaveText('10×17');

    // Count the cells
    const cells = page.locator('.cell');
    const cellCount = await cells.count();
    expect(cellCount).toBe(170); // 10 rows × 17 cols
  });

  test('should have selection box hidden initially', async ({ page }) => {
    const selectionBox = page.locator('#selection-box');
    await expect(selectionBox).toHaveCSS('display', 'none');
  });

  test('should have overlay hidden initially', async ({ page }) => {
    const overlay = page.locator('#overlay');
    await expect(overlay).not.toHaveClass(/show/);
  });

  test('should display current selection feedback (hidden initially)', async ({ page }) => {
    const currentSelection = page.locator('#current-selection');
    await expect(currentSelection).toBeVisible();
    // It should not have the 'show' class initially
    await expect(currentSelection).not.toHaveClass(/show/);
  });
});
