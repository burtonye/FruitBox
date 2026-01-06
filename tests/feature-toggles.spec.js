const { test, expect } = require('@playwright/test');

test.describe('Feature Toggles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    // Click Play button to enter game view
    await page.click('#home-play-btn');
    // Wait for game board to be visible
    await page.waitForSelector('.game-board:visible');
    await page.waitForTimeout(500);
  });

  test('should toggle light color mode', async ({ page }) => {
    const lightToggle = page.locator('#light-toggle');
    const body = page.locator('body');

    // Initially should not have light-colors class
    await expect(body).not.toHaveClass(/light-colors/);

    // Check the light toggle
    await lightToggle.check();

    // Body should now have light-colors class
    await expect(body).toHaveClass(/light-colors/);

    // Uncheck the toggle
    await lightToggle.uncheck();

    // Body should not have light-colors class
    await expect(body).not.toHaveClass(/light-colors/);
  });

  test('should apply light color styles when toggled', async ({ page }) => {
    const lightToggle = page.locator('#light-toggle');
    const body = page.locator('body');

    // Get initial background color
    const initialBg = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Toggle light mode
    await lightToggle.check();

    // Background should change
    const lightBg = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(lightBg).not.toBe(initialBg);
  });

  test('should toggle compact board layout', async ({ page }) => {
    const compactToggle = page.locator('#compact-toggle');
    const layoutDisplay = page.locator('#layout-display');

    // Initial layout should be 10×17 (unless on mobile)
    const initialLayout = await layoutDisplay.textContent();

    // Toggle compact mode
    await compactToggle.check();

    // Layout should change to 8×12
    await expect(layoutDisplay).toHaveText('8×12');

    // Count cells to verify
    const cells = page.locator('.cell');
    const cellCount = await cells.count();
    expect(cellCount).toBe(96); // 8 × 12

    // Toggle back
    await compactToggle.uncheck();

    // Should return to default layout
    await expect(layoutDisplay).toHaveText('10×17');

    // Count cells again
    const cellsAfter = page.locator('.cell');
    const cellCountAfter = await cellsAfter.count();
    expect(cellCountAfter).toBe(170); // 10 × 17
  });

  test('should restart game when switching compact mode', async ({ page }) => {
    const compactToggle = page.locator('#compact-toggle');
    const scoreDisplay = page.locator('#score');

    // Set a score to verify it resets
    await page.evaluate(() => {
      score = 25;
      document.getElementById('score').textContent = score;
    });

    await expect(scoreDisplay).toHaveText('25');

    // Toggle compact mode
    await compactToggle.check();

    // Wait for game to restart (stays in game view, no need to click Play)
    await page.waitForTimeout(500);

    // Score should be reset (new game started)
    await expect(scoreDisplay).toHaveText('0');
  });

  test('should toggle background music', async ({ page }) => {
    const bgmToggle = page.locator('#bgm-toggle');

    // Initial state should be "Music: On"
    await expect(bgmToggle).toHaveText('Music: On');

    // Click to toggle off
    await bgmToggle.click();
    await expect(bgmToggle).toHaveText('Music: Off');

    // Verify audio is paused
    const isPaused = await page.evaluate(() => {
      const audio = document.getElementById('bgm');
      return audio.paused;
    });
    expect(isPaused).toBe(true);

    // Click to toggle back on
    await bgmToggle.click();
    await expect(bgmToggle).toHaveText('Music: On');
  });

  test('should maintain feature toggle states during gameplay', async ({ page }) => {
    const lightToggle = page.locator('#light-toggle');
    const body = page.locator('body');

    // Enable light mode
    await lightToggle.check();
    await expect(body).toHaveClass(/light-colors/);

    // Make a selection (simulate some gameplay)
    const gameBoard = page.locator('.game-board');
    const boardBox = await gameBoard.boundingBox();

    await page.mouse.move(boardBox.x + 50, boardBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
    await page.mouse.up();

    // Light mode should still be active
    await expect(body).toHaveClass(/light-colors/);
  });

  test('should handle multiple toggles simultaneously', async ({ page }) => {
    const lightToggle = page.locator('#light-toggle');
    const compactToggle = page.locator('#compact-toggle');
    const body = page.locator('body');
    const layoutDisplay = page.locator('#layout-display');

    // Enable both toggles
    await lightToggle.check();
    await compactToggle.check();

    // Both should be active
    await expect(body).toHaveClass(/light-colors/);
    await expect(layoutDisplay).toHaveText('8×12');

    // Disable light mode but keep compact
    await lightToggle.uncheck();

    await expect(body).not.toHaveClass(/light-colors/);
    await expect(layoutDisplay).toHaveText('8×12');
  });

  test('should respect auto-compact mode on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload the page with mobile viewport
    await page.reload();

    // Click Play to enter game view
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');
    await page.waitForTimeout(500);

    const compactToggle = page.locator('#compact-toggle');
    const isChecked = await compactToggle.isChecked();

    // On mobile, compact should be auto-enabled
    expect(isChecked).toBe(true);

    const layoutDisplay = page.locator('#layout-display');
    await expect(layoutDisplay).toHaveText('8×12');
  });

  test('should use default layout on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Reload the page
    await page.reload();

    // Click Play to enter game view
    await page.click('#home-play-btn');
    await page.waitForSelector('.game-board:visible');
    await page.waitForTimeout(500);

    const layoutDisplay = page.locator('#layout-display');
    await expect(layoutDisplay).toHaveText('10×17');
  });
});
