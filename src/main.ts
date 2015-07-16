/// <reference path="./reduce" />
/// <reference path="./conways" />

window.onload = () => {
	let canvas = <HTMLCanvasElement>document.getElementById("canvas");
	let context = canvas.getContext("2d");
	let renderer = new Conways.Renderer(context);
	
	let AdvanceGeneration = <HTMLButtonElement>document.getElementById("AdvanceGeneration");
	let AutomaticallyAdvanceGeneration = <HTMLInputElement>document.getElementById("AutomaticallyAdvanceGeneration");
	let ConwayRules = <HTMLInputElement>document.getElementById("ConwayRules");
	let UpdateRules = <HTMLButtonElement>document.getElementById("UpdateRules");
	let ClearBoard = <HTMLButtonElement>document.getElementById("ClearBoard");
	
	let limitter = new Conways.Limitter({
		nextGen: AdvanceGeneration,
		autoGen: AutomaticallyAdvanceGeneration,
		rules: ConwayRules,
		setRules: UpdateRules,
		clearBoard: ClearBoard,
		canvas: canvas
	});
	
	ReduceGame.reduce(Conways.advance, limitter, renderer.render.bind(renderer), Conways.Life.Initial(80, 80));
}