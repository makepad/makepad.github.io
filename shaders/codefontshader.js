module.exports = require('shaders/fontshader').extend(function(proto, base){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		//visible:{kind:'uniform',noTween:1, value:1.},
		x:NaN,
		y:NaN,
		color:{pack:'float12', value:'black'},
		fontSize:12,
		boldness:0, 
		unicode:{noStyle:1, value:0},
		italic:{notween:1,value:0.},

		outlineColor:{kind:'uniform', value:'white'},
		shadowColor: {kind:'uniform', value:[0,0,0,0.5]},
		baseLine:{kind:'uniform', value:1.},
		shadowOffset: {kind:'uniform', value:[0., 0.]},
		shadowBlur:{kind:'uniform',value:1.0},
		shadowSpread:{kind:'uniform',value:-1.},
		outlineWidth:{kind:'uniform', value:0.},

		// make these uniforms now
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,10,1.0,1.0]},
		duration: {kind:'uniform', value:0.3},
		delay: {styleLevel:1, value:0.},
		lockScroll:{kind:'uniform', noTween:1, value:1.}
	}
	proto.displace = {
		0:{
			x:0,y:0
		}
	}
	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0,0, 1,
		1,0, 1,
		0, 1, 1,
		1, 1, 1
	)
	
	proto.noInterrupt = 1

	proto.pixel = function(){$
		//if(this.unicode == 10.) return 'red'
		var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))
		var field = (((.75-texture2D(this.fontSampler, this.textureCoords.xy).r)*4.) * 0.006) / adjust * 1.4 
		this.field = field

		this.pixelStyle()

		field = this.field - this.boldness - clamp(this.pixelRatio-1.,0.,1.)*0.2


		if(this.mesh.z < 0.5){
			return this.drawShadow(field)
		}
		return this.drawField(field)
	}

	proto.toolMacros = {
		$setTweenStart:function(o, v){
			this.$PROPVARDEF()
			this.$PROP(o, 'tweenStart') = v
		},
		fast:function(txt, style, ihead, itail){
			var out = this.$fastNAMEOutput			
			var len = txt.length - 1
			var turtle = this.turtle

			this.$ALLOCDRAW(len + 1, true)

			var margin = style.margin
			var lineSpacing = $proto.lineSpacing
			var glyphs = $proto.font.fontmap.glyphs

			var fontSize = this.$fastNAMEFontSize
			var posx = turtle.wx
			var posy = turtle.wy
			var nh = fontSize * lineSpacing
			
			var base = out._text.length 
			out._text += txt
			var sx = turtle.sx

			if(this.$fastNAMEWrite){
				out.ann.push(txt, style, sx, ihead, fontSize)
			}

			var changeOffset = this.$fastNAMEOffset
			var changeStart = this.$fastNAMEStart
			var changeDelta = this.$fastNAMEDelta

			var advance = 0
			var head = ihead!==undefined? ihead: style.head, tail = 0
			var tweenDelta
			if(base >= changeOffset){
				tweenDelta = -changeDelta
			}
			else{
				tweenDelta = 0
			}
			if(base >= changeStart){
				turtle._delay = this.$fastNAMEDelay
			}
			else{
				turtle._delay = -100000
			}

			var color = style.color
			var boldness = style.boldness
			for(var i = 0; i <= len; i++){
				var unicode = txt.charCodeAt(i)
				var basei = base + i
				if(basei === changeOffset){
					tweenDelta = -changeDelta
				}
				if(basei === changeStart){
					turtle._delay = this.$fastNAMEDelay
				}

				var g = glyphs[unicode] || glyphs[63]
				//var d = displace[unicode] || displace[0]

				if(i ===len) tail = itail!==undefined?itail:style.tail
				var advance = g.advance

				this.$WRITEPROPS({
					$fastWrite:true,
					$tweenDelta:tweenDelta,
					x:posx,
					y:posy,
					color: color,
					fontSize:fontSize,
					//italic:style.italic,
					boldness:boldness, 
					unicode:unicode,
					head:head,
					advance:advance,
					tail:tail,
					tx1: g.tx1,
					ty1: g.ty1,
					tx2: g.tx2,
					ty2: g.ty2,
					x1: g.x1,// + d.x,
					y1: g.y1,// + d.y,
					x2: g.x2,// + d.x,
					y2: g.y2,// + d.y,
					unicode: unicode
				})

				posx += (head + advance + tail) * fontSize

				head = 0
				
				if(unicode === 10 || unicode ===13){
					turtle.mh = 0
					if(posx>turtle.x2) turtle.x2 = posx
					posx = turtle.sx, posy += nh
					turtle.wy += nh
				}
				else turtle.mh = nh
			}
			posy += nh
			if(posy>turtle.y2) turtle.y2 = posy
			turtle.wx = posx// + margin[1]* fontSize
		}
	}
})
