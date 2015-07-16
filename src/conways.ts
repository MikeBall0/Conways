/// <reference path="./reduce" />

module Conways {

	///////////// HELPERS
	/**
	 * 
	 */
	class CellIdx {
		/**
		 * Create a CellIdx from a hash string
		 */
		static FromHash(hash:string):CellIdx {
			let coords = hash.split(",").map(e => { return parseInt(e); });
			return new CellIdx(coords[0], coords[1]);
		}
		
		/**
		 * Create a CellIdx with a position
		 */
		constructor(public x:number, public y:number) {
			
		}
		
		/**
		 * Get the hash string from this idx
		 */
		get hash():string {
			return this.x + "," + this.y;
		}
		
		/**
		 * Add an x and y to this idx's position
		 */
		plusParams(x:number, y:number):CellIdx {
			return new CellIdx(this.x + x, this.y + y);
		}
		
		/**
		 * Check if this idx represents the same position as another
		 */
		equals(other:CellIdx):boolean {
			return this.x == other.x && this.y == other.y;
		}
	}
	
	/**
	 * Get a list of all possible combinations of two lists
	 * ex. combinations([1, 2], ['a', 'b']) => [[1, 'a'], [2, 'a'], [1, 'b'], [2, 'b']]
	 */
	function combinations<T, U>(a:T[], b:U[]):[T, U][] {
		let ret = [];
		for (let ea of a) {
			for (let eb of b) {
				ret.push([ea, eb]);
			}
		}
		return ret;
	}
	
	/**
	 * Get a list of the natural numbers up to, not including, n
	 */
	function upTo(n:number):number[] {
		let ret = [];
		let i = 0;
		while (i < n) {
			ret.push(i ++);
		}
		return ret;
	}


	///////////// LIMITTER
	export enum LimitterMoveType {
		UPDATE_RULES,
		ADVANCE_GENERATION,
		CLICK_DOWN,
		CLICK_MOVE,
		CLEAR_BOARD
	}
	
	/**
	 * Data class for the output of the limitter
	 */
	export class LimitterMove {
		constructor(public type:LimitterMoveType, public data:any = null) {
		
		}
	}
	
	/**
	 * Ui hooks for the limitter
	 */
	interface LimitterVars {
		nextGen:HTMLButtonElement,
		autoGen:HTMLInputElement,
		rules:HTMLInputElement,
		setRules:HTMLButtonElement,
		clearBoard:HTMLButtonElement,
		canvas:HTMLCanvasElement
	}
	
	export class Limitter {
		/** A reference to the current next function */
		nextHook:(val:LimitterMove) => void;
		/** The current interval id for the auto generation advancement */
		private genTicker:number = -1;
		
		/**
		 * Get a new limitter with all of the event listeners to the supplied UI components hooked up
		 */
		constructor(vars:LimitterVars) {
			vars.setRules.addEventListener("click", e => {
				this.nextHook(new LimitterMove(LimitterMoveType.UPDATE_RULES, vars.rules.value));
			});
			vars.nextGen.addEventListener("click", e => {
				this.nextHook(new LimitterMove(LimitterMoveType.ADVANCE_GENERATION));
			});
			vars.autoGen.addEventListener("change", e => {
				if ((<HTMLInputElement>e.target).checked && this.genTicker < 0) {
					this.genTicker = setInterval(() => {
						this.nextHook(new LimitterMove(LimitterMoveType.ADVANCE_GENERATION));
					}, 66);
				} else if (this.genTicker >= 0) {
					clearInterval(this.genTicker);
					this.genTicker = -1;
				}
			});
			vars.clearBoard.addEventListener("click", e => {
				this.nextHook(new LimitterMove(LimitterMoveType.CLEAR_BOARD));
			});
			
			let normalMousePosition = (e:MouseEvent, canvas:HTMLCanvasElement) => {
				let canvasBox = vars.canvas.getBoundingClientRect();
				let canvasX = e.pageX - canvasBox.left;
				let canvasY = e.pageY - canvasBox.top;
				return { x: canvasX / canvasBox.width, y: canvasY / canvasBox.height };
			};
			
			let mouseDrag = (e:MouseEvent) => {
				this.nextHook(new LimitterMove(LimitterMoveType.CLICK_MOVE, normalMousePosition(e, vars.canvas)));
			};
			
			vars.canvas.addEventListener("mousedown", e => {
				this.nextHook(new LimitterMove(LimitterMoveType.CLICK_DOWN, normalMousePosition(e, vars.canvas)));
				vars.canvas.addEventListener("mousemove", mouseDrag);
			});
			window.addEventListener("mouseup", e => {
				vars.canvas.removeEventListener("mousemove", mouseDrag);
			});
		}
		
		/**
		 * Get the next next function
		 */
		next(fn:(val:LimitterMove) => void) {
			this.nextHook = fn; 
		}
	}
	
	
	///////////// UPDATE FUNCTION
	/**
	 * Combine the current state and incoming input to get the next state
	 */
	export function advance(state:Life, input:LimitterMove):Life {
		switch(input.type) {
			case LimitterMoveType.UPDATE_RULES: return state.withNewRules(input.data);
			case LimitterMoveType.CLICK_DOWN: return state.beginPaintingCells(state.normalToCellIdx(input.data));
			case LimitterMoveType.CLICK_MOVE: return state.paintCell(state.normalToCellIdx(input.data));
			case LimitterMoveType.ADVANCE_GENERATION: return state.nextGeneration();
			case LimitterMoveType.CLEAR_BOARD: return state.emptyBoard();
		}
		return state; // if we didn't get an action we know we can't do anything to the state
	}
	
	
	///////////// REPRESENTATION
	interface LifeGrid {
		[coord:string]:boolean;
	}
	
