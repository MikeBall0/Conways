module ReduceGame {
	export interface NextFunction<T> {
		(fn:(val:T) => void):void;
	}
	
	export function reduce<T, U>(reduction:(state:T, input:U) => T, limitter:{ next:NextFunction<U> }, render:(state:T) => void, total:T):void {
		render(total); // hook to the outside world
		limitter.next(next => {
			reduce(reduction, limitter, render, reduction(total, next));
		});
	}
}