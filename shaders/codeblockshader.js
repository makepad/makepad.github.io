module.exports = require('shader').extend(function QuadShader(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		visible: {noTween:true, value:1.0},

		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		h2: NaN,
		w2: NaN,
		open:0,
		z: 0,
		indent:0,
		borderWidth: 1,
		borderRadius: 4,

		bgColor: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'gray'},

		// make these uniforms
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		lockScroll:{kind:'uniform', noTween:1, value:1.},

		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,10,1.0,1.0]},
		duration: {kind:'uniform', value:0.3},
		delay: {styleLevel:1, value:0.},
		mesh:{kind:'geometry', type:types.vec3},
	}

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0, 0, 0,
		0, 1, 0,
		1, 0, 0,
		1, 1, 0
	).pushQuad(
		0,0, 1,
		1,0, 1,
		0, 1, 1,
		1, 1, 1
	)
	
	proto.vertexStyle = function(){$
	}

	proto.vertex = function(){$
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		// vertexshader clipping!
		var shift = vec2(- this.viewScroll.x*this.lockScroll, - this.viewScroll.y*this.lockScroll)
		var size = vec2()

		this.topSize =  vec2(this.w, this.h)
		this.bottomSize =vec2(this.w2, this.h2)

		if(this.mesh.z < .5){ // top part
			shift += vec2(this.x , this.y )
			size = this.topSize
		}
		else{ // bottom part
			shift += vec2(this.x, this.y + this.h)
			size = this.bottomSize
		}

		// clip it
		this.mesh.xy = (clamp(
			this.mesh.xy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size

		// write out position
		var pos = vec4(
			this.mesh.xy * size + shift, 
			0., 
			1.
		)
		this.p = this.mesh.xy * size
		if(this.mesh.z > .5){
			this.p.y += this.h
		}
		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.gloop = 8

	proto.blend = function(a, b, k){
	    var h = clamp(.5 + .5 * (b - a) / k, 0., 1.)
	    return mix(b, a, h) - k * h * (1.0 - h)
	}

	proto.pixel = function(){$

		// ok lets draw things
		var p = this.p//mesh.xy * vec2(this.w, this.h)

		var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
		
		// background field
		var topNudgeT = 13.
		var topNudgeB = 13.
		var topSize = vec2(.5*this.topSize.x, .5*(this.topSize.y-topNudgeB))
		var topPos = vec2(0.,topNudgeT)
		var topField = length(max(abs(p-topPos-topSize) - (topSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		// top right
		var sideNudgeL = this.topSize.x - 18.
		var sideNudgeR = this.topSize.x - 18.
		var sideSize = vec2(.5*(this.topSize.x-sideNudgeL), .5*(this.topSize.y))
		var sidePos = vec2(sideNudgeR,0.)
		var sideField = length(max(abs(p-sidePos-sideSize) - (sideSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		var botNudgeL = 12.
		var botNudgeR = 16.
		var botNudgeH = 4.
		var botSize = vec2(.5*(this.bottomSize.x-botNudgeR), .5*(this.bottomSize.y-botNudgeH))
		var botPos = vec2(botNudgeL, this.h-botNudgeH)
		var botField = length(max(abs(p-botPos-botSize) - (botSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		//botField *= 0.2
		var grabScale = 0.9
		var grabSize = vec2(.5*(this.bottomSize.x), .5*(this.h*grabScale))
		var grabPos = vec2(0., this.h2 + (1.-grabScale)*this.h)
		var grabField = length(max(abs(p-grabPos-grabSize) - (grabSize - vec2(this.borderRadius)), 0.)) - this.borderRadius
		//grabField *= 0.3
		// ok lets add the bottom field
		var field = this.blend(this.blend(this.blend(topField,sideField, this.gloop), botField, this.gloop),grabField,this.gloop)

		// operator field
		//var opSize = vec2(.5*(this.x3-this.x2- this.opMargin*2.), .5*(this.h - this.opMargin*2.))
		//var opField = length(max(abs(p - vec2(this.x2+this.opMargin, this.opMargin)-opSize) - (opSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		// mix the fields
		var finalBg = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(field*antialias+1.,0.,1.))
		var finalBorder = mix(this.bgColor, finalBg, clamp((field+this.borderWidth) * antialias + 1., 0., 1.))
		finalBorder.a *= this.open
		return finalBorder
		//return mix(this.opColor, finalBorder, clamp(opField * antialias + 1., 0., 1.))
	}

	proto.toolMacros = {
		fast:function(x, y, w, h, w2, h2, indent, style){
			this.$ALLOCDRAW(1, true)
			var tweenDelta = 0
			this.$WRITEPROPS({
				$fastWrite:true,
				$tweenDelta:tweenDelta,
				visible:1,
				x:x,
				y:y,
				w:w,
				h:h,
				w2:w2,
				h2:h2,
				indent:indent,
				open:style.open,
				borderWidth: style.borderWidth,
				borderRadius: style.borderRadius,
				bgColor: style.bgColor,
				borderColor: style.borderColor
			})
		},
	}
})