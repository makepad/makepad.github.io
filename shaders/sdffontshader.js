module.exports = require('shader').extend(function SdfFontShader(proto, base){

	var types = require('types')
	var painter = require('painter')
	var fontloader = require('loaders/fontloader')

	// special
	proto.props = {
		visible:{noTween:1, value:1.},
		x:{noInPlace:1, value:NaN},
		y:{noInPlace:1, value:NaN},

		color:{pack:'float12', value:'black'},
		outlineColor:{pack:'float12', value:'white'},
		shadowColor: {pack:'float12', value:[0,0,0,0.5]},

		fontSize:12,

		italic:0.,
		baseLine:{kind:'uniform', value:1.},

		shadowBlur: 1.0,
		shadowSpread: -1.,

		outlineWidth:0.,
		boldness:0, 
		shadowOffset: {pack:'int12', value:[0., 0.]},

		unicode:{noStyle:1, value:0},

		fontSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},

		wrapping:{styleLevel:1, value:'word'},
		margin:{styleLevel:1, value:[0,0,0,0]},
		text:{styleLevel:1, value:''},

		lockScroll:{noTween:1, value:1.},
		turtleClip:{styleLevel:3, noInPlace:1, noCast:1, value:[-50000,-50000,50000,50000]},
		viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},

		x1:{noStyle:1, noTween:1, value:0},
		y1:{noStyle:1, noTween:1, value:0},
		x2:{noStyle:1, noTween:1, value:0},
		y2:{noStyle:1, noTween:1, value:0},
		tx1:{noStyle:1, noTween:1, value:0},
		ty1:{noStyle:1, noTween:1, value:0},
		tx2:{noStyle:1, noTween:1, value:0},
		ty2:{noStyle:1, noTween:1, value:0}
	}

	proto.lineSpacing = 1.3

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

	proto.pixelStyle = function(){$
		//this.outlineWidth = abs(sin(this.mesh.y*10.))*3.+1.
		//this.field += sin(this.mesh.y*10.)*3.*cos(this.mesh.x*10.)*3.
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

	proto.drawField = function(field){$
		if(field > 1. + this.outlineWidth){
			discard
		}

		if(this.outlineWidth>0.){
			var outline = abs(field) - (this.outlineWidth)
			var inner = field + this.outlineWidth
			var borderfinal = mix(this.outlineColor, vec4(this.outlineColor.rgb, 0.), clamp(outline,0.,1.))
			return mix(this.color, borderfinal, clamp(inner, 0., 1.))
		}

		return vec4(this.color.rgb, smoothstep(.75,-.75, field))
	}

	proto.drawShadow = function(field){
		var shadowfield = (field-clamp(this.shadowBlur,1.,26.))/this.shadowBlur-this.shadowSpread
		return mix(this.shadowColor, vec4(this.shadowColor.rgb,0.), clamp(shadowfield,0.,1.))
	}

	proto.pixel = function(){$
		var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))
		var field = (((.75-texture2D(this.fontSampler, this.textureCoords.xy).r)*4.) * 0.006) / adjust * 1.4 
		this.field = field

		this.pixelStyle()

		field = this.field - this.boldness

		if(this.mesh.z < 0.5){
			return this.drawShadow(field)
		}
		return this.drawField(field)
	}

	proto.toolMacros = {
		$readOffset:function(o){
			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			
			this.$READBEGIN()
			var len = this.$PROPLEN()
			if(o < 0 || o >= len) return

			var read = {
				x:this.$READPROP(o, 'x'),
				y:this.$READPROP(o, 'y'),
				unicode:this.$READPROP(o, 'unicode'),
				fontSize:this.$READPROP(o, 'fontSize'),
				italic:this.$READPROP(o, 'italic')
			}

			read.lineSpacing = this._NAME.prototype.lineSpacing
			read.baseLine = this._NAME.prototype.baseLine
			read.advance = glyphs[read.unicode].advance

			// write the bounding box
			return read
		},
		$seekPos:function(x, y, box){
			// lets find where we are inbetween
			var len = this.$PROPLEN() - 1
			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			var lineSpacing = this._NAME.prototype.lineSpacing
			this.$READBEGIN()
			for(var i = 0; i < len; i++){
				var tx = this.$READPROP(i, 'x')
				var ty = this.$READPROP(i, 'y')
				var fs = this.$READPROP(i, 'fontSize')
				var unicode = this.$READPROP(i, 'unicode')
				var advance = glyphs[unicode].advance
				if(y<ty) return -1
				if(y >= ty && (unicode === 10 || x <= tx + advance * fs) && y <= ty + fs * lineSpacing){
					if(unicode !== 10 && !box && x > tx + advance * fs * 0.5) return i + 1
					return i
				}
			}
			return -2
		},
		$boundRects:function(start, end){

			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			var lineSpacing = this._NAME.prototype.lineSpacing
			this.$READBEGIN()
			var boxes = []
			var curBox
			for(var i = start; i < end; i++){
				var tx = this.$READPROP(i, 'x')
				var ty = this.$READPROP(i, 'y')
				var fs = this.$READPROP(i, 'fontSize')
				var unicode = this.$READPROP(i, 'unicode')
				var advance = glyphs[unicode].advance

				if(!curBox){
					boxes.push(curBox = {x:tx, y:ty, h:fs * lineSpacing})
				}
				if(unicode === 10 || i === end-1){ // end current box
					curBox.w = (tx + fs * advance) - curBox.x
					curBox = undefined
				}
			}
			return boxes
		},
		draw:function(overload){
			var turtle = this.turtle
			this.$STYLEPROPS(overload, 1)

			var abspos = !isNaN(turtle._x) && !isNaN(turtle._y)
			var txt = turtle._text
			var elen = txt.length
			var len = elen + 1
			this.$ALLOCDRAW(len)

			// lets fetch the font
			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			var lineSpacing = this._NAME.prototype.lineSpacing
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
						var unicode = b === elen? 32: txt.charCodeAt(b)
						width += glyphs[unicode].advance * fontSize
					}
					off = len
				}
				else if(wrapping === 'char'){
					width += glyphs[off === elen? 32: txt.charCodeAt(off)].advance * fontSize
					off++
				}
				else{
					for(var b = off; b < len; b++){
						var unicode = b === elen? 32: txt.charCodeAt(b)
						width += glyphs[unicode].advance * fontSize
						if(b >= off && (unicode === 32||unicode===9||unicode===10)){
							b++
							break
						}
					}
					off = b
				}
				if(width){
					// run the turtle
					turtle._w = width
					if(!abspos){
						turtle._x = NaN
						turtle._y = NaN
					}
					else abspos = false
					turtle.walk()
					// output
					for(var i = start; i < off; i++){
						var unicode = i === elen? 32: txt.charCodeAt(i)
						var g = glyphs[unicode]
						this.$WRITEPROPS({
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
				}
				if(unicode===10){
					this.turtle.lineBreak()
				}
			}
		},
		$drawFast:function(txt, style){
			var len = txt.length
			var turtle = this.turtle
			this.$ALLOCDRAW(len, true)
			var posx = turtle._x
			var posy = turtle._y
			var glyphs = this._NAME.prototype.font.fontmap.glyphs
			var fontSize = style.fontSize
			for(var i = 0; i < len; i++){
				var unicode = txt.charCodeAt(i)
				var g = glyphs[unicode]
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
				if(unicode === 10){
					if(posx>turtle.x2) turtle.x2 = posx
					posx = 0, posy += fontSize * this._NAME.prototype.lineSpacing
				}
			}
			if(posy>turtle.y2) turtle.y2 = posy
		}
	}

	proto.onextendclass = function(){
		if(this.font && !this.font.fontmap){
			var map = this.font.fontmap = fontloader(this.font)
			// make the texture.
			this.fontSampler = new painter.Texture(painter.LUMINANCE, painter.UNSIGNED_BYTE, 0, map.texw, map.texh, map.textureArray)
		}
		base.onextendclass.apply(this, arguments)
	}
})
