export function strFill(str:string, len:Number) :string {
	for (let index = str.length-1; index < len; index++) {
		str += " "
	}
	return str
}