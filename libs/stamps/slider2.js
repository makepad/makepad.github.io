module.exports = require('base/stamp').extend(function Slider(proto){

	proto.props = {
		vertical:false,
		dragOffset:0,
		handlePos:0,
		handleSize:20
	}

	proto.inPlace = 1

	proto.tools = {
		Slider: require('shaders/quad').extend({
			bgColor:'gray',
			handleColor:'white',
			handlePos:0,
			handleSize:20,
			borderRadius:4,
			dragOffset:0,
			vertical:0.,
			vertexStyle:function(){$
				var pos = vec2()
				if(this.isFingerDown(pos) > 0 && this.dragOffset > 0.){
					if(this.vertical<0.5){
						this.handlePos = clamp(((pos.x - this.x- this.dragOffset))/(this.w - this.handleSize),0.,1.)
					}
					else{
						this.handlePos = clamp(((pos.y - this.y - this.dragOffset))/(this.h - this.handleSize),0.,1.)
					}
				}
			},
			pixelStyle:function(){$
			},
			pixel:function(){$
				this.pixelStyle()
				var p = this.mesh.xy * vec2(this.w, this.h)
				var aa = this.antialias(p)
				
				// background field
				var fBg = this.boxDistance(p, 0., 0., this.w, this.h, this.borderRadius)

				var fHan = 0.						
				if(this.vertical < 0.5){
					fHan = this.boxDistance(p, (this.w-this.handleSize)*this.handlePos, 0., this.handleSize, this.h, this.borderRadius)
				}
				else{
					fHan = this.boxDistance(p, 0., (this.h-this.handleSize)*this.handlePos, this.w, this.handleSize, this.borderRadius)
				}
				
				// mix the fields
				var finalBg = mix(this.bgColor, vec4(this.bgColor.rgb, 0.), clamp(fBg*aa+1.,0.,1.))
				return mix(this.handleColor, finalBg, clamp(fHan * aa + 1., 0., 1.))
			}
		})
	}

	proto.onFingerDown = function(e){
		// check where we clicked
		if(this.vertical){
			var yp = (this.$h - this.handleSize) * this.handlePos
			if(e.y>yp && e.y < yp+this.handleSize){
				this.dragOffset = e.y - yp
			}
			else {
				// compute pos
				this.dragOffset = 0.5*this.handleSize
				this.handlePos = clamp(((e.y -  this.dragOffset))/(this.$h - this.handleSize),0,1)
				if(this.onSlide) this.onSlide(this.handlePos)
			}
		}
		else{
			var xp = (this.$w - this.handleSize) * this.handlePos
			if(e.x>xp && e.x < xp+this.handleSize){
				this.dragOffset = e.x - xp
			}
			else {
				// compute pos
				this.dragOffset = 0.5*this.handleSize
				this.handlePos = clamp(((e.x -  this.dragOffset))/(this.$w - this.handleSize),0,1)
				if(this.onSlide) this.onSlide(this.handlePos)
			}
		}
	}

	proto.onFingerMove = function(e){
		if(this.vertical){
			this.handlePos = clamp(((e.y -  this.dragOffset))/(this.$h - this.handleSize),0,1)
		}
		else{
			this.handlePos = clamp(((e.x -  this.dragOffset))/(this.$w - this.handleSize),0,1)
		}
		if(this.onSlide) this.onSlide(this.handlePos)
	}

	proto.onFingerUp = function(){
		this.dragOffset = -1
	}

	proto.onDraw = function(){
		this.drawSlider(this)
	}

	proto.verbs = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})