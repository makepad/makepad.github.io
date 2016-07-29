module.exports = require('stamp').extend(function ScrollBarStamp(proto){
	var vec4 = require('math/vec4')

	proto.props = {
		id:0,
		handlePos:{onChange:1, value:0.},
		handleSize:0.25,
		fingerDigit:0.,
		relativePos:0,
		lockScroll:1.,
		initPos:0.
	}

	proto.tools = {
		ScrollBar: require('shaders/quadshader').extend({
			props:{
				x:{noTween:1, value:NaN},
				y:{noTween:1, value:NaN},
				fingerDigit:{noTween:1,value:0.},
				relativePos:{noTween:1,value:0.},
				id:{noTween:1,value:0},
				bgColor:'#555',
				handleColor:'#bbb',
				borderRadius:4,
				handlePos:{noTween:1, value:0.25},
				handleSize:{noTween:1, value:0.25}
			},
			vertexPost:function(){ // bypass the worker roundtrip :)
				if(this.fingerDigit>0.5 && this.fingerDigit < 2.5){
					var inPos = this.fingerPos.xy
					if(this.fingerDigit>1.5) inPos = this.fingerPos.zw
					var localFinger = vec4(inPos,0,1.) * this.viewInverse - vec4(this.x, this.y,0,0)
					this.handlePos = clamp(localFinger.y / this.h - this.relativePos, 0., 1. - this.handleSize)
				}
			},
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
				tween:0.3,
				bgColor:'#444',
				handleColor:'#888'
			}
		},
		hover:{
			ScrollBar:{
				tween:0.1,
				bgColor:'#555',
				handleColor:'yellow'
			}
		}
	}

	proto.inPlace = true

	proto.onHandlePos = function(){
		if(this.onSlide) this.onSlide(this.handlePos)
	}

	// external api
	proto.setHandlePos = function(pos){
		this._handlePos = pos
		this.handleMoved = true
		//this.redraw()
	}

	// see what to do
	proto.onFingerDown = function(event){
		// lets figure out where the mouse is in relation to the nob
		var mousepos = event.y / this.$h
		// lets compute the relative mousepos to the nob
		this.relativePos = mousepos - this.handlePos
		this.fingerDigit = event.digit
		// do page jumping
		if(this.relativePos < 0 || this.relativePos > this.handleSize){
			this.relativePos = this.handleSize*0.5
			//this.handlePos = clamp(this.handlePos + sign(this.relativePos)*this.handleSize,0,1.-this.handleSize)
			//this.relativePos = mousepos - this.handlePos
			this.handleMoved = true
			this.handlePos =  clamp(mousepos - this.relativePos,0,1.-this.handleSize)
		}

		this.state = this.states.hover
	}

	proto.onFingerUp = function(event){
		this.state = this.states.default
		this.fingerDigit = 0
	}

	proto.onFingerHover = function(event){

	}

	proto.onFingerMove = function(event){
		var mousepos = event.y / this.$h
		this.handlePos = clamp(mousepos - this.relativePos,0,1.-this.handleSize)
		this.handleMoved = true
	}

	proto.onFingerOver = function(){
		this.state = this.states.hover
	}

	proto.onFingerOut = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.drawScrollBar(this)
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			
			if(!$stamp.handleMoved){
				$stamp._handlePos = $stamp._initPos
			}
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})