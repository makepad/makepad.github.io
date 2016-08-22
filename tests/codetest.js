var App = require('app').extend(function(proto){

	var Code = require('views/codeview')
	
	proto.onCompose = function(){
		return [
			Code({
				text:require.module(require('./codetestinput')).source,
				Text:{
					color:'white',
					font:require('fonts/ubuntu_monospace_256.font'),
				},
				w:'100%',
				h:'100%'
			})
		]
	}
})()