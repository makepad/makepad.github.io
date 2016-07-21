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
	proto.wrap = false
	proto.onDraw = function(){
		//this.drawBg({w:100*Math.sin(this.time),h:100})
		//var dt = performance.now()
		for(var i = 0; i < 1000; i++){
			this.drawButton({
				Bg:{
					//color:[Math.sin(i),Math.cos(i),i%10/10,1.],//[rnd(),rnd(),rnd(),1]
				},
				text:""+i
			})
			if(i && !(i%40)) this.turtle.newline()
		}
		//console.log(performance.now()-dt)
	}
})
App().runApp()