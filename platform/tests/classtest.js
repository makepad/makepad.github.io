

class Test extends require('base/class'){

	prototype(){
		console.log('whee', this)
	}

	constructor(){
		super()
		console.log('here', this)
	}
}

var x = new Test()
console.log(x)
