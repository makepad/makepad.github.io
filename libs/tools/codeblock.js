module.exports = require('base/shader').extend(function QuadShader(proto){

	var types = require('base/types')
	var painter = require('services/painter')

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
		fontSize:12.,
		bgColor: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'gray'},

		// make these uniforms
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		moveScroll:{kind:'uniform', noTween:1, value:1.},

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
		var shift = vec2(- this.viewScroll.x*this.moveScroll, - this.viewScroll.y*this.moveScroll)
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

		var aa = this.antialias(p)

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
		
		var topDist = this.boxDistance(
			p, 
			5., 
			13.5, 
			this.topSize.x - 6. - 5., 
			this.topSize.y - 13.5, 
			lineRadius
		)

		var sideDist = this.boxDistance(
			p,
			this.topSize.x - 18.,
			0.,
			18.,
			this.topSize.y - 0.,
			this.borderRadius
		)

		var botDist = this.boxDistance(
			p,
			12,
			this.h - 1.,
			this.bottomSize.x - 16.,
			this.bottomSize.y - 10.,
			lineRadius
		)
	
		var grabDist = this.boxDistance(
			p,
			0.,
			this.h2 - 2.,
			this.bottomSize.x,
			this.h,
			this.borderRadius
		)

		var gloop = 4.
	
		var df = 1. - this.open * this.errorTime
		sideDist += df * 14.
		grabDist += df * 14.
		topDist += pow(df, 4.) * abs(p.x)// - this.topSize.x)
		botDist += pow(df, 4.) * abs(p.y)// - this.bottomSize.y)

		// blend the fields
		var dist = this.blendDistance(this.blendDistance(this.blendDistance(topDist,botDist, .5), sideDist, gloop), grabDist, gloop)

		// compute color
		return this.colorBorderDistance(aa, dist, this.borderWidth, this.bgColor, this.borderColor )
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