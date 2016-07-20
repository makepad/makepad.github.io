var App = require('view').extend(function(proto){

	proto.tools = {
		Button:require('stamps/buttonstamp').extend({
			margin:2,
			Bg:{
				borderWidth:1,
			},
			Text:{
				fontSize:15
			}
		}),
		Bg:require('shaders/rectshader')
	}
	var rnd = Math.random
	proto.ondraw = function(){
		//this.drawBg({w:100,h:100})
		for(var i = 0; i < 500; i++)
		this.drawButton({
			Bg:{
				color:[rnd(),rnd(),rnd(),1]
			},
			text:"Almost button "+i
		})
	}
})
App().runApp()