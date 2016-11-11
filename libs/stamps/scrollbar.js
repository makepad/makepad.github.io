module.exports = require('base/stamp').extend({
	defaultStyle(style){
		style.to = {
			styles:{
				base:{
					default:{
						ScrollBar:{
							//tween:1,
							//duration:0.3,
							bgColor:'#0000',
							handleColor:'#888'
						}
					},
					hover:{
						ScrollBar:{
							//tween:1,
							//duration:0.1,
							bgColor:'#0000',
							//bgColor:'#555f',
							handleColor:style.colors.accentNormal
						}
					}
				}
			}
		}
	},
	props: {
		vertical:0.,
		moveScroll:0.,
		borderRadius:4
	},
	cursor:'default',
	tools: {
		ScrollBar: require('shaders/quad').extend({
			props:{
				x:{noTween:1, noInPlace:1, value:NaN},
				y:{noTween:1, noInPlace:1, value:NaN},
				vertical:{noTween:1, value:0.},
				bgColor:'#000',
				handleColor:'#111',
				borderRadius:4,
				scrollMinSize:{noTween:1, value:30},
				pickAlpha:-1,
			},
			vertexStyle:function(){$ // bypass the worker roundtrip :)
				var pos = vec2()
				if(this.vertical < .5){
					this.y += .5///this.pixelRatio
					var rx = this.viewSpace.x / this.viewSpace.z
					var vx = max(this.scrollMinSize/this.viewSpace.x, rx)
					this.handleSize = vx
					this.handlePos =  (1.-vx) * (this.viewScroll.x / this.viewSpace.z) / (1.-rx)
				}
				else{
					this.x += .5///this.pixelRatio
					var vy = this.viewSpace.y / this.viewSpace.w
					var ry =  max(this.scrollMinSize/this.viewSpace.y, vy)
					this.handleSize = vy
					this.handlePos = (1.-vy) * (this.viewScroll.y / this.viewSpace.w) / (1.-ry)
				}
			},
			pixelStyle:function(){},
			pixel:function(){$
				this.pixelStyle()
				this.viewport(this.mesh.xy * vec2(this.w, this.h))
				
				this.box(0., 0., this.w, this.h, this.borderRadius)
				this.fill(this.bgColor)

				if(this.vertical < 0.5){
					this.box(this.w*this.handlePos, 0., this.handleSize*this.w, this.h, this.borderRadius)
				}
				else{
					this.box(0., this.h*this.handlePos, this.w, this.handleSize*this.h, this.borderRadius)
				}
				this.fill(this.handleColor)
				return this.result
			}
		})
	},



	inPlace: true,

	onFingerDown(){
		this.state = this.states.hover
	},

	onFingerUp(){
		this.state = this.states.default
	},

	onDraw(){
		this.drawScrollBar(this)
	},

	verbs:{
		draw:function(overload){
			this.$STYLESTAMP(overload)
			$stamp.$redrawStamp()
			return $stamp
		}
	}
})