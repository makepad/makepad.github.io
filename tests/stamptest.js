var MyView = require('view').extend({
	surface: true,
	tools: {
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
				click:{
					tween:4,
					ease:[0.2,8,4,4],
					duration:1.,
					Bg:{
						color:'blue',
						borderColor:'yellow',
						borderRadius:40,
						borderWidth:[5,0,5,0],
						padding:40
					},
					Text:{fontSize:35}
				}
			}
		}),
		Bg:require('shaders/rectshader')
	},
	onDraw:function(){
		for(var i = 0; i < 500; i++){
			this.drawButton({
				text:""+i
			})
			if(i && !(i%20)) this.turtle.lineBreak()
		}
	}
})

module.exports = require('app').extend({

	onCompose:function(){
		return [
			MyView({w:'100%',h:'100%'})
		]
	}
})