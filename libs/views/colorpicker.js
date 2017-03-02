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
			Wheel :require('shaders/shadowquad').extend({
				hsv2rgb:function(c) { //inspiration http://gamedev.stackexchange.com/questions/59797/glsl-shader-change-hue-saturation-brightness
					var K = vec4(1., 2. / 3., 1. / 3., 3.)
					var p = abs(fract(c.xxx + K.xyz) * 6. - K.www)
					return vec4(c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y), c.w)
				},
				rgb2hsv:function(c) {
					var K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0)
					var p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g))
					var q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r))
					
					var d = q.x - min(q.w, q.y)
					var e = 1.0e-10
					return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x, c.w)
				},
				color  :'#bfe08cff',
				pixel  :function() {$
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
					
					var colAngle = (hsv.r - .5) * 2. * PI
					var circlePuk = vec2(sin(colAngle) * radius + cx, cos(colAngle) * radius + cy)
					
					var normRect = vec2(this.pos.x - (cx - inner), this.pos.y - (cy - inner)) / (2. * inner)
					this.rect(cx - inner, cy - inner, inner * 2., inner * 2.)
					this.fill(this.hsv2rgb(vec4(hsv.r, normRect.x, normRect.y, 1.)))
					
					this.circle(circlePuk.x, circlePuk.y, 8.)
					this.circle(circlePuk.x, circlePuk.y, 5.)
					this.subtract()
					this.fill('white')
					
					var rectPuk = vec2(cx - inner + inner * 2. * hsv.g, cy - inner + inner * 2. * hsv.b)
					this.circle(rectPuk.x, rectPuk.y, 8.)
					this.circle(rectPuk.x, rectPuk.y, 5.)
					this.subtract()
					this.fill('white')
					
					
					//this.circle(p.x, p.y, 8.)
					//this.circle(p.x, p.y, 5.)
					this.subtract()
					this.fill('white')
					
					return this.result
				}
			}),
			Slider:require('stamps/slider').extend({
				
			})
		}
	}
	
	onFingerDown(e) {
		this.setFocus()
	}
	
	onDraw(debug) {
		//alright so how are we going to select things
		this.beginBg({moveScroll:0, x:'0', y:'0', w:'100%', h:'100%'})
		this.drawWheel({
			w:200,
			h:200
		})
		this.endBg(true)
	}
}