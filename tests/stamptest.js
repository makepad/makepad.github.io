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

	proto.onDraw = function(){
		//this.drawBg({w:100*Math.sin(this.time),h:100})
		for(var i = 0; i < 200; i++)
		this.drawButton({
			Bg:{
				color:[rnd(),rnd(),rnd(),1]
			},
			text:"Almost button "+i
		})
	}
})
App().runApp()