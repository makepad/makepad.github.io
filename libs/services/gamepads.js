var service = require('$gamepad1')

class Gamepad extends require('base/class'){
	prototype(){
	}
}

service.onMessage = function(msg){
	console.log('receiv',msg)
}