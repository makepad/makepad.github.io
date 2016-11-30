
return require('base/app').extend({

	tools:{
		Bg: require('shaders/quad').extend({
			// alright how do we define animation states
			pixel:function(){$
				this.viewport(this.mesh.xy * vec2(this.w, this.h))
				this.circle(50., 50., 20.)
				this.circle(50. + 20, 80., 30.)
				this.gloop(30.)
				this.fillKeep('orange')
				this.stroke('blue', 4.)

				//this.rectangle(0.,0.,100.,100.)
				//this.fill('blue')
				
				//this.circle(70.,60.,30.)
				//this.fill('#f0fc')
				
				//this.box(50.,50.,25.,25.,1.)
				this.box(0.,0.,30.,30.,1.)
				this.fill('#f')
				// this.rotate(this.time,50,75)
				// this.moveTo(100.,100.)
				// this.lineTo(50.,50.)
				// this.lineTo(50.,150.)
				// this.closePath()
				//this.stroke('white',1.)
			//	this.blur=18.
			//	this.glow('#f00',15.)

				return this.result
				//return this.color
			}
			/*
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
			}*/
		})
	},

	onFingerDown(){
		//this.state = 'hover'
		this.redraw()
	},

	onDraw(){
		// w and h are broken.
		this.drawBg({
			//state:this.state || 'default',
			//color:'orange',
			w:'100%',
			h:'100%'
		})
	}
})