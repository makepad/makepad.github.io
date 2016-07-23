var App = require('view').extend(function(proto){

	proto.tools = {
		Button:require('stamps/buttonstamp').extend({
			margin:2,
			Text:{
				fontSize:15
			}
		}),
		Bg:require('shaders/rectshader')
	}

	var rnd = Math.random
	proto.wrap = false
	proto.onDraw = function(){
		//require.perf()
		for(var i = 0; i < 1000; i++){
			this.drawButton({
				text:""+i
			})
			if(i && !(i%40)) this.turtle.newline()
		}
		//require.perf()
	}
})
App().runApp()