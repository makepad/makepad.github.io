var types = require('base/types')
module.exports = class Tree extends require('base/view'){
	
	// default style sheet
	
	prototype() {
		let colors = module.style.colors
		let fonts = module.style.fonts
		
		this.tools = {
			Bg    :require('shaders/quad').extend({
				wrap   :false,
				padding:[0, 0, 0, 0],
				color  :colors.bgHi
			}),
			Text  :require('shaders/text').extend({
				font :fonts.regular,
				color:colors.textNormal
			}),
			Slider:require('stamps/slider').extend({
				tools:{Slider:{
					pixel:function() {$
						return 'red'
						this.viewport()
						this.box(0., 0., this.w, this.h, 1.)
						this.fill(mix('black', 'white', this.mesh.y))
						if(this.vertical < 0.5) {
							this.box(this.slide, 0., this.knobSize, this.h, 1.)
							this.fill(this.knobColor)
						}
						else {
							this.box(0., this.slide, this.w, this.knobSize, 1.)
							this.fill(this.knobColor)
						}
						return this.result
					}
				}}
			}),
			Center:require('shaders/quad').extend({}),
			Wheel :require('shaders/quad').extend({
				hue      :0,
				sat      :0,
				val      :0,
				//hue  :'#bfe78cff',
				circ2Rect:function(u, v) {
					var u2 = u * u
					var v2 = v * v
					return vec2(
						0.5 * sqrt(2. + 2. * sqrt(2.) * u + u2 - v2) - 
							0.5 * sqrt(2. - 2. * sqrt(2.) * u + u2 - v2),
						0.5 * sqrt(2. + 2. * v * sqrt(2.) - u2 + v2) - 
							0.5 * sqrt(2. - 2. * sqrt(2.) * v - u2 + v2)
					)
				},
				rect2Circ:function(u, v) {
					return vec2(
						(u * sqrt(1. - .5 * (v * v))),
						(v * sqrt(1. - .5 * (u * u)))
					)
				},
				pixel    :function() {$
					
					var rgbv = this.hsv2rgb(vec4(this.hue, this.sat, this.val, 1.))
					
					this.viewport()
					var cx = this.w * .5
					var cy = this.h * .5
					var radius = this.w * .42
					var inner = this.w * .33
					this.circle(cx, cy, this.w * .5)
					this.circle(cx, cy, this.w * .34)
					this.subtract()
					var ang = atan(this.pos.x - cx, this.pos.y - cy) / PI * .5 + .5
					this.fill(this.hsv2rgb(vec4(ang, 1., 1, 1.)))
					
					var colAngle = (this.hue - .5) * 2. * PI
					var circlePuk = vec2(sin(colAngle) * radius + cx, cos(colAngle) * radius + cy)
					
					this.circle(cx, cy, inner)
					var rsize = inner / sqrt(2.)
					this.rect(cx - rsize, cy - rsize, rsize * 2., rsize * 2.)
					this.blend(0.35)
					// compute circle colors
					var normRect = vec2(this.pos.x - (cx - inner), this.pos.y - (cy - inner)) / (2. * inner)
					var circ = clamp(this.circ2Rect(normRect.x * 2. - 1., normRect.y * 2. - 1.), vec2(-1.), vec2(1.))
					this.fill(this.hsv2rgb(vec4(this.hue, (circ.x * .5 + .5), 1. - (circ.y * .5 + .5), 1.)))
					
					// compute position of rect puk
					var rect = this.rect2Circ(this.sat * 2. - 1., 2. - this.val * 2. - 1.)
					var rectPuk = vec2(cx + inner * rect.x, cy + inner * rect.y)
					
					this.circle(rectPuk.x, rectPuk.y, 10.)
					this.fill('white')
					this.circle(rectPuk.x, rectPuk.y, 9.)
					this.fill(rgbv)
					
					this.circle(circlePuk.x, circlePuk.y, 14.)
					this.fill('white')
					this.circle(circlePuk.x, circlePuk.y, 12.)
					this.fill(rgbv)
					
					return this.result
				}
			}),
			Slider:require('stamps/slider').extend({
				
			})
		}
	}
	
	onFingerDown(e) {
		this.setFocus()
		_=this.wheelPos
	}
	
	onDraw(debug) {
		//alright so how are we going to select things
		this.beginBg({moveScroll:0, x:'0', y:'0', w:'100%', h:'100%'})
		var col = []
		types.colorFromString('#513a59ff', 1, col, 0)
		var hsv = this.Wheel.prototype.rgb2hsvJS(col)
		var out = this.Wheel.prototype.hsv2rgbJS(hsv)
		_=out
		//_=hsv
		this.drawWheel({
			hue:hsv[0],
			sat:hsv[1],
			val:hsv[2],
			w  :200,
			h  :200
		})
		this.wheelPos = this.turtle.geom()
		this.drawSlider({
			id      :'alpha',
			vertical:true,
			w       :20,
			h       :200
		})
		this.drawBg({
			w    :100,
			h    :100,
			color:out
		})
		this.endBg(true)
	}
}