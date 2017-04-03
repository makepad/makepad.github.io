var types = require('base/types')
module.exports = class Tree extends require('base/view'){
	
	// default style sheet
	
	prototype() {
		let colors = module.style.colors
		let fonts = module.style.fonts
		
		this.hue = 0
		this.sat = 1
		this.val = 1
		this.alpha = 1
		
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
				props :{
					color:{override:true, value:'red'}
				},
				Slider:{
					color:'red',
					pixel:function() {$
						this.viewport()
						this.box(-1., -1., this.w + 2, this.h + 2., 1.)
						var even = floor(this.pos.x * 0.25) + floor(this.pos.y * 0.25)
						this.fillKeep(mix('#f', '#7', mod(even, 2.) == 0.?1.:0.))
						var rad = this.w * 0.5
						this.fill(mix(this.color, vec4(this.color.rgb, 0.), (this.pos.y - rad) / (this.h - 2 * this.w)))
						if(this.vertical < 0.5) {
							this.box(this.slide, 0., this.knobSize, this.h, 1.)
							this.fill(this.knobColor)
						}
						else {
							this.circle(rad, this.slide + rad, rad - 1)
							this.circle(rad, this.slide + rad, rad - 3)
							this.subtract()
							this.fill('#7')
							this.circle(rad, this.slide + rad, rad)
							this.circle(rad, this.slide + rad, rad - 2)
							this.subtract()
							this.fillKeep('white')
						}
						return this.result
					}
				}
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
				hexagon  :function(x, y, r) {
					var dx = abs(x - this.pos.x) * 1.15
					var dy = abs(y - this.pos.y)
					this.field = max(dy + cos(60 * TORAD) * dx - r, dx - r)
					this._oldShape = this.shape
					this.shape = min(this.shape, this.field)
				},
				pixel    :function() {$
					
					var rgbv = this.hsv2rgb(vec4(this.hue, this.sat, this.val, 1.))
					
					this.viewport()
					var cx = this.w * .5
					var cy = this.h * .5
					var radius = this.w * .37
					var inner = this.w * .28
					
					this.hexagon(cx, cy, this.w * .5)
					this.hexagon(cx, cy, this.w * .32)
					this.subtract()
					
					var ang = atan(this.pos.x - cx, this.pos.y - cy) / PI * .5 + .5
					this.fill(this.hsv2rgb(vec4(ang, 1., 1, 1.)))
					
					var colAngle = (this.hue - .5) * 2. * PI
					var circlePuk = vec2(sin(colAngle) * radius + cx, cos(colAngle) * radius + cy)
					
					//this.circle(cx, cy, inner)
					var rsize = inner / sqrt(2.)
					this.rect(cx - rsize, cy - rsize, rsize * 2., rsize * 2.)
					//this.blend(1.)
					// compute circle colors
					var normRect = vec2(this.pos.x - (cx - inner), this.pos.y - (cy - inner)) / (2. * inner)
					var circ = clamp(this.circ2Rect(normRect.x * 2. - 1., normRect.y * 2. - 1.), vec2(-1.), vec2(1.))
					this.fill(this.hsv2rgb(vec4(this.hue, (circ.x * .5 + .5), 1. - (circ.y * .5 + .5), 1.)))
					
					// compute position of rect puk
					var rectPuk = vec2(cx + this.sat * 2. * rsize - rsize, cy + (1. - this.val) * 2. * rsize - rsize) //this.rect2Circ(this.sat * 2. - 1., 2. - this.val * 2. - 1.)
					//var rectPuk = vec2(cx + rect.x, cy + rect.y)
					
					this.circle(rectPuk.x, rectPuk.y, 10.)
					this.fill('white')
					this.circle(rectPuk.x, rectPuk.y, 9.)
					this.fill(rgbv)
					
					this.circle(circlePuk.x, circlePuk.y, 14.)
					this.fill('white')
					this.circle(circlePuk.x, circlePuk.y, 13.)
					this.fill(rgbv)
					
					return this.result
				}
			})
		}
	}
	
	constructor(...args) {
		super(...args)
		this.rgba = []
		this.rgbaConverted = []
	}
	
	hexagonSide(x, y, r) {
		var dx = abs(x) * 1.15
		var dy = abs(y)
		if(max(dy + cos(60 * TORAD) * dx - r, dx - r) < 0) return -1
		// alright check if we are either
		var t1 = dy + .5 * r - 1.5 * (dx - r) - r
		var t2 = dy - 1.5 * (dx) - r
		var t3 = dy + .5 * r - r
		if(t1 > 0 && t2 < 0) return -1
		if(t3 < 0) return -1
		if(t2 > 0) return y < 0?1:0.5
		return x > 0?y > 0?4 / 6:5 / 6:y > 0?2 / 6:1 / 6
	}
	
	doColorChange() {
		this.rgbaConverted = 
		this.rgba = this.Wheel.prototype.hsv2rgbJS([this.hue, this.sat, this.val, this.alpha])
		if(this.onColor) this.onColor(this)
	}
	
	onFingerMove(e) {
		// lets get the centered x/y mapping
		var t = this.toLocal(e)
		var cx = t.x - this.wheel.x - .5 * this.wheel.w
		var cy = t.y - this.wheel.y - .5 * this.wheel.h
		var rsize = (this.wheel.w * .28) / sqrt(2)
		if(this.dragMode === 'rect') {
			this.sat = clamp((cx + rsize) / (2 * rsize), 0, 1)
			this.val = 1 - clamp((cy + rsize) / (2 * rsize), 0, 1)
			this.doColorChange()
			this.redraw()
			return
		}
		if(this.dragMode === 'ring') {
			var side = this.hexagonSide(cx, cy, this.wheel.w * .5)
			if(side < 0) {
				this.hue = atan(cx, cy) / PI * .5 + .5
			}
			else {
				this.hue = side
			}
			this.doColorChange()
			this.redraw()
		}
	}
	
	onFingerDown(e) {
		var rsize = (this.wheel.w * .28) / sqrt(2)
		var t = this.toLocal(e)
		var cx = t.x - this.wheel.x - .5 * this.wheel.w
		var cy = t.y - this.wheel.y - .5 * this.wheel.h
		if(cx >= -rsize && cx <= rsize && cy >= -rsize && cy <= rsize) {
			this.dragMode = 'rect'
		}
		else if(cx >= -.5 * this.wheel.w && cx <= .5 * this.wheel.w && 
			cy >= -.5 * this.wheel.h && cy <= .5 * this.wheel.h) {
			this.dragMode = 'ring'
		}
		else this.dragMode = undefined
		this.onFingerMove(e)
		this.setFocus()
	}
	
	onDraw(debug) {
		//alright so how are we going to select things
		this.beginBg({moveScroll:0, x:'0', y:'0', w:'100%', h:'100%'})
		var col = []
		if(this.rgba !== this.rgbaConverted && (
			this.rgba[0] !== this.rgbaConverted[0] || this.rgba[1] !== this.rgbaConverted[1] || 
					this.rgba[2] !== this.rgbaConverted[2] || this.rgba[3] !== this.rgbaConverted[3]
				)) {
			var out = this.Wheel.prototype.rgb2hsvJS(this.rgba)
			this.hue = out[0]
			this.sat = out[1]
			this.val = out[2]
			this.alpha = out[3]
			this.rgbaConverted = this.rgba
		}
		
		var out = this.Wheel.prototype.hsv2rgbJS([this.hue, this.sat, this.val, 1])
		
		this.drawWheel({
			hue:this.hue,
			sat:this.sat,
			val:this.val,
			w  :200,
			h  :200
		})
		this.wheel = this.turtle.geom()
		this.drawSlider({
			color   :out,
			range   :[1, 0],
			value   :this.alpha,
			margin  :[0, 0, 0, 4],
			id      :'alpha',
			vertical:true,
			w       :20,
			h       :200,
			onSlide :v=>{
				this.alpha = v.value
				this.doColorChange()
				this.redraw()
			}
		})
		this.drawBg({
			margin:[0, 0, 0, 14],
			w     :100,
			h     :100,
			color :[out[0], out[1], out[2], this.alpha]
		})
		this.endBg(true)
	}
}