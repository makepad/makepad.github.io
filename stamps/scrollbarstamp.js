module.exports = require('stamp').extend(function ScrollBarStamp(proto){

	proto.props = {
		text:'Button',
		id:0,
		slidePos:0.,
		slideHeight:0.25
	}

	proto.tools = {
		ScrollBar: require('shaders/quadshader').extend({
			id:0,
			bgColor:'#555',
			handleColor:'#bbb',
			borderRadius:4,
			slidePos:0.25,
			slideHeight:0.25,
			pixelStyle:function(){},
			pixel:function(){
				this.pixelStyle()
				var p = this.mesh.xy * vec2(this.w, this.h)
				var adjust = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
				
				// background field
				var pBg = p
				var bBg = this.borderRadius
				var hBg = vec2(.5*this.w, .5*this.h)
				var fBg = length(max(abs(pBg-hBg) - (hBg - vec2(bBg)), 0.)) - bBg

				// handle field
				var pHan = p -  vec2(0., this.h * this.slidePos)
				var bHan = this.borderRadius
				var hHan = vec2(.5*this.w, .5*this.h) * vec2(1., this.slideHeight)
				var fHan = length(max(abs(pHan-hHan) - (hHan - vec2(bHan)), 0.)) - bHan

				// mix the fields
				var finalBg = mix(this.bgColor, vec4(this.bgColor.rgb, 0.), clamp(fBg*adjust+1.,0.,1.))
				return mix(this.handleColor, finalBg, clamp(fHan * adjust + 1., 0., 1.))
			}
		})
	}

	proto.onFingerDown = function(){
		this.state = this.states.hover
	}

	proto.onFingerUp = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.drawScrollBar(this)
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})