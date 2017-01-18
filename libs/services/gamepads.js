var service = require('$gamepad1')

class Gamepad extends require('base/class'){
	prototype(){
		this.mixin(require('base/events'))
	}
}

service.onMessage = function(msg){
	console.log('receiv',msg)
}