class Game2048 {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.size = 4;
        this.won = false;
        this.over = false;
        this.keepPlaying = false;
        
        this.tileContainer = document.getElementById('tile-container');
        this.scoreContainer = document.getElementById('score');
        this.bestContainer = document.getElementById('best-score');
        this.messageContainer = document.getElementById('game-message');
        
        this.setup();
        this.setupEventListeners();
    }
    
    setup() {
        this.grid = this.emptyGrid();
        this.updateScore(0);
        this.updateBestScore();
        this.addStartTiles();
        this.actuate();
    }
    
    setupEventListeners() {
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.restart();
        });
        
        // Keep playing button
        document.getElementById('keep-playing-button').addEventListener('click', () => {
            this.keepPlaying = true;
            this.clearMessage();
        });
        
        // Try again button
        document.getElementById('retry-button').addEventListener('click', () => {
            this.restart();
        });
        
        // Keyboard input
        document.addEventListener('keydown', (event) => {
            if (this.over && !this.keepPlaying) return;
            
            const modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
            const mapped = {
                38: 0, // Up
                39: 1, // Right
                40: 2, // Down
                37: 3  // Left
            };
            
            if (!modifiers && mapped[event.which] !== undefined) {
                event.preventDefault();
                this.move(mapped[event.which]);
            }
        });
        
        // Touch events for mobile
        let startX, startY;
        
        this.tileContainer.addEventListener('touchstart', (event) => {
            if (event.touches.length > 1) return;
            
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            event.preventDefault();
        });
        
        this.tileContainer.addEventListener('touchmove', (event) => {
            event.preventDefault();
        });
        
        this.tileContainer.addEventListener('touchend', (event) => {
            if (event.touches.length > 0) return;
            if (this.over && !this.keepPlaying) return;
            
            const dx = event.changedTouches[0].clientX - startX;
            const dy = event.changedTouches[0].clientY - startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) > 10) {
                if (absDx > absDy) {
                    this.move(dx > 0 ? 1 : 3); // Right : Left
                } else {
                    this.move(dy > 0 ? 2 : 0); // Down : Up
                }
            }
        });
    }
    
    restart() {
        this.over = false;
        this.won = false;
        this.keepPlaying = false;
        this.clearMessage();
        this.setup();
    }
    
    emptyGrid() {
        const grid = [];
        for (let x = 0; x < this.size; x++) {
            const row = grid[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(null);
            }
        }
        return grid;
    }
    
    addStartTiles() {
        for (let i = 0; i < 2; i++) {
            this.addRandomTile();
        }
    }
    
    addRandomTile() {
        if (this.cellsAvailable()) {
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = { x: 0, y: 0, value: value };
            const randomPosition = this.randomAvailableCell();
            
            tile.x = randomPosition.x;
            tile.y = randomPosition.y;
            
            this.grid[tile.x][tile.y] = tile;
        }
    }
    
    cellsAvailable() {
        return !!this.availableCells().length;
    }
    
    availableCells() {
        const cells = [];
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (!this.grid[x][y]) {
                    cells.push({ x: x, y: y });
                }
            }
        }
        
        return cells;
    }
    
    randomAvailableCell() {
        const cells = this.availableCells();
        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    }
    
    move(direction) {
        if (this.over && !this.keepPlaying) return;
        
        const cell = { x: 0, y: 1 };
        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);
        let moved = false;
        
        this.prepareTiles();
        
        traversals.x.forEach((x) => {
            traversals.y.forEach((y) => {
                cell.x = x;
                cell.y = y;
                
                const tile = this.grid[x][y];
                
                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = this.withinBounds(positions.next) ? this.grid[positions.next.x][positions.next.y] : null;
                    
                    if (next && next.value === tile.value && !next.mergedFrom) {
                        const merged = {
                            x: positions.next.x,
                            y: positions.next.y,
                            value: tile.value * 2,
                            mergedFrom: [tile, next]
                        };
                        
                        this.grid[x][y] = null;
                        this.grid[positions.next.x][positions.next.y] = merged;
                        
                        tile.x = positions.next.x;
                        tile.y = positions.next.y;
                        
                        this.score += merged.value;
                        
                        if (merged.value === 2048 && !this.won) {
                            this.won = true;
                        }
                    } else {
                        this.moveTile(tile, positions.farthest);
                    }
                    
                    if (!this.positionsEqual(cell, tile)) {
                        moved = true;
                    }
                }
            });
        });
        
        if (moved) {
            this.addRandomTile();
            
            if (!this.movesAvailable()) {
                this.over = true;
            }
            
            this.actuate();
        }
    }
    
    getVector(direction) {
        const map = {
            0: { x: -1, y: 0 }, // Up
            1: { x: 0, y: 1 },  // Right
            2: { x: 1, y: 0 },  // Down
            3: { x: 0, y: -1 }  // Left
        };
        
        return map[direction];
    }
    
    buildTraversals(vector) {
        const traversals = { x: [], y: [] };
        
        for (let pos = 0; pos < this.size; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }
        
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();
        
        return traversals;
    }
    
    findFarthestPosition(cell, vector) {
        let previous;
        
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.withinBounds(cell) && this.cellAvailable(cell));
        
        return {
            farthest: previous,
            next: cell
        };
    }
    
    movesAvailable() {
        return this.cellsAvailable() || this.tileMatchesAvailable();
    }
    
    tileMatchesAvailable() {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const tile = this.grid[x][y];
                
                if (tile) {
                    for (let direction = 0; direction < 4; direction++) {
                        const vector = this.getVector(direction);
                        const cell = { x: x + vector.x, y: y + vector.y };
                        const other = this.grid[cell.x] && this.grid[cell.x][cell.y];
                        
                        if (other && other.value === tile.value) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    positionsEqual(first, second) {
        return first.x === second.x && first.y === second.y;
    }
    
    withinBounds(position) {
        return position.x >= 0 && position.x < this.size &&
               position.y >= 0 && position.y < this.size;
    }
    
    cellAvailable(cell) {
        return !this.cellOccupied(cell);
    }
    
    cellOccupied(cell) {
        return !!this.grid[cell.x][cell.y];
    }
    
    moveTile(tile, cell) {
        this.grid[tile.x][tile.y] = null;
        this.grid[cell.x][cell.y] = tile;
        tile.previousPosition = { x: tile.x, y: tile.y };
        tile.x = cell.x;
        tile.y = cell.y;
    }
    
    prepareTiles() {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const tile = this.grid[x][y];
                if (tile) {
                    tile.mergedFrom = null;
                    tile.savePosition = { x: tile.x, y: tile.y };
                }
            }
        }
    }
    
    actuate() {
        this.clearContainer(this.tileContainer);
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const tile = this.grid[x][y];
                if (tile) {
                    this.addTile(tile);
                }
            }
        }
        
        this.updateScore(this.score);
        this.updateBestScore();
        
        if (this.over) {
            this.message(false); // Game over
        } else if (this.won && !this.keepPlaying) {
            this.message(true); // You win!
        }
    }
    
    clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }
    
    addTile(tile) {
        const wrapper = document.createElement('div');
        const inner = document.createElement('div');
        const position = this.normalizePosition({ x: tile.x, y: tile.y });
        const positionClass = 'tile-position-' + position.x + '-' + position.y;
        const classes = ['tile', 'tile-' + tile.value, positionClass];
        
        if (tile.value > 2048) classes.push('tile-super');
        
        this.applyClasses(wrapper, classes);
        
        inner.classList.add('tile-inner');
        inner.textContent = tile.value;
        
        if (tile.previousPosition) {
            const prevPos = this.normalizePosition(tile.previousPosition);
            window.requestAnimationFrame(() => {
                classes[2] = 'tile-position-' + prevPos.x + '-' + prevPos.y;
                this.applyClasses(wrapper, classes);
                
                window.requestAnimationFrame(() => {
                    classes[2] = positionClass;
                    this.applyClasses(wrapper, classes);
                });
            });
        } else if (tile.mergedFrom) {
            classes.push('tile-merged');
            this.applyClasses(wrapper, classes);
            
            tile.mergedFrom.forEach((merged) => {
                this.addTile(merged);
            });
        } else {
            classes.push('tile-new');
            this.applyClasses(wrapper, classes);
        }
        
        wrapper.appendChild(inner);
        this.tileContainer.appendChild(wrapper);
    }
    
    applyClasses(element, classes) {
        element.setAttribute('class', classes.join(' '));
    }
    
    normalizePosition(position) {
        return { x: position.x + 1, y: position.y + 1 };
    }
    
    positionClass(position) {
        position = this.normalizePosition(position);
        return 'tile-position-' + position.x + '-' + position.y;
    }
    
    updateScore(score) {
        this.clearContainer(this.scoreContainer);
        
        const difference = score - this.score;
        this.score = score;
        
        this.scoreContainer.textContent = this.score;
        
        if (difference > 0) {
            const addition = document.createElement('div');
            addition.classList.add('score-addition');
            addition.textContent = '+' + difference;
            
            this.scoreContainer.appendChild(addition);
        }
    }
    
    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
        
        this.bestContainer.textContent = this.bestScore;
    }
    
    message(won) {
        const type = won ? 'game-won' : 'game-over';
        const message = won ? 'You win!' : 'Game over!';
        
        this.messageContainer.classList.add(type);
        this.messageContainer.getElementsByTagName('p')[0].textContent = message;
        this.messageContainer.style.display = 'block';
    }
    
    clearMessage() {
        this.messageContainer.classList.remove('game-won');
        this.messageContainer.classList.remove('game-over');
        this.messageContainer.style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
