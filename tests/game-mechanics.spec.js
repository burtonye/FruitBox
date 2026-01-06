const { test, expect } = require('@playwright/test');

test.describe('Game Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    // Click Play button to enter game view
    await page.click('#home-play-btn');
    // Wait for game board to be visible
    await page.waitForSelector('.game-board:visible');
    // Wait a bit for the game to fully initialize
    await page.waitForTimeout(500);
  });

  test('should show selection box when dragging on the board', async ({ page }) => {
    const gameBoard = page.locator('.game-board');
    const selectionBox = page.locator('#selection-box');

    // Get the bounding box of the game board
    const boardBox = await gameBoard.boundingBox();

    // Start dragging from the top-left of the board
    await page.mouse.move(boardBox.x + 50, boardBox.y + 50);
    await page.mouse.down();

    // Drag to create a selection
    await page.mouse.move(boardBox.x + 150, boardBox.y + 150);

    // Selection box should now be visible
    await expect(selectionBox).toHaveCSS('display', 'block');

    // Release the mouse
    await page.mouse.up();

    // Selection box should be hidden after release
    await expect(selectionBox).toHaveCSS('display', 'none');
  });

  test('should highlight apples during selection', async ({ page }) => {
    const gameBoard = page.locator('.game-board');
    const boardBox = await gameBoard.boundingBox();

    // Start dragging
    await page.mouse.move(boardBox.x + 50, boardBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + 150, boardBox.y + 150);

    // Check if any apples have the 'selected' class
    const selectedApples = page.locator('.apple.selected');
    const count = await selectedApples.count();
    expect(count).toBeGreaterThan(0);

    // Release
    await page.mouse.up();

    // Selected class should be removed after release
    await page.waitForTimeout(100);
    const remainingSelected = await page.locator('.apple.selected').count();
    expect(remainingSelected).toBe(0);
  });

  test('should display current sum during selection', async ({ page }) => {
    const gameBoard = page.locator('.game-board');
    const currentSelection = page.locator('#current-selection');
    const boardBox = await gameBoard.boundingBox();

    // Start dragging
    await page.mouse.move(boardBox.x + 50, boardBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + 150, boardBox.y + 150);

    // Current selection should be visible and show a sum
    await expect(currentSelection).toHaveClass(/show/);
    const text = await currentSelection.textContent();
    expect(text).toContain('Sum:');

    await page.mouse.up();
  });

  test('should start a new game when clicking New Game button', async ({ page }) => {
    // Get initial score
    const scoreDisplay = page.locator('#score');
    const initialScore = await scoreDisplay.textContent();

    // Click New Game
    await page.getByRole('button', { name: 'New Game' }).click();

    // Score should be reset to 0
    await expect(scoreDisplay).toHaveText('0');

    // Board should be re-rendered
    const apples = page.locator('.apple');
    const appleCount = await apples.count();
    expect(appleCount).toBeGreaterThan(0);
  });

  test('should change target sum when input is changed', async ({ page }) => {
    const targetInput = page.locator('#target-input');
    const targetDisplay = page.locator('#target-display');

    // Change target to 15
    await targetInput.fill('15');
    await page.getByRole('button', { name: 'New Game' }).click();

    // Target display should update
    await expect(targetDisplay).toHaveText('15');
  });

  test('should validate target sum input (min 1, max 100)', async ({ page }) => {
    const targetInput = page.locator('#target-input');
    const targetDisplay = page.locator('#target-display');

    // Test minimum boundary
    await targetInput.fill('0');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(targetDisplay).toHaveText('1'); // Should be clamped to 1

    // Test maximum boundary
    await targetInput.fill('200');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(targetDisplay).toHaveText('100'); // Should be clamped to 100

    // Test valid value
    await targetInput.fill('20');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(targetDisplay).toHaveText('20');
  });

  test('should update apples left counter', async ({ page }) => {
    const applesLeftDisplay = page.locator('#apples-left');
    const initialCount = await applesLeftDisplay.textContent();
    const initial = parseInt(initialCount);

    expect(initial).toBeGreaterThan(0);
  });

  test('should reset timer when starting new game', async ({ page }) => {
    const timeDisplay = page.locator('#time-remaining');

    // Wait for timer to tick down
    await page.waitForTimeout(2000);
    const timeAfterWait = parseInt(await timeDisplay.textContent());

    // Start new game
    await page.getByRole('button', { name: 'New Game' }).click();

    // Timer should reset to 120
    await expect(timeDisplay).toHaveText('120');
  });

  test('should update instructions when target changes', async ({ page }) => {
    const targetInput = page.locator('#target-input');
    const instructions = page.locator('.instructions');

    await targetInput.fill('25');
    await page.getByRole('button', { name: 'New Game' }).click();

    await expect(instructions).toContainText('sum to exactly 25');
  });
});
