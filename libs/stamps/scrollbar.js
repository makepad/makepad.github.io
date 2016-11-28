module.exports = require('base/stamp').extend({
	baseStyle(style){
		style.to = {
			states:{
				default:{
					to:{
						ScrollBar:{
							bgColor:'#0000',
							handleColor:'#1'
						}
					}
				},
				down:{
					to:{
						ScrollBar:{
							bgColor:'#0000',
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
	},
	cursor:'default',
	tools: {
		ScrollBar: require('shaders/quad').extend({
			props:{
				x:NaN,
				y:NaN,
				vertical:0.,
				bgColor:'#0000',
				handleColor:'#1',
				borderRadius:2,
				scrollMinSize:30.,
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
					var ry = this.viewSpace.y / this.viewSpace.w
					this.scrollMinSize = 30.
					var vy =  max(this.scrollMinSize/this.viewSpace.y, ry)
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
 	
	onFingerDown(){
		this.setState('down')// this.states.hover
	},

	onFingerUp(){
		this.setState('default')
	},

	onDraw(){
		this.drawScrollBar(this)
	},
})