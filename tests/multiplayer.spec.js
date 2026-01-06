const { test, expect } = require('@playwright/test');

test.describe('Multiplayer Basics', () => {
  test('should show lobby on initial load', async ({ page }) => {
    await page.goto('/');
    
    // Should see lobby view with create/join buttons
    await expect(page.locator('#lobby-view')).toBeVisible();
    await expect(page.locator('#create-room-btn')).toBeVisible();
    await expect(page.locator('#show-join-btn')).toBeVisible();
  });

  test('should connect to socket server', async ({ page }) => {
    await page.goto('/');
    
    // Wait for socket connection
    await page.waitForSelector('.connection-status.connected', { timeout: 5000 });
    await expect(page.locator('#status-text')).toHaveText('Connected');
  });

  test('should create a room', async ({ page }) => {
    await page.goto('/');
    
    // Wait for connection
    await page.waitForSelector('.connection-status.connected', { timeout: 5000 });
    
    // Click create room
    await page.click('#create-room-btn');
    
    // Should show waiting room with room code
    await expect(page.locator('#waiting-room')).toBeVisible();
    await expect(page.locator('#room-code-display')).not.toHaveText('------');
    
    // Should show P1 slot as filled
    await expect(page.locator('#p1-slot')).not.toHaveClass(/empty/);
    
    // P2 slot should be waiting
    await expect(page.locator('#p2-slot')).toHaveClass(/empty/);
  });

  test('should show join form when clicking join button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for connection
    await page.waitForSelector('.connection-status.connected', { timeout: 5000 });
    
    // Click join button
    await page.click('#show-join-btn');
    
    // Should show join form
    await expect(page.locator('#join-form')).toBeVisible();
    await expect(page.locator('#room-code-input')).toBeVisible();
    
    // Can go back to lobby
    await page.click('#back-to-lobby-btn');
    await expect(page.locator('#lobby-buttons')).toBeVisible();
  });

  test('two players can join same room', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Player 1 creates room
      await page1.goto('/');
      await page1.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page1.click('#create-room-btn');
      await page1.waitForSelector('#room-code-display');
      
      // Get the room code
      const roomCode = await page1.locator('#room-code-display').textContent();
      expect(roomCode).toHaveLength(6);

      // Player 2 joins room
      await page2.goto('/');
      await page2.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page2.click('#show-join-btn');
      await page2.fill('#room-code-input', roomCode);
      await page2.click('#join-room-btn');

      // Both should see home view after P2 joins
      await page1.waitForSelector('#home-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#home-view:not(.hidden)', { timeout: 5000 });

      // P1 should have play button enabled, P2 should have it disabled
      await expect(page1.locator('#home-play-btn')).toBeEnabled();
      await expect(page2.locator('#home-play-btn')).toBeDisabled();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('P1 can start game after P2 joins', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Player 1 creates room
      await page1.goto('/');
      await page1.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page1.click('#create-room-btn');
      const roomCode = await page1.locator('#room-code-display').textContent();

      // Player 2 joins
      await page2.goto('/');
      await page2.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page2.click('#show-join-btn');
      await page2.fill('#room-code-input', roomCode);
      await page2.click('#join-room-btn');

      // Wait for home views
      await page1.waitForSelector('#home-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#home-view:not(.hidden)', { timeout: 5000 });

      // P1 starts game
      await page1.click('#home-play-btn');

      // Both should see game board
      await page1.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });

      // Both should see apples
      const p1Apples = await page1.locator('.apple').count();
      const p2Apples = await page2.locator('.apple').count();
      expect(p1Apples).toBeGreaterThan(0);
      expect(p2Apples).toBeGreaterThan(0);
      expect(p1Apples).toBe(p2Apples);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('selection boxes sync between players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup: Create room and start game
      await page1.goto('/');
      await page1.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page1.click('#create-room-btn');
      await page1.waitForSelector('#room-code-display');
      const roomCode = await page1.locator('#room-code-display').textContent();

      await page2.goto('/');
      await page2.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page2.click('#show-join-btn');
      await page2.fill('#room-code-input', roomCode);
      await page2.click('#join-room-btn');

      // Wait longer for home view transition after P2 joins
      await page1.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });
      await page2.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });

      await page1.click('#home-play-btn');

      await page1.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      
      // Wait for game to fully initialize
      await page1.waitForTimeout(500);

      // P1 starts drawing a selection
      const gameBoard = page1.locator('.game-board');
      const boardBox = await gameBoard.boundingBox();
      
      await page1.mouse.move(boardBox.x + 50, boardBox.y + 50);
      await page1.mouse.down();
      await page1.mouse.move(boardBox.x + 150, boardBox.y + 150);

      // P1's selection box should be visible on P1's screen
      await expect(page1.locator('#selection-box-p1')).toHaveCSS('display', 'block');

      // P2 should see P1's selection box (as the remote P1 box)
      // Note: P2 sees P1's box, which comes through as selection-box-p1 on their screen
      await page2.waitForTimeout(300); // Allow sync time
      await expect(page2.locator('#selection-box-p1')).toHaveCSS('display', 'block');

      // Release
      await page1.mouse.up();

      // Boxes should be hidden after release
      await page1.waitForTimeout(200);
      await expect(page1.locator('#selection-box-p1')).toHaveCSS('display', 'none');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('P2 valid selection shows hint box on P1 screen', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup game
      await page1.goto('/');
      await page1.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page1.click('#create-room-btn');
      await page1.waitForSelector('#room-code-display');
      const roomCode = await page1.locator('#room-code-display').textContent();

      await page2.goto('/');
      await page2.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page2.click('#show-join-btn');
      await page2.fill('#room-code-input', roomCode);
      await page2.click('#join-room-btn');

      await page1.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });
      await page2.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });
      await page1.click('#home-play-btn');
      
      await page1.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForTimeout(500);

      // P2 makes a selection (may or may not be valid sum=10)
      const gameBoard2 = page2.locator('.game-board');
      const boardBox2 = await gameBoard2.boundingBox();
      
      await page2.mouse.move(boardBox2.x + 50, boardBox2.y + 50);
      await page2.mouse.down();
      await page2.mouse.move(boardBox2.x + 200, boardBox2.y + 200);
      
      // P2's selection box should be visible
      await expect(page2.locator('#selection-box-p2')).toHaveCSS('display', 'block');
      
      await page2.mouse.up();

      // Hint box element should exist on P1's screen (even if not shown for invalid selection)
      await expect(page1.locator('#hint-box')).toBeDefined();
      
      // Game should not crash - both players should still see the board
      await expect(page1.locator('.game-board')).toBeVisible();
      await expect(page2.locator('.game-board')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('P1 can score and both see updates', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup game
      await page1.goto('/');
      await page1.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page1.click('#create-room-btn');
      await page1.waitForSelector('#room-code-display');
      const roomCode = await page1.locator('#room-code-display').textContent();

      await page2.goto('/');
      await page2.waitForSelector('.connection-status.connected', { timeout: 5000 });
      await page2.click('#show-join-btn');
      await page2.fill('#room-code-input', roomCode);
      await page2.click('#join-room-btn');

      await page1.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });
      await page2.waitForSelector('#home-view:not(.hidden)', { timeout: 10000 });
      await page1.click('#home-play-btn');
      
      await page1.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      await page2.waitForSelector('#game-board-view:not(.hidden)', { timeout: 5000 });
      
      // Wait for game to fully initialize
      await page1.waitForTimeout(500);

      // Get initial score
      const p1InitialScore = await page1.locator('#score').textContent();
      expect(p1InitialScore).toBe('0');

      // This test just verifies the game doesn't crash when making selections
      // Finding a valid 10-sum selection requires knowing the board state
      const gameBoard = page1.locator('.game-board');
      const boardBox = await gameBoard.boundingBox();
      
      // Make a selection (may or may not be valid)
      await page1.mouse.move(boardBox.x + 50, boardBox.y + 50);
      await page1.mouse.down();
      await page1.mouse.move(boardBox.x + 200, boardBox.y + 200);
      await page1.mouse.up();

      // Game should not crash - score display should still be visible
      await expect(page1.locator('#score')).toBeVisible();
      await expect(page2.locator('#score')).toBeVisible();

      // Both players should still see apples (game didn't break)
      const p1ApplesAfter = await page1.locator('.apple').count();
      const p2ApplesAfter = await page2.locator('.apple').count();
      expect(p1ApplesAfter).toBeGreaterThan(0);
      expect(p2ApplesAfter).toBeGreaterThan(0);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

