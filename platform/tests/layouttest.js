
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
				Bg: require('shaders/rect').extend({
				}),
				Test: require('shaders/rect').extend({
					// alright how do we define animation states
					states:{
						default:{ // define a looping animation
							0:{color:null},
							.5:{color:'red'},
							1:{
								color:'blue',
							},
							tween:['linear'],
							loop:0.5,
							bounce:true
						},
						hover:{ // some kind of fixed state tweening in 1 sec
							1:{color:'red'} // how do we deal 
						}
					}
				}),
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

				// you should be able to select a state on draw
				//this.drawTest({})

				this.drawView({id:0,w:50,h:50,margin:5,color:'blue'})
				this.endBg()
			}
		})
	},

	onDraw(){
		//this.drawBg({w:100,h:100,color:'orange'})
		this.drawButton({id:0,icon:'search'})
		this.drawView({id:0, color:'orange', w:'50%', down:1})
		this.beginBg({color:'purple', w:'95%', h:'100%'})
			this.drawView({id:1, color:'#fff', w:150, h:150, align:[1,0]})
			this.drawBg({color:'green',w:50,h:50})
		this.endBg({})
	}
})