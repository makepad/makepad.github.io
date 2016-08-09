module.exports = require('shaders/sdffontshader').extend(function FastFontShader(proto, base){

	var types = require('types')
	var painter = require('painter')
	var fontloader = require('loaders/fontloader')

	// special
	proto.props = {
		visible:{kind:'uniform',noTween:1, value:1.},
		x:{noInPlace:1, value:NaN},
		y:{noInPlace:1, value:NaN},
		color:{pack:'float12', value:'black'},
		outlineColor:{kind:'uniform', value:'white'},
		shadowColor: {kind:'uniform', value:[0,0,0,0.5]},
		fontSize:12,
		italic:0.,
		baseLine:{kind:'uniform', value:1.},
		shadowBlur:{kind:'uniform',value:1.0},
		shadowSpread:{kind:'uniform',value:-1.},
		outlineWidth:{kind:'uniform', value:0.},
		boldness:0, 
		shadowOffset: {kind:'uniform', value:[0., 0.]},
		unicode:{noStyle:1, value:0},
		noBounds: {kind:'uniform',value:0},
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},

		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,0,1.0,1.0]},
		duration: {kind:'uniform', value:0.},
		delay: {styleLevel:1, value:0.},
		//tweenStart: {kind:'uniform', value:1.0},
		lockScroll:{kind:'uniform', noTween:1, value:1.}
	}

	proto.lineSpacing = 1.3

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0,0, 1,
		1,0, 1,
		0, 1, 1,
		1, 1, 1
	)

	proto.vertexStyle = function(){$
	}

	proto.pixelStyle = function(){$
	}

	proto.vertex = function(){$
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		// ref it otherwise it doesnt get written
		this.unicode

		var minPos = vec2(
			this.x + this.fontSize * this.x1,
			this.y - this.fontSize * this.y1 + this.fontSize * this.baseLine
		)
		var maxPos = vec2(
			this.x + this.fontSize * this.x2 ,
			this.y - this.fontSize * this.y2 + this.fontSize * this.baseLine
		)

		// clip the rect
		var shift = vec2(-this.viewScroll.x*this.lockScroll, -this.viewScroll.y*this.lockScroll)

		if(this.mesh.z < 0.5){
			shift += this.shadowOffset.xy
		}

		// clip mesh
		this.mesh.xy = (clamp(
			mix(minPos, maxPos, this.mesh.xy) + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - minPos - shift) / (maxPos - minPos)
		
		// compute position
		var pos = mix(
			minPos,
			maxPos,
			this.mesh.xy
		) + shift

		// we cant clip italic. ahwell
		pos.x += mix(0.,this.fontSize * this.italic,this.mesh.y)

		// shadow
		if(this.mesh.z < 0.5){
			if(abs(this.shadowOffset.x)<0.001 && abs(this.shadowOffset.y)<0.001 && this.shadowBlur<2.0){
				return vec4(0)
			}
			var meshmz = this.mesh.xy *2. - 1.
			//pos.xy += this.shadowOffset.xy// + vec2(this.shadowSpread , -this.shadowSpread) * meshmz
		}

		this.textureCoords = mix(
			vec2(this.tx1, this.ty1), 
			vec2(this.tx2, this.ty2), 
			this.mesh.xy
		)

		return vec4(pos,0.,1.) * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.toolMacros = {
		$annotated:function(annotated, style){

		},
		fast:function(txt, style){
			DUMP
			var out = this.fastNAMEOutput			
			var len = txt.length
			var turtle = this.turtle
			this.$ALLOCDRAW(len, true)
			var margin = style.margin
			var lineSpacing = this._NAME.prototype.lineSpacing
			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			var fontSize = style.fontSize
			var posx = turtle.wx + margin[3] * fontSize
			var posy = turtle.wy + margin[0] * fontSize

			out.text += txt
			var sx = turtle.sx
			var ann = out.ann
			for(var i = 0; i < len; i++){
				var unicode = txt.charCodeAt(i)
				var g = glyphs[unicode]
				ann.push(unicode, sx, style)

				this.$WRITEPROPS({
					$fastWrite:true,
					visible:1,
					x:posx,
					y:posy,
					ease:style.ease,
					duration:style.duration,
					tween:style.tween,
					color: style.color,
					outlineColor: style.outlineColor,
					shadowColor: style.shadowColor,
					fontSize:fontSize,
					italic:style.italic,
					shadowBlur:style.shadowBlur,
					shadowSpread:style.shadowSpread,
					outlineWidth:style.outlineWidth,
					boldness:style.boldness, 
					shadowOffset:style.shadowOffset,
					lockScroll:style.lockScroll,
					turtleClip:turtle._turtleClip,
					unicode:unicode,
					tx1: g.tx1,
					ty1: g.ty1,
					tx2: g.tx2,
					ty2: g.ty2,
					x1: g.x1,
					y1: g.y1,
					x2: g.x2,
					y2: g.y2,
					unicode: unicode
				})
				posx += g.advance * fontSize
				var nh = fontSize * lineSpacing
				if(nh > turtle.mh) turtle.mh = nh
				if(unicode === 10){
					turtle.mh = 0
					if(posx>turtle.x2) turtle.x2 = posx
					posx = turtle.sx, posy += fontSize * lineSpacing
					turtle.wy += fontSize * lineSpacing
				}
			}
			posy += fontSize * lineSpacing
			if(posy>turtle.y2) turtle.y2 = posy
			turtle.wx = posx + margin[1]* fontSize
		}
	}
})
