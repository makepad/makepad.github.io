var App = require('app').extend(function(proto){

	var Edit = require('views/editview')

	proto.onCompose = function(){
		return [
			Edit({
				w:'100%',
				h:'100%'
			})//,
			//Edit({
			//})
		]
	}
})()