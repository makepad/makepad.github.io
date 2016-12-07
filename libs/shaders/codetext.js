var types = require('base/types')
var painter = require('services/painter')

module.exports = class CodeText extends require('shaders/text'){

	prototype(){
		// special
		this.props = {
			//visible:{kind:'uniform',noTween:1, value:1.},
			x:NaN,
			y:NaN,
			color:{value:'black'},
			fontSize:12,
			boldness:0, 
			unicode:{mask:0, value:0},
			italic:{value:0.},

			outlineColor:{kind:'uniform', value:'white'},
			shadowColor: {kind:'uniform', value:[0,0,0,0.5]},
			baseLine:{kind:'uniform', value:1.},
			shadowOffset: {kind:'uniform', value:[0., 0.]},
			shadowBlur:{kind:'uniform',value:1.0},
			shadowSpread:{kind:'uniform',value:-1.},
			outlineWidth:{kind:'uniform', value:0.},

			// make these uniforms now
			turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
			moveScroll:{kind:'uniform', value:1.}
		}
		this.$noWriteList = true
		this.verbs = {
			$setTweenStart:function(o, v){
				//this.PROP[o, 'tweenStart'] = v
			},
			fast:function(txt, style, ihead, itail){
				var out = this.$fastNAMEOutput			
				var len = txt.length - 1
				var turtle = this.turtle

				this.ALLOCDRAW(null, len + 1)

				this.$fastTextWritten += len+1

				var margin = style.margin
				var lineSpacing = $proto.lineSpacing
				var glyphs = $proto.font.fontmap.glyphs

				var fontSize = this.$fastNAMEFontSize
				//var xabs = turtle.$xAbs
				//var yabs = turtle.$yAbs
				var posx = turtle.wx// - turtle.$xAbs
				var posy = turtle.wy// - turtle.$yAbs

				var nh = fontSize * lineSpacing
				var base = out._text.length 
				out._text += txt
				var sx = turtle.sx// - turtle.$xAbs

				if(this.$fastNAMEAnnotate){
					out.ann.push(txt, style, ihead, itail, fontSize, sx)
				}

				//var changeOffset = this.$fastNAMEOffset
				//var changeStart = this.$fastNAMEStart
				//var changeDelta = this.$fastNAMEDelta

				var advance = 0
				var head = ihead!==undefined? ihead: style.head, tail = 0

				/*
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
				}*/

				var color = style.color
				var boldness = style.boldness
				for(let i = 0; i <= len; i++){
					var unicode = txt.charCodeAt(i)
					var basei = base + i
					/*
					if(basei === changeOffset){
						tweenDelta = -changeDelta
					}
					if(basei === changeStart){
						turtle._delay = this.$fastNAMEDelay
					}*/

					var g = glyphs[unicode] || glyphs[63]
					//var d = displace[unicode] || displace[0]

					if(i ===len) tail = itail!==undefined?itail:style.tail
					var advance = g.advance
					//$turtle._debug = 1
					this.WRITEPROPS({
						//$tweenDelta:tweenDelta,
						dx:0,
						dy:0,
						x:posx,
						y:posy,
						color: color,
						fontSize:fontSize,
						italic:0,
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
						this.$fastNAMELines.push(this.$fastNAMEWritten)
						turtle.mh = 0
						if(posx>turtle.x2) turtle.x2 = posx
						// lets output indenting
						posx = sx, posy += nh
						turtle.wy += nh
					}
					else turtle.mh = nh
				}
				posy += nh
				if(posy>turtle.y2) turtle.y2 = posy
				turtle.wx = posx// + margin[1]* fontSize
			}

		}

		this.mesh = new painter.Mesh(types.vec3).push(
			0,0, 1,
			0,1, 1,
			1, 0, 1,
			1, 1, 1
		)
		this.indices = new painter.Mesh(types.uint16)
		this.indices.push(0,1,2,2,1,3)
	}

	pixel(){$
		this.viewport(this.mesh.xy)
		this.shape = ((.75-texture2D(this.fontSampler,this.textureCoords.xy).r)*0.25)-.05
		//if(this.mesh.z < 0.5){
		//	this.blur = this.shadowBlur
		//	return this.fill(this.shadowColor)
		//}
		this.fillKeep(this.color)
		if(this.outlineWidth>0.){
			this.stroke(this.outlineColor,this.outlineWidth)
		}
		return this.result
		/*
		//if(this.unicode == 10.) return 'red'
		var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))
		var field = (((.75-texture2D(this.fontSampler, this.textureCoords.xy).r)*4.) * 0.010) / adjust * 1.4 
		this._field = field

		this.pixelStyle()

		field = this._field - this.boldness - clamp(this.pixelRatio-1.,0.,1.)*0.1

		return this.drawField(field)*/
	}
}
