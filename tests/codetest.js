var App = require('app').extend(function(proto){

	var Edit = require('views/editview')

	var extext = ''
	for(var i= 0 ;i <25;i++)
		extext += i+": This editbox has working scroll-to, scrollbars, cursor jumping, undo redo, mobile keyboard input\n"

	proto.onCompose = function(){
		return [
			Edit({
				text:extext,
				Text:{
					fontSize:24,
					font:require('fonts/ubuntu_medium_256.sdffont'),
				},
				w:'100%',
				h:'100%'
			})
		]
	}
})()