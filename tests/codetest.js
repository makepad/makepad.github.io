var App = require('app').extend(function(proto){

	var Code = require('views/codeview')
	
	proto.onCompose = function(){
		return [
			Code({
				text:require('shader').body.toString(),
				Text:{
					fontSize:12,
					boldness:0.1,
					color:'white',
					font:require('fonts/ubuntu_monospace_256.sdffont'),
				},
				w:'100%',
				h:'100%'
			})
		]
	}
})()