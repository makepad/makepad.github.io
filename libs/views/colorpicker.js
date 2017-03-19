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
			Center:require('shaders/quad').extend({}),
			Wheel :require('shaders/quad').extend({
				hue  :0,
				sat  :0,
				val  :0,
				//hue  :'#bfe78cff',
				pixel:function() {$
					this.viewport()
					var cx = this.w * .5
					var cy = this.h * .5
					var radius = this.w * .42
					var inner = this.w * .2
					this.circle(cx, cy, this.w * .5)
					this.circle(cx, cy, this.w * .34)
					this.subtract()
					var ang = atan(this.pos.x - cx, this.pos.y - cy) / PI * .5 + .5
					this.fill(this.hsv2rgb(vec4(ang, 1., 1, 1.)))
					// pos on the circle
					var hsv = this.rgb2hsv(this.color)
					
					var colAngle = (this.hue - .25) * 2. * PI
					var circlePuk = vec2(sin(colAngle) * radius + cx, cos(colAngle) * radius + cy)
					
					var normRect = vec2(this.pos.x - (cx - inner), this.pos.y - (cy - inner)) / (2. * inner)
					this.rect(cx - inner, cy - inner, inner * 2., inner * 2.)
					this.fill(this.hsv2rgb(vec4(this.hue, normRect.x, normRect.y, 1.)))
					
					var rectPuk = vec2(cx - inner + inner * 2. * this.sat, cy - inner + inner * 2. * this.val)
					this.circle(rectPuk.x, rectPuk.y, 8.)
					this.circle(rectPuk.x, rectPuk.y, 5.)
					this.subtract()
					this.fill('white')
					//
					this.circle(circlePuk.x, circlePuk.y, 8.)
					this.circle(circlePuk.x, circlePuk.y, 5.)
					this.subtract()
					this.fill('white')
					
					//this.circle(p.x, p.y, 8.)
					//this.circle(p.x, p.y, 5.)
					//this.subtract()
					//this.fill('white')					
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
		types.colorFromString('blue', 1, col, 0)
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
		this.drawBg({
			w    :100,
			h    :100,
			color:out
		})
		this.endBg(true)
	}
}