var types = require('base/types')
var painter = require('services/painter')

module.exports = class CodeBlock extends require('base/shader'){

	prototype(){
		// special
		this.props = {
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
			color: {pack:'float12', value:'gray'},
			borderColor: {pack:'float12', value:'gray'},
			// make these uniforms
			turtleClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
			moveScroll:{kind:'uniform', noTween:1, value:1.},
			//errorAnim:{kind:'uniform', animate:1, value:[0,0,0,0]},
			tween: {kind:'uniform', value:0.},
			ease: {kind:'uniform', value:[0,10,1.0,1.0]},
			duration: {noTween:1., value:0.3},
			delay: {styleLevel:1, value:0.},
			mesh:{kind:'geometry', type:types.vec3},
		}

		this.verbs = {
			$setTweenStart:function(o, v){
				this.$PROP[o, 'tweenStart'] = v
			},
			fast:function(x, y, w, h, w2, h2, indent, pickId, style){
				this.ALLOCDRAW(null,1)
				//console.log(style.color)
				//var color = 'white'
				this.WRITEPROPS({
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
					color: style.color,
					borderColor: style.borderColor
				})
			},
		}

		this.mesh = new painter.Mesh(types.vec3).pushQuad(
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

		this.noInterrupt = 1
	}

	vertexStyle(){$
	}

	vertex(){$
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
		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
		if(this.pickId == 0.) return 'red'

		//return 'red'
		//return this.color*0.5
		this.viewport(this.p)
		this.box(4.,13.4,this.topSize.x - 6. - 5.,  this.topSize.y - 13.5, 1.)
		this.box(this.topSize.x - 18., 0., 18., this.topSize.y - 0., this.borderRadius)
		this.box(10, this.h - 2., 2., this.bottomSize.y - 10.,1.)
		this.box(0., this.h2 - 2., this.bottomSize.x, this.h, this.borderRadius)
		this.shape *= this.open
		return this.fillKeep(this.color)
		//this.blur =2.
		//return this.glow('#3',1.,1.)

	}
}