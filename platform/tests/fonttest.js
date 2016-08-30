var App = require('base/app').extend(function(proto){

	var Edit = require('views/edit')

	var extext = ''
	for(var i= 0 ;i <2;i++)
		extext += i+": This editbox has working scroll-to, scrollbars, cursor jumping, undo redo, mobile keyboard input\n"

	proto.onCompose = function(){
		return [
			Edit({
				text:extext,
				cursorTrim:0.1,
				Text:{
					fontSize:14,
					font:require('fonts/ubuntu_medium_256.font'),
				},
				w:'100%',
				h:'100%'
			})
		]
	}
})()