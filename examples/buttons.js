module.exports = require('base/drawapp').extend({
	tools: {
		Button:require('tools/button').extend({
			inPlace:0,
			styles:{
				$tween:4,
				$ease:[0.2,8,4,4],
				$duration:1.,
				default:{
					Bg:{color:'gray'},
					Text:{}
				},
				defaultOver$default:{},
				clicked:{
					Bg:{
						color:'blue',
						borderColor:'yellow',
						borderRadius:40,
						borderWidth:[5,0,5,0],
						padding:40
					},
					Text:{fontSize:35}
				},
				clickedOver$clicked:{}
			}
		})
	},
	onDraw:function(){
		for(let i = 0; i < 500; i++){
			this.drawButton({
				text:""+i
			})
			if(i && !(i%20)) this.turtle.lineBreak()
		}
	}
})