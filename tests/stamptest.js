var App = require('app').extend(function(proto){

	proto.tools = {
		Button:require('stamps/buttonstamp').extend({
			margin:2,
			Text:{
				fontSize:15
			},
			states:{
				default:{
					tween:0.3,
					Bg:{color:'gray'}
				},
				hover:{
					tween:0.3,
					Bg:{color:'blue',borderColor:'yellow',borderRadius:40,borderWidth:[5,0,5,0],padding:40},
					Text:{fontSize:35}
				}
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
			if(i && !(i%40)) this.turtle.lineBreak()
		}
		/*
		this.drawBg({
			x:0,
			y:0,
			w:529,
			h:590,
		})
		this.drawBg({
			x:0,
			y:0,
			w:265,
			h:295,
		})*/

		//require.perf()
	}
})()