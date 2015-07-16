var ReduceGame;
(function (ReduceGame) {
    function reduce(reduction, limitter, render, total) {
        render(total); // hook to the outside world
        limitter.next(function (next) {
            reduce(reduction, limitter, render, reduction(total, next));
        });
    }
    ReduceGame.reduce = reduce;
})(ReduceGame || (ReduceGame = {}));
/// <reference path="./reduce" />
var Conways;
(function (Conways) {
    ///////////// HELPERS
    /**
     *
     */
    var CellIdx = (function () {
        /**
         *
         */
        function CellIdx(x, y) {
            this.x = x;
            this.y = y;
        }
        /**
         *
         */
        CellIdx.FromHash = function (hash) {
            var coords = hash.split(",").map(function (e) { return parseInt(e); });
            return new CellIdx(coords[0], coords[1]);
        };
        Object.defineProperty(CellIdx.prototype, "hash", {
            get: function () {
                return this.x + "," + this.y;
            },
            enumerable: true,
            configurable: true
        });
        CellIdx.prototype.plusParams = function (x, y) {
            return new CellIdx(this.x + x, this.y + y);
        };
        CellIdx.prototype.equals = function (other) {
            return this.x == other.x && this.y == other.y;
        };
        return CellIdx;
    })();
    function combinations(a, b) {
        var ret = [];
        for (var _i = 0; _i < a.length; _i++) {
            var ea = a[_i];
            for (var _a = 0; _a < b.length; _a++) {
                var eb = b[_a];
                ret.push([ea, eb]);
            }
        }
        return ret;
    }
    function upTo(n) {
        var ret = [];
        var i = 0;
        while (i < n) {
            ret.push(i++);
        }
        return ret;
    }
    ///////////// LIMITTER
    (function (LimitterMoveType) {
        LimitterMoveType[LimitterMoveType["UPDATE_RULES"] = 0] = "UPDATE_RULES";
        LimitterMoveType[LimitterMoveType["ADVANCE_GENERATION"] = 1] = "ADVANCE_GENERATION";
        LimitterMoveType[LimitterMoveType["CLICK_DOWN"] = 2] = "CLICK_DOWN";
        LimitterMoveType[LimitterMoveType["CLICK_MOVE"] = 3] = "CLICK_MOVE";
        LimitterMoveType[LimitterMoveType["CLEAR_BOARD"] = 4] = "CLEAR_BOARD";
    })(Conways.LimitterMoveType || (Conways.LimitterMoveType = {}));
    var LimitterMoveType = Conways.LimitterMoveType;
    var LimitterMove = (function () {
        function LimitterMove(type, data) {
            if (data === void 0) { data = null; }
            this.type = type;
            this.data = data;
        }
        return LimitterMove;
    })();
    Conways.LimitterMove = LimitterMove;
    var Limitter = (function () {
        function Limitter(vars) {
            var _this = this;
            this.genTicker = -1;
            vars.setRules.addEventListener("click", function (e) {
                _this.nextHook(new LimitterMove(LimitterMoveType.UPDATE_RULES, vars.rules.value));
            });
            vars.nextGen.addEventListener("click", function (e) {
                _this.nextHook(new LimitterMove(LimitterMoveType.ADVANCE_GENERATION));
            });
            vars.autoGen.addEventListener("change", function (e) {
                if (e.target.checked && _this.genTicker < 0) {
                    _this.genTicker = setInterval(function () {
                        _this.nextHook(new LimitterMove(LimitterMoveType.ADVANCE_GENERATION));
                    }, 66);
                }
                else if (_this.genTicker >= 0) {
                    clearInterval(_this.genTicker);
                    _this.genTicker = -1;
                }
            });
            vars.clearBoard.addEventListener("click", function (e) {
                _this.nextHook(new LimitterMove(LimitterMoveType.CLEAR_BOARD));
            });
            var normalMousePosition = function (e, canvas) {
                var canvasBox = vars.canvas.getBoundingClientRect();
                var canvasX = e.pageX - canvasBox.left;
                var canvasY = e.pageY - canvasBox.top;
                return { x: canvasX / canvasBox.width, y: canvasY / canvasBox.height };
            };
            var mouseDrag = function (e) {
                _this.nextHook(new LimitterMove(LimitterMoveType.CLICK_MOVE, normalMousePosition(e, vars.canvas)));
            };
            vars.canvas.addEventListener("mousedown", function (e) {
                _this.nextHook(new LimitterMove(LimitterMoveType.CLICK_DOWN, normalMousePosition(e, vars.canvas)));
                vars.canvas.addEventListener("mousemove", mouseDrag);
            });
            window.addEventListener("mouseup", function (e) {
                vars.canvas.removeEventListener("mousemove", mouseDrag);
            });
        }
        Limitter.prototype.next = function (fn) {
            this.nextHook = fn;
        };
        return Limitter;
    })();
    Conways.Limitter = Limitter;
    ///////////// UPDATE FUNCTION	
    function advance(state, input) {
        switch (input.type) {
            case LimitterMoveType.UPDATE_RULES: return state.withNewRules(input.data);
            case LimitterMoveType.CLICK_DOWN: return state.beginPaintingCells(state.normalToCellIdx(input.data));
            case LimitterMoveType.CLICK_MOVE: return state.paintCell(state.normalToCellIdx(input.data));
            case LimitterMoveType.ADVANCE_GENERATION: return state.nextGeneration();
            case LimitterMoveType.CLEAR_BOARD: return state.emptyBoard();
        }
        return state; // if we didn't get an action we know we can't do anything to the state
    }
    Conways.advance = advance;
    var Life = (function () {
        function Life(width, height) {
            this.width = width;
            this.height = height;
            this.birth = [];
            this.live = [];
        }
        Life.Initial = function (width, height) {
            var life = new Life(width, height);
            life.grid = {};
            combinations(upTo(width), upTo(height)).map(function (e) {
                return new CellIdx(e[0], e[1]);
            }).forEach(function (e) {
                life.grid[e.hash] = false;
            });
            life.birth = [3];
            life.live = [2, 3];
            life.paintingLife = false;
            return life;
        };
        Life.ShareGridWith = function (other) {
            var life = new Life(other.width, other.height);
            life.grid = other.grid;
            return life;
        };
        Life.prototype.normalToCellIdx = function (normalPoint) {
            return new CellIdx(Math.floor(normalPoint.x * this.width), Math.floor(normalPoint.y * this.height));
        };
        Life.prototype.beginPaintingCells = function (idx) {
            var life = this.cellChange(idx, !this.grid[idx.hash]);
            life.paintingLife = !this.grid[idx.hash];
            return life;
        };
        Life.prototype.paintCell = function (idx) {
            return this.cellChange(idx, this.paintingLife);
        };
        Life.prototype.cellChange = function (idx, alive) {
            if (!this.grid.hasOwnProperty(idx.hash))
                return this;
            return this.mapGrid(function (e, i) {
                return idx.equals(i) ? alive : e;
            });
        };
        Life.prototype.generationKernel = function (alive, idx, grid) {
            var aliveNeighbours = combinations(upTo(3), upTo(3)).map(function (e) {
                if (e[0] == 1 && e[1] == 1)
                    return 0; // not a neighbour, this is the current cell!
                var cell = idx.plusParams(e[0] - 1, e[1] - 1);
                return (grid.hasOwnProperty(cell.hash) && grid[cell.hash]) ? 1 : 0;
            }).reduce(function (a, b) { return a + b; }, 0);
            return (alive && this.live.indexOf(aliveNeighbours) >= 0) || (!alive && this.birth.indexOf(aliveNeighbours) >= 0);
        };
        Life.prototype.nextGeneration = function () {
            return this.mapGrid(this.generationKernel.bind(this));
        };
        Life.prototype.mapGrid = function (mapFn) {
            var life = new Life(this.width, this.height);
            life.live = this.live;
            life.birth = this.birth;
            life.paintingLife = this.paintingLife;
            life.grid = {};
            for (var coord in this.grid) {
                life.grid[coord] = mapFn(this.grid[coord], CellIdx.FromHash(coord), this.grid);
            }
            return life;
        };
        Life.prototype.withNewRules = function (rules) {
            var legalRules = /^0?1?2?3?4?5?6?7?8?\/0?1?2?3?4?5?6?7?8?$/;
            var match = rules.match(legalRules);
            var life = Life.ShareGridWith(this);
            life.paintingLife = this.paintingLife;
            if (match) {
                _a = match[0].split("/").map(function (e) {
                    return e.split("").map(function (e) { return parseInt(e); });
                }), life.live = _a[0], life.birth = _a[1];
            }
            return life;
            var _a;
        };
        Life.prototype.emptyBoard = function () {
            var life = Life.Initial(this.width, this.height);
            life.live = this.live;
            life.birth = this.birth;
            return life;
        };
        return Life;
    })();
    Conways.Life = Life;
    ///////////// RENDERER	
    var Renderer = (function () {
        function Renderer(ctx) {
            this.ctx = ctx;
        }
        Renderer.prototype.render = function (state) {
            var canvasWidth = this.ctx.canvas.width;
            var canvasHeight = this.ctx.canvas.height;
            var cellWidth = canvasWidth / state.width;
            var cellHeight = canvasHeight / state.height;
            this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            this.ctx.fillStyle = "white";
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            this.ctx.fillStyle = "black";
            for (var coord in state.grid) {
                if (state.grid[coord]) {
                    var cellIdx = CellIdx.FromHash(coord);
                    this.ctx.fillRect(cellIdx.x * cellWidth, cellIdx.y * cellHeight, cellWidth, cellHeight);
                }
            }
        };
        return Renderer;
    })();
    Conways.Renderer = Renderer;
})(Conways || (Conways = {}));
/// <reference path="./reduce" />
/// <reference path="./conways" />
window.onload = function () {
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var renderer = new Conways.Renderer(context);
    var AdvanceGeneration = document.getElementById("AdvanceGeneration");
    var AutomaticallyAdvanceGeneration = document.getElementById("AutomaticallyAdvanceGeneration");
    var ConwayRules = document.getElementById("ConwayRules");
    var UpdateRules = document.getElementById("UpdateRules");
    var ClearBoard = document.getElementById("ClearBoard");
    var limitter = new Conways.Limitter({
        nextGen: AdvanceGeneration,
        autoGen: AutomaticallyAdvanceGeneration,
        rules: ConwayRules,
        setRules: UpdateRules,
        clearBoard: ClearBoard,
        canvas: canvas
    });
    ReduceGame.reduce(Conways.advance, limitter, renderer.render.bind(renderer), Conways.Life.Initial(80, 80));
};
//# sourceMappingURL=main.js.map