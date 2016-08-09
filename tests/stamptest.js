var App = require('app').extend(function(proto){

	proto.tools = {
		Vierkant:require('shaders/rectshader').extend({
		}),
		Text:require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_medium_256.sdffont')
		})
	}

	proto.onDraw = function(){
		for(var j = 0; j < 10;j++){
			this.beginVierkant({
				w:150,
				padding:10
				//h:150
			})
			for(var i= 0 ; i < 20;i++){
				this.beginVierkant({
					w:30,
					h:30,
					color:[random(),random(),random(),1]
				})
				this.drawText({

					text:''+i
				})
				this.endVierkant()
			}
			this.endVierkant()
		}
	}
})()

/*
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
	*.)
	proto.onDraw = function(){
		for(var i = 0; i < 500; i++){
			this.drawButton({
				text:""+i
			})
			if(i && !(i%20)) this.turtle.lineBreak()
		}
	}*/
