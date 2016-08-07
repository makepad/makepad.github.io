var App = require('app').extend(function(proto){

	var Code = require('views/codeview')

require('stamps/buttonstamp')

	proto.onCompose = function(){
		return [
			Code({
				text:"hello",
				Text:{
					fontSize:12,
					boldness:.2,
					font:require('fonts/ubuntu_monospace_256.sdffont'),
				},
				w:'100%',
				h:'100%'
			})
		]
	}
})()