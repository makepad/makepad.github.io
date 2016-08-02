var App = require('app').extend(function(proto){

	proto.tools = {
		Button:require('stamps/buttonstamp').extend({
			inPlace:0,
			margin:2,
			Text:{
				fontSize:15
			},
			states:{
				default:{
					tween:4,
					ease:[0.2,8,4,4],
					duration:1.,
					Bg:{color:'gray'}
				},
				hover:{
					tween:4,
					ease:[0.2,8,4,4],
					duration:1.,
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
		for(var i = 0; i < 500; i++){
			this.drawButton({
				text:""+i
			})
			if(i && !(i%20)) this.turtle.lineBreak()
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