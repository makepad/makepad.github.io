var types = require('base/types')
var painter = require('services/painter')
var fontloader = require('parsers/font')

module.exports = class Text extends require('base/shader'){

	prototype(){
		this.props = {
			//visible:{noTween:1, value:1.},
			x:NaN,
			y:NaN,
			dx:0,
			dy:0,

			color:'white',
			outlineColor:'white',
			shadowColor:[0,0,0,0.5],

			fontSize:12,

			italic:0.,
			baseLine:{kind:'uniform', value:1.},
			aaFactor:{kind:'uniform', value:0.01},
			shadowBlur: 1.0,
			shadowSpread: -1.,

			outlineWidth:0.,
			boldness:0, 
			shadowOffset: [0., 0.],
			
			fontSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},

			down: 0,
			align: [undefined,undefined],
			wrapping:'line',
			margin:[0,0,0,0],
			//noBounds: {mask:0, value:0},
			debug:{value:false},
			text:'',

			// character head/tail margin and advance
			advance:{mask:0, value:0},
			unicode:{mask:0, value:0},
			head:{mask:0, value:0},
			tail:{mask:0, value:0},
			x1:{mask:0, value:0},
			y1:{mask:0, value:0},
			x2:{mask:0, value:0},
			y2:{mask:0, value:0},
			tx1:{mask:0, value:0},
			ty1:{mask:0, value:0},
			tx2:{mask:0, value:0},
			ty2:{mask:0, value:0}
		}

		this.lineSpacing = 1.3

		this.mesh = new painter.Mesh(types.vec3).push(
			0, 0, 0,
			0, 1, 0,
			1, 0, 0,
			1, 1, 0
		).push(
			0,0, 1,
			1,0, 1,
			0, 1, 1,
			1, 1, 1
		)
		this.indices = new painter.Mesh(types.uint16)
		this.indices.push(0,1,2,2,1,3,4,5,6,6,5,7)

		this.verbs = {
			$length:function(){
				return this.PROPLEN
			},
			$readOffset:function(o){
				var proto = this.NAME.prototype
				var glyphs = proto.font.fontmap.glyphs
				if(!this.$shaders.NAME) return {}
				var len = this.PROPLEN
				if(o < 0 || o >= len) return
				var read = {
					x:this.PROP(o, 'x'),
					y:this.PROP(o, 'y'),
					head:this.PROP(o, 'head'),
					advance:this.PROP(o, 'advance'),
					tail:this.PROP(o, 'tail'),
					fontSize:this.PROP(o, 'fontSize'),
					italic:this.PROP(o, 'italic')
				}
				read.w = (read.head + read.advance + read.tail) * read.fontSize
				read.lineSpacing = proto.lineSpacing
				read.baseLine = proto.baseLine
				// write the bounding box
				return read
			},
			$seekPos:function(x, y){
				// lets find where we are inbetween
				if(!this.$shaders.NAME) return {}
				var len = this.PROPLEN
				var lineSpacing = this.NAME.prototype.lineSpacing
				if(len === 0){
					return 0
				}
				for(var i = 0; i < len; i++){
					var tx = this.PROP(i, 'x')
					var ty = this.PROP(i, 'y')
					var fs = this.PROP(i, 'fontSize')
					var total = this.PROP(i, 'advance') + this.PROP(i, 'head') + this.PROP(i, 'tail')

					var xw = total * fs
					if(ty >= y){
						return i - 1
					}
					if(y<ty) return -1
					if(y >= ty &&  x <= tx + xw && y <= ty + fs * lineSpacing){
						if(x > tx + xw * 0.5){
							if(ty !== this.PROP(i+1, 'y')) return i
							return i + 1
						}
						return i
					}
				}
				if(this.PROP(i-1, 'advance') < 0 && y <= ty + fs * lineSpacing) return len - 1
				return len
			},
			$boundRects:function(start, end){
				if(!this.$shaders.NAME) return {}
				var proto = this.NAME.prototype
				var glyphs = proto.font.fontmap.glyphs
				var lineSpacing = proto.lineSpacing
				var boxes = []
				var curBox
				var lty, ltx, lfs, lad
				for(let i = start; i < end; i++){
					var tx = this.PROP(i, 'x')
					var ty = this.PROP(i, 'y')
					var fs = this.PROP(i, 'fontSize')
					var advance = this.PROP(i, 'advance')
					var total = abs(advance) +  this.PROP(i, 'head') + this.PROP(i, 'tail')

					if(curBox && lty !== undefined && lty !== ty){
						curBox.w = (ltx + lfs * lad) - curBox.x
						curBox = undefined
					}
					if(!curBox){
						boxes.push(curBox = {fontSize:fs, x:tx, y:ty, h:fs * lineSpacing})
					}
					if(i === end-1){ // end current box
						curBox.w = (tx + fs * total) - curBox.x
						curBox = undefined
					}
					lty = ty, ltx = tx, lfs = fs, lad = total
				}
				return boxes
			},
			/*
			$resetBuffer:function(){
				this.PROPLEN = 0
			},*/
			draw:function(overload){
				var turtle = this.turtle

				this.STYLEPROPS(overload, 1)

				var absx = turtle._x !== undefined
				var absy = turtle._y !== undefined

				var txt = turtle._text
				var len = txt.length
		
				this.ALLOCDRAW(overload, len)

				// lets fetch the font
				var glyphs = this.NAME.prototype.font.fontmap.glyphs
				var lineSpacing = this.NAME.prototype.lineSpacing
				var wrapping = turtle._wrapping
				var fontSize = turtle._fontSize

				var off = 0

				turtle._h = fontSize * lineSpacing

				while(off < len){
					var width = 0
					var start = off
					// compute size of next chunk
					if(!wrapping){
						for(var b = off; b < len; b++){
							var unicode = txt.charCodeAt(b)
							var g = glyphs[unicode] || glyphs[63]
							width += g.advance * fontSize
						}
						off = len
					}
					else if(wrapping === 'line'){
						for(var b = off; b < len; b++){
							var unicode = txt.charCodeAt(b)
							var g = glyphs[unicode] || glyphs[63]
							width += g.advance * fontSize
							if(b >= off && unicode===10){
								b++
								break
							}
						}
						off = b
					}
					else if(wrapping === 'char'){
						var g = glyphs[txt.charCodeAt(off)] || glyphs[63]
						if(g) width += g.advance * fontSize
						off++
					}
					else{ // wrapping === 'word'
						for(var b = off; b < len; b++){
							var unicode = txt.charCodeAt(b)
							var g = glyphs[unicode] || glyphs[63]
							width += g.advance * fontSize
							if(b >= off && (unicode === 32||unicode===9||unicode===10)){
								b++
								break
							}
						}
						off = b
					}

					turtle._w = width
					if(!absx) turtle._x = NaN
					if(!absy) turtle._y = NaN
					absx = absy = false

					turtle.walk()

					for(let i = start; i < off; i++){
						var unicode = txt.charCodeAt(i)
						var g = glyphs[unicode] || glyphs[63]
						this.WRITEPROPS({
							advance:g.advance,
							head:0.,
							tail:0.,
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
						turtle._x += g.advance * fontSize
					}
					//}
					if(unicode===10){
						this.turtle.lineBreak()
					}
				}
			}
		}
	}

	vertexStyle(){$
	}

	pixelStyle(){$
		//this.outlineWidth = abs(sin(this.mesh.y*10.))*3.+1.
		//this.field += sin(this.mesh.y*10.)*3.*cos(this.mesh.x*10.)*3.
	}

	vertex(){$
		this.visible = 1.0

		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		// ref these for characters with margins (prefix->advance)
		this.advance
		this.tail

		var minPos = vec2(
			this.x + this.fontSize * (this.x1 + this.head),
			this.y - this.fontSize * this.y1 + this.fontSize * this.baseLine
		)
		var maxPos = vec2(
			this.x + this.fontSize * (this.x2 + this.head),
			this.y - this.fontSize * this.y2 + this.fontSize * this.baseLine
		)

		// clip the rect
		var shift = vec2(-this.viewScroll.x*this.moveScroll+this.dx, -this.viewScroll.y*this.moveScroll+this.dy)

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

	drawField(field){$
		if(field > 1. + this.outlineWidth){
			discard
		}

		if(this.outlineWidth>0.){
			var outline = abs(field) - (this.outlineWidth)
			var inner = field + this.outlineWidth
			var borderfinal = mix(this.outlineColor, vec4(this.outlineColor.rgb, 0.), clamp(outline,0.,1.))
			return mix(this.color, borderfinal, clamp(inner, 0., 1.))
		}
		var a = smoothstep(.75,-.75, field)
		return vec4(this.color.rgb*a, a)
	}

	drawShadow(field){
		var shadowfield = (field-clamp(this.shadowBlur,1.,26.))/this.shadowBlur-this.shadowSpread
		return mix(this.shadowColor, vec4(this.shadowColor.rgb,0.), clamp(shadowfield,0.,1.))
	}

	pixel(){$
		var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))
		var field = (((.75-texture2D(this.fontSampler, this.textureCoords.xy).r)*4.) * this.aaFactor) / adjust * 1.4 
		this._field = field

		this.pixelStyle()

		field = this._field - this.boldness

		if(this.mesh.z < 0.5){
			return this.drawShadow(field)
		}
		return this.drawField(field)
	}

	onCompileVerbs(){
		super.onCompileVerbs()
		if(this.font){
			if(!this.font.fontmap){
				var map = this.font.fontmap = fontloader(this.font)
				this.font.fontSampler = new painter.Texture(painter.LUMINANCE, painter.UNSIGNED_BYTE, painter.TRANSFER_DATA, map.texw, map.texh, map.textureArray)
			}
			// make the texture.
			this.fontSampler = this.font.fontSampler
		}
	}
}
