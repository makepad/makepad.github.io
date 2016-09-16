var App = require('base/app').extend(function(proto){

	var Edit = require('views/edit')
	var Code = require('views/code')

	proto.onCompose = function(){
		return [
			Edit({
				text:"",
				cursorTrim:0.1,
				Text:{
					fontSize:14,
					font:require('fonts/ubuntu_medium_256.font'),
				},
				w:'100%',
				h:'50%'
			}),
			Code({
				text:"var t = 10\nvar t=20",
				cursorTrim:0.1,
				Text:{
					fontSize:14,
					font:require('fonts/ubuntu_monospace_256.font'),
				},
				w:'100%',
				h:'50%'
			})
		]
	}
})()