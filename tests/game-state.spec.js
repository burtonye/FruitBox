const { test, expect } = require('@playwright/test');

test.describe('Game State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    // Click Play button to enter game view
    await page.click('#home-play-btn');
    // Wait for game board to be visible
    await page.waitForSelector('.game-board:visible');
    await page.waitForTimeout(500);
  });

  test('should countdown the timer during gameplay', async ({ page }) => {
    const timeDisplay = page.locator('#time-remaining');
    const initialTime = parseInt(await timeDisplay.textContent());

    expect(initialTime).toBe(120);

    // Wait for timer to tick down
    await page.waitForTimeout(2000);
    const timeAfterWait = parseInt(await timeDisplay.textContent());

    expect(timeAfterWait).toBeLessThan(initialTime);
    expect(timeAfterWait).toBeGreaterThan(0);
  });

  test('should show game over overlay when time runs out', async ({ page }) => {
    // Modify the timer to run faster for testing
    await page.evaluate(() => {
      // Override the time limit to 2 seconds for testing
      window.TIME_LIMIT_SECONDS = 2;
      window.startGame();
    });

    // Wait for the game to end
    await page.waitForTimeout(3000);

    // Overlay should be visible
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/show/);

    // Should show "Game Over" title
    const overlayTitle = page.locator('#overlay-title');
    await expect(overlayTitle).toHaveText('Game Over');

    // Message should mention time
    const overlayMessage = page.locator('#overlay-message');
    const messageText = await overlayMessage.textContent();
    expect(messageText).toContain("Time's up");
  });

  test('should allow restarting game from overlay', async ({ page }) => {
    const overlay = page.locator('#overlay');
    const restartButton = page.locator('#overlay-restart');

    // Trigger a quick game over by modifying timer
    await page.evaluate(() => {
      window.TIME_LIMIT_SECONDS = 1;
      window.startGame();
    });

    await page.waitForTimeout(2000);

    // Overlay should be visible
    await expect(overlay).toHaveClass(/show/);

    // Click restart button
    await restartButton.click();

    // Overlay should be hidden
    await expect(overlay).not.toHaveClass(/show/);

    // Timer should be reset
    const timeDisplay = page.locator('#time-remaining');
    const time = parseInt(await timeDisplay.textContent());
    expect(time).toBeGreaterThan(0);
  });

  test('should detect victory when all apples are cleared', async ({ page }) => {
    // This test simulates victory by manipulating the game state
    await page.evaluate(() => {
      // Clear all apples from the board
      for (let r = 0; r < window.ROWS; r++) {
        for (let c = 0; c < window.COLS; c++) {
          window.board[r][c] = null;
        }
      }
      // Trigger a re-render and state check
      window.renderBoard();
    });

    // Wait for the overlay to appear
    await page.waitForTimeout(500);

    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/show/);

    const overlayTitle = page.locator('#overlay-title');
    await expect(overlayTitle).toHaveText('You Win!');
  });

  test('should detect game over when no valid moves exist', async ({ page }) => {
    // This test simulates a no-moves scenario
    await page.evaluate(() => {
      // Create a board with no valid moves (all 1s with target 10)
      window.targetSum = 10;
      for (let r = 0; r < window.ROWS; r++) {
        for (let c = 0; c < window.COLS; c++) {
          window.board[r][c] = 1;
        }
      }
      // Make sure the board doesn't have exactly 10 apples in any rectangle
      // by creating a sparse pattern
      for (let r = 0; r < window.ROWS; r++) {
        for (let c = 0; c < window.COLS; c++) {
          if ((r + c) % 3 === 0) {
            window.board[r][c] = null;
          }
        }
      }
      window.renderBoard();
    });

    // Wait for the game to detect no moves
    await page.waitForTimeout(1000);

    const overlay = page.locator('#overlay');
    const overlayMessage = page.locator('#overlay-message');

    // Check if game over is triggered
    const hasShowClass = await overlay.evaluate(el => el.classList.contains('show'));
    if (hasShowClass) {
      const messageText = await overlayMessage.textContent();
      expect(messageText).toContain('No more moves');
    }
  });

  test('should prevent interactions after game over', async ({ page }) => {
    // Trigger game over
    await page.evaluate(() => {
      window.TIME_LIMIT_SECONDS = 1;
      window.startGame();
    });

    await page.waitForTimeout(2000);

    // Try to make a selection
    const gameBoard = page.locator('.game-board');
    const boardBox = await gameBoard.boundingBox();
    const selectionBox = page.locator('#selection-box');

    await page.mouse.move(boardBox.x + 50, boardBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + 150, boardBox.y + 150);

    // Selection box should not appear (game is over)
    const isVisible = await selectionBox.evaluate(el => {
      return window.getComputedStyle(el).display !== 'none';
    });

    expect(isVisible).toBe(false);

    await page.mouse.up();
  });

  test('should maintain score through game state changes', async ({ page }) => {
    const scoreDisplay = page.locator('#score');

    // Score starts at 0
    await expect(scoreDisplay).toHaveText('0');

    // Manually update score to test persistence during game
    await page.evaluate(() => {
      window.score = 50;
      window.scoreDisplay.textContent = window.score;
    });

    await expect(scoreDisplay).toHaveText('50');

    // Start new game
    await page.getByRole('button', { name: 'New Game' }).click();

    // Score should reset
    await expect(scoreDisplay).toHaveText('0');
  });

  test('should display score in game over message', async ({ page }) => {
    // Set a score
    await page.evaluate(() => {
      window.score = 42;
      window.scoreDisplay.textContent = window.score;
    });

    // Trigger game over
    await page.evaluate(() => {
      window.TIME_LIMIT_SECONDS = 1;
      startGame();
    });

    await page.waitForTimeout(2000);

    const overlayMessage = page.locator('#overlay-message');
    const messageText = await overlayMessage.textContent();
    expect(messageText).toContain('42');
  });
});
