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
		borderRadius: 8,
		fontSize:12.,
		bgColor: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'gray'},

		// make these uniforms
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		lockScroll:{kind:'uniform', noTween:1, value:1.},

		errorAnim:{kind:'uniform', animate:1, value:[0,0,0,0]},

		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,10,1.0,1.0]},
		duration: {noTween:1., value:0.3},
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

	proto.noInterrupt = 1

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
		else{
			this.pickId = 0.
		}

		this.errorTime = this.animateUniform(this.errorAnim)

		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.blend = function(a, b, k){
	    var h = clamp(.5 + .5 * (b - a) / k, 0., 1.)
	    return mix(b, a, h) - k * h * (1.0 - h)
	}

	proto.pixel = function(){$

		// ok lets draw things
		var p = this.p

		var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
		// mini view
		if(this.fontSize < 6.){
			if(this.errorTime<0.5) return vec4(0.)
			if(this.open < 0.5) return vec4(0.)
			if(this.mesh.z > .5){
				return mix(this.bgColor, vec4(this.bgColor.rgb,0.),this.mesh.x)
			}
			return mix(this.bgColor, vec4(this.bgColor.rgb,0.),this.mesh.y)
		}

		// background field
		var lineRadius = 1.
		var topNudgeT = 13.5
		var topNudgeB = 13.5
		var topNudgeW = 6.
		var topNudgeL = 5.
		var topSize = vec2(.5*(this.topSize.x-topNudgeW-topNudgeL), .5*(this.topSize.y-topNudgeB))
		var topPos = vec2(topNudgeL,topNudgeT)
		var topField = length(max(abs(p-topPos-topSize) - (topSize - vec2(lineRadius)), 0.)) - lineRadius

		// top right
		var sideNudgeL = this.topSize.x - 18.
		var sideNudgeR = this.topSize.x - 18.
		var sideNudgeT = 0.
		var sideSize = vec2(.5*(this.topSize.x-sideNudgeL), .5*(this.topSize.y - sideNudgeT))
		var sidePos = vec2(sideNudgeR,0.)
		var sideField = length(max(abs(p-sidePos-sideSize) - (sideSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		// bottom
		var botNudgeL = 12.
		var botNudgeR = 16.
		var botNudgeH = 1.
		var botNudgeB = 10.
		var botSize = vec2(.5*(this.bottomSize.x-botNudgeR), .5*(this.bottomSize.y-botNudgeB))
		var botPos = vec2(botNudgeL, this.h-botNudgeH)
		var botField = length(max(abs(p-botPos-botSize) - (botSize - vec2(lineRadius)), 0.)) - lineRadius

		// the bottom grabber
		var h3 = this.h*1.0
		var grabSize = vec2(.5*(this.bottomSize.x), .5*(h3))
		var grabPos = vec2(0., this.h2-2.)
		var grabField = length(max(abs(p-grabPos-grabSize) - (grabSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		var gloop = 4.
	
		// so errorTime is normally 1.
		// but once the error anim starts it will be 0. till it becomes 1.
		// what we want is that 
		var df = (1.-this.open* this.errorTime) 
		sideField += df*14.
		grabField += df*14.
		topField += pow(df,4.) * abs(p.x)// - this.topSize.x)
		botField += pow(df,4.) * abs(p.y)// - this.bottomSize.y)

		// blend the fields
		var field = this.blend(this.blend(this.blend(topField,botField, .5), sideField, gloop),grabField,gloop)

		// compute color
		var finalBg = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(field*antialias+1.,0.,1.))
		var finalBorder = mix(this.bgColor, finalBg, clamp((field+this.borderWidth) * antialias + 1., 0., 1.))

		return finalBorder
		//return mix(this.opColor, finalBorder, clamp(opField * antialias + 1., 0., 1.))
	}

	proto.toolMacros = {
		$setTweenStart:function(o, v){
			this.$PROPVARDEF()
			this.$PROP(o, 'tweenStart') = v
		},
		fast:function(x, y, w, h, w2, h2, indent, pickId, style){
			this.$ALLOCDRAW(1, true)
			this.$WRITEPROPS({
				$fastWrite:true,
				visible:1,
				delay:0.,
				fontSize:this.$fastTextFontSize,
				duration:$proto.duration,
				x: x,
				y: y,
				w: w,
				h: h,
				w2: w2,
				h2: h2,
				indent:indent,
				pickId:pickId,
				open:style.open,
				borderWidth: style.borderWidth,
				borderRadius: style.borderRadius,
				bgColor: style.bgColor,
				borderColor: style.borderColor
			})
		},
	}
})