
return require('base/app').extend({

	tools:{
		Bg: require('shaders/rect').extend({
		}),
		Quad: require('shaders/quad').extend({
		}),
		Text: require('shaders/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		}),
		Button: require('stamps/button').extend({
		}),
		View:require('base/view').extend({
			tools:{
				Bg: require('shaders/rect'),
				View:require('base/view').extend({
					tools:{Bg:require('shaders/rect')},
					onDraw(){
						this.drawBg({
							color:this.color,
							w:'100%',
							h:'100%'
						})
					}
				})
			},
			onDraw(){
				this.beginBg({
					color:this.color,
					w:'100%',
					h:'100%'
				})
				this.drawBg({color:'red',w:5,h:25})
				this.drawView({id:0,w:50,h:50,margin:5,color:'blue'})
				this.endBg()
			}
		})
	},

	onDraw(){
		//this.drawBg({w:100,h:100,color:'orange'})
		this.drawButton({id:0,text:'hi'})
		this.drawView({id:0, color:'orange', w:'50%', down:1})
		this.beginBg({color:'purple', w:'50%', h:'100%'})
			this.drawView({id:1, color:'yellow', w:150, h:150, align:[1,0]})
			this.drawBg({color:'green',w:50,h:50})
		this.endBg({})
	}
})