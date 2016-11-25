
return require('base/app').extend({

	tools:{
		Bg: require('shaders/quad').extend({
			// alright how do we define animation states
			pixel:function(){
				return this.color
			},
			states:{
				default:{ // define a looping animation for a shader
					from:{
						color:'red'
					},
					//50:{
					//	color:'blue'
					//},
					to:{
						time:{fn:'ease',dampen:0.5,begin:0,end:10},
						w:150,
						color:'green'
					},
					duration:1.,
					loop:'forwards',
					repeat:10,
				},
				hover:{ // some kind of fixed state tweening in 1 sec
					from:{
						//w:50,
						color:null
					},
					to:{
						time:{fn:'bounce',dampen:0.6,begin:0,end:10},
						w:250,
						color:'red'
					},
					duration:1.
				}
			}
		})
	},

	onFingerDown(){
		this.state = 'hover'
		this.redraw()
	},

	onDraw(){
		// w and h are broken.
		this.drawBg({
			state:this.state || 'default',
			color:'orange',
			w:'100%',
			h:'100%'
		})
	}
})