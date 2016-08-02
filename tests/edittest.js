var App = require('app').extend(function(proto){

	var Edit = require('views/editview')

	proto.onCompose = function(){
		return [
			Edit({
			})//,
			//Edit({
			//})
		]
	}
})()