module.exports = require('stamp').extend(function ScrollBarStamp(proto){
	var vec4 = require('math/vec4')
	proto.props = {
		text:'Button',
		id:0,
		handlePos:0.,
		handleSize:0.25,
		initPos:0.
	}

	proto.tools = {
		ScrollBar: require('shaders/quadshader').extend({
			id:0,
			bgColor:'#555',
			handleColor:'#bbb',
			borderRadius:4,
			handlePos:0.25,
			handleSize:0.25,
			pixelStyle:function(){},
			pixel:function(){
				this.pixelStyle()
				var p = this.mesh.xy * vec2(this.w, this.h)
				var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
				
				// background field
				var pBg = p
				var bBg = this.borderRadius
				var hBg = vec2(.5*this.w, .5*this.h)
				var fBg = length(max(abs(pBg-hBg) - (hBg - vec2(bBg)), 0.)) - bBg

				// handle field
				var pHan = p -  vec2(0., this.h * this.handlePos)
				var bHan = this.borderRadius
				var hHan = vec2(.5*this.w, .5*this.h) * vec2(1., this.handleSize)
				var fHan = length(max(abs(pHan-hHan) - (hHan - vec2(bHan)), 0.)) - bHan

				// mix the fields
				var finalBg = mix(this.bgColor, vec4(this.bgColor.rgb, 0.), clamp(fBg*antialias+1.,0.,1.))
				return mix(this.handleColor, finalBg, clamp(fHan * antialias + 1., 0., 1.))
			}
		})
	}

	proto.states = {
		default:{
			ScrollBar:{
				bgColor:'#444',
				handleColor:'#888'
			}
		},
		out:{
			ScrollBar:{
				tween:0.4,
				bgColor:'#444',
				handleColor:'#888'
			}
		},
		hover:{
			ScrollBar:{
				bgColor:'#555',
				handleColor:'yellow'
			}
		}
	}

	// see what to do
	proto.onFingerDown = function(event){
		// lets figure out where the mouse is in relation to the nob
		var mousepos = event.y / this.$h
		// lets compute the relative mousepos to the nob
		this.relativePos = mousepos - this.handlePos
		// do page jumping
		if(this.relativePos < 0 || this.relativePos > this.handleSize){
			this.handlePos = clamp(this.handlePos + sign(this.relativePos)*this.handleSize,0,1.-this.handleSize)
			this.relativePos = mousepos - this.handlePos
			this.handleMoved = true
		}
		this.state = this.states.hover
	}

	proto.onFingerUp = function(event){
		this.state = this.states.out
	}

	proto.onFingerHover = function(event){

	}

	proto.onFingerMove = function(event){
		var mousepos = event.y / this.$h
		this.handlePos = clamp(mousepos - this.relativePos,0,1.-this.handleSize)
		this.handleMoved = true
		this.redraw()
	}

	proto.onFingerOver = function(){
		this.state = this.states.hover
	}

	proto.onFingerOut = function(){
		this.state = this.states.out
	}

	proto.onDraw = function(){
		this.drawScrollBar(this)
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
		
			if(!$stamp.handleMoved){
				$stamp.handlePos = $stamp.initPos
			}

			this.$DRAWSTAMP()

			return $stamp
		}
	}
})