	export class Life {
		/** The board grid */
		grid:LifeGrid;
		/** birth conditions, for example [1, 2, 3] means an empty cell should become alive if there are 1, 2 or 3 living neighbours */
		birth = [];
		/** survive conditions, for example [1, 2, 3] means a living cell should stay alive if there are 1, 2 or 3 living neighbours */
		live = [];
		/** while the player is painting with the mouse, are we painting cells on or off? */
		paintingLife:boolean;
		
		/** Get an initial, empty board of the specified size with the default rules */
		static Initial(width:number, height:number):Life {
			let life = new Life(width, height);
			life.grid = {};
			combinations(upTo(width), upTo(height)).map(e => {
				return new CellIdx(e[0], e[1]);
			}).forEach(e => {
				life.grid[e.hash] = false;
			});
			life.birth = [3];
			life.live = [2, 3];
			life.paintingLife = false;
			return life;
		}
		
		/** Get a new Life that has a reference to the same board as another life */
		static ShareGridWith(other:Life):Life {
			let life = new Life(other.width, other.height);
			life.grid = other.grid;
			return life;
		}
		
		/** width is the width of the board, height is the height */
		constructor(public width:number, public height:number) {
			
		}
		
		/**
		 * Transform a normalized point on the board to the cell index at that point
		 */
		normalToCellIdx(normalPoint:{x:number, y:number}):CellIdx {
			return new CellIdx(Math.floor(normalPoint.x * this.width), Math.floor(normalPoint.y * this.height));
		}
		
		/**
		 * Set the painting state and paint the selected cell
		 */
		beginPaintingCells(idx:CellIdx):Life {
			let life = this.cellChange(idx, !this.grid[idx.hash]);
			life.paintingLife = !this.grid[idx.hash];
			return life;
		}
		
		/**
		 * paint the selected cell with the current painting state
		 */
		paintCell(idx:CellIdx):Life {
			return this.cellChange(idx, this.paintingLife);
		}
		
		/**
		 * Return a Life game that's identical to this one, except with the given cell set to the specified state
		 */
		cellChange(idx:CellIdx, alive:boolean):Life {
			if (!this.grid.hasOwnProperty(idx.hash)) return this;
			return this.mapGrid((e, i) => {
				return idx.equals(i) ? alive : e;
			});
		}
		
		/**
		 * The kernel function that sets the living state of a single cell according to the generation rules
		 */
		generationKernel(alive:boolean, idx:CellIdx, grid:LifeGrid):boolean {
			let aliveNeighbours = combinations(upTo(3), upTo(3)).map(e => {
				if (e[0] == 1 && e[1] == 1) return 0; // not a neighbour, this is the current cell!
				let cell = idx.plusParams(e[0] - 1, e[1] - 1);
				return (grid.hasOwnProperty(cell.hash) && grid[cell.hash]) ? 1 : 0;
			}).reduce((a, b) => { return a + b }, 0);
			return (alive && this.live.indexOf(aliveNeighbours) >= 0) || (!alive && this.birth.indexOf(aliveNeighbours) >= 0);
		}
		
		/**
		 * Apply the generation kernel to each cell and return the resulting life
		 */
		nextGeneration():Life {
			return this.mapGrid(this.generationKernel.bind(this));
		}
		
		/**
		 * Map a given function to each cell on this grid and return the resulting life
		 */
		mapGrid(mapFn:(element?:boolean, index?:CellIdx, grid?:LifeGrid) => boolean):Life {
			let life = new Life(this.width, this.height);
			life.live = this.live;
			life.birth = this.birth;
			life.paintingLife = this.paintingLife;
			life.grid = {};
			for (let coord in this.grid) {
				life.grid[coord] = mapFn(this.grid[coord], CellIdx.FromHash(coord), this.grid);
			}
			return life;
		}
		
		/**
		 * Return a new life game identical to this one, but with the rules modified
		 */
		withNewRules(rules:string):Life {
			let legalRules = /^0?1?2?3?4?5?6?7?8?\/0?1?2?3?4?5?6?7?8?$/; // this regex recognizes rules in the form of 23/3 or 1357/1357
			let match = rules.match(legalRules);
			let life = Life.ShareGridWith(this);
			life.paintingLife = this.paintingLife;			
			if (match) {
				[life.live, life.birth] = match[0].split("/").map(e => {
					return e.split("").map(e => { return parseInt(e); });
				});
			}
			return life;
		}
		
		/**
		 * Return a new initial board, but with the rules set the same as this one
		 */
		emptyBoard():Life {
			let life = Life.Initial(this.width, this.height);
			life.live = this.live;
			life.birth = this.birth;
			return life;
		}
	}
	
	
	///////////// RENDERER	
	export class Renderer {
		/**
		 * ctx - The canvas rendering context to use
		 */
		constructor(private ctx:CanvasRenderingContext2D) {
			
		}
		
		/**
		 * draw the given state onto the supplied rendering context
		 */
		render(state:Life) {
			let canvasWidth = this.ctx.canvas.width;
			let canvasHeight = this.ctx.canvas.height;
			let cellWidth = canvasWidth / state.width;
			let cellHeight = canvasHeight / state.height;
			this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
			this.ctx.fillStyle = "white";
			this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			this.ctx.fillStyle = "black";
			for (let coord in state.grid) {
				if (state.grid[coord]) {
					let cellIdx = CellIdx.FromHash(coord);
					this.ctx.fillRect(cellIdx.x * cellWidth, cellIdx.y * cellHeight, cellWidth, cellHeight);
				}
			}
		}
	}
}