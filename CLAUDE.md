# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fruit Box** is a standalone HTML5 browser game with no dependencies or build process. The entire application exists in a single `fruit_box.html` file containing all HTML, CSS, and JavaScript.

## Architecture

### Single-File Structure
- **fruit_box.html**: Complete self-contained game
  - HTML markup (game UI, overlays, screens)
  - CSS styling (embedded in `<style>` tag)
  - JavaScript game logic (embedded in `<script>` tag)

### Game Architecture
The game uses vanilla JavaScript with the following key components:

1. **Board Management**
   - 10x17 grid stored in 2D array `board[][]`
   - Values range from 1 to min(9, targetSum-1)
   - Null values represent removed apples

2. **Selection System**
   - Drag-based rectangular selection using mouse/touch events
   - Cached apple positions for performance (`appleElements[]`)
   - Real-time sum calculation during drag
   - Position caching updated on scroll/resize

3. **Game Loop**
   - Timer-based gameplay (120 seconds default)
   - Score tracking (1 point per apple in valid selection)
   - Victory condition: Selected apples sum to exactly `targetSum`
   - End conditions: Timer expires or no valid moves remain

4. **Move Validation**
   - `checkForMoves()`: Brute force checks all possible rectangular selections
   - Tests combinations of apple pairs to form rectangles
   - Computationally expensive but functional for 10x17 grid

## Running the Game

Open `fruit_box.html` directly in any modern web browser. No server, build step, or installation required.

## Key Technical Details

- **No dependencies**: Pure vanilla JavaScript, no frameworks or libraries
- **Offline-capable**: Fully functional without internet connection
- **Responsive**: Touch and mouse event handling for desktop and mobile
- **Performance optimization**: Apple positions cached and updated only on scroll/resize/drag start

## Common Modifications

When modifying the game:

- **Grid size**: Change `ROWS` and `COLS` constants (line 363-364)
- **Game duration**: Modify `GAME_DURATION` constant (line 365)
- **Apple value range**: Adjust logic in `generateBoard()` (line 454-467)
- **Target sum limits**: Update min/max in input element (line 347) and validation (line 441-444)
- **Styling**: All CSS in `<style>` block (line 7-313)

## Testing

Manual testing in browser only. No automated test suite exists.
