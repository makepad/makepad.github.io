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

			group:0,

			outlineColor:{kind:'uniform', value:'white'},
			shadowColor: {kind:'uniform', value:[0,0,0,0.5]},
			baseLine:{kind:'uniform', value:1.},
			shadowOffset: {kind:'uniform', value:[0., 0.]},
			shadowBlur:{kind:'uniform', value:1.0},
			shadowSpread:{kind:'uniform', value:-1.},
			outlineWidth:{kind:'uniform', value:0.},

			// make these uniforms now
			turtleClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
			moveScroll:{kind:'uniform', value:1.}
		}
		this.$noWriteList = true
		this.verbs = {
			write:function(txt, style, igroup){ // just write plain text
				var group = igroup!==undefined?igroup:1
				let chunks = this.$fastNAMEChunks
				let styles = this.$fastNAMEStyles
				chunks.push(txt)
				styles.push(style)
				//debugger
				//$turtle._debug = 1
				let len = txt.length - 1
				let turtle = this.turtle
				let fontSize = this.$fastNAMEFontSize

				let lineSpacing = $proto.lineSpacing
				let glyphs = $proto.font.fontmap.glyphs

				let spaceAdvance = glyphs[32].advance
				let tabAdvance = glyphs[9].advance

				let posx = turtle.wx
				let posy = turtle.wy

				let nh = fontSize * lineSpacing
				let sx = turtle.sx

				// allocate enough space
				let need = len+1

				this.ALLOCDRAW(null, need)

				var color = style.color
				var boldness = style.boldness
				for(let i = 0; i <= len; i++){
					var unicode = txt.charCodeAt(i)

					var g = glyphs[unicode] || glyphs[63]

					var advance = g.advance
					this.WRITEPROPS({
						visible:1,
						dx:0,
						dy:0,
						x:posx,
						y:posy,
						color: color,
						fontSize:fontSize,
						italic:0,
						boldness:boldness, 
						group:group,
						advance:advance,
						tx1: g.tx1,
						ty1: g.ty1,
						tx2: g.tx2,
						ty2: g.ty2,
						x1: g.x1,// + d.x,
						y1: g.y1,// + d.y,
						x2: g.x2,// + d.x,
						y2: g.y2,// + d.y,
					})

					posx += advance * fontSize

					if(unicode === 10 || unicode ===13){
						turtle.mh = 0
						if(posx>turtle.x2) turtle.x2 = posx
						// lets output indenting array items
						posx = sx, posy += nh
						turtle.wy += nh
					}
					else turtle.mh = nh
				}
				
				posy += nh
				if(posy>turtle.y2) turtle.y2 = posy				
				turtle.wx = posx// + margin[1]* fontSize
				return this.LENCORRECT()
			},
			// function with support for handling whitespace
			fast:function(txt, style, ihead, igroup){
				//debugger
				//$turtle._debug = 1
				var len = txt.length - 1
				var turtle = this.turtle
				var indent = this.$fastNAMEIndent
				var chunks = this.$fastNAMEChunks
				var styles = this.$fastNAMEStyles
				var fontSize = this.$fastNAMEFontSize

				var lineSpacing = $proto.lineSpacing
				var glyphs = $proto.font.fontmap.glyphs

				var spaceAdvance = glyphs[32].advance
				var tabAdvance = glyphs[9].advance 

				var posx = turtle.wx
				var posy = turtle.wy

				var nh = fontSize * lineSpacing
				var sx = turtle.sx

				var head = ihead!==undefined? ihead: style.head
				var tail = style.tail// itail!==undefined? itail: style.tail
				var group = igroup!==undefined?igroup:1
				// allocate enough space
				var need = (len + 1) * (indent+1) + head + tail
				this.ALLOCDRAW(null, need)
				
				var first = txt.charCodeAt(0)

				if(first !== 10 && first !== 13){
					for(var i = 0; i < head; i++){
						// write spaces
						var o = $turtle.$propOffset++
						this.PROP[o, 'visible'] = 0
						this.PROP[o, 'x'] = posx// - turtle.$xAbs
						this.PROP[o, 'y'] = posy// - turtle.$yAbs
						this.PROP[o, 'fontSize'] = fontSize
						this.PROP[o, 'advance'] = spaceAdvance
						posx += spaceAdvance * fontSize
						chunks.push(' ')
						styles.push(this.$fastTextWhitespace)
					}
				}

				// output the text
				var chunk = chunks.push(txt) - 1
				var start = 0
				styles.push(style)

				var color = style.color
				var boldness = style.boldness

				for(var i = 0; i <= len; i++){
					var unicode = txt.charCodeAt(i)

					var g = glyphs[unicode] || glyphs[63]

					var advance = g.advance
									
					this.WRITEPROPS({
						visible:1,
						dx:0,
						dy:0,
						x:posx,
						y:posy,
						color: color,
						fontSize:fontSize,
						italic:0,
						boldness:boldness, 
						group:group,
						//unicode:unicode,
						advance:advance,
						tx1: g.tx1,
						ty1: g.ty1,
						tx2: g.tx2,
						ty2: g.ty2,
						x1: g.x1,// + d.x,
						y1: g.y1,// + d.y,
						x2: g.x2,// + d.x,
						y2: g.y2,// + d.y,
					})

					posx += advance * fontSize

					if(unicode === 10 || unicode ===13){
						// slice previous chunk upto our current newline
						if(i !== len){
							chunks[chunk] = txt.slice(start, i+1)
							start = i+1
						}

						turtle.mh = 0
						if(posx>turtle.x2) turtle.x2 = posx
						// lets output indenting array items
						posx = sx, posy += nh
						turtle.wy += nh

						for(var j = 0; j < indent; j++){
							var o = $turtle.$propOffset++
							this.PROP[o, 'visible'] = 0
							this.PROP[o, 'x'] = posx //- turtle.$xAbs
							this.PROP[o, 'y'] = posy //- turtle.$yAbs
							this.PROP[o, 'fontSize'] = fontSize
							this.PROP[o, 'advance'] = tabAdvance
							posx += tabAdvance * fontSize
							chunks.push('\t')
							styles.push(this.$fastTextWhitespace)
						}
						// output next chunk from txt
						if(i !== len){
							chunk = chunks.push(txt.slice(start))-1
							styles.push(style)
						}
					}
					else turtle.mh = nh
				}
				
				// write tail
				for(var j = 0; j < tail; j++){
					var o = $turtle.$propOffset++
					this.PROP[o, 'visible'] = 0
					this.PROP[o, 'x'] = posx //- turtle.$xAbs
					this.PROP[o, 'y'] = posy //- turtle.$yAbs
					this.PROP[o, 'fontSize'] = fontSize
					this.PROP[o, 'advance'] = spaceAdvance
					posx += spaceAdvance * fontSize
					chunks.push(' ')
					styles.push(this.$fastTextWhitespace)
					//out._text += ' '
				}

				posy += nh
				if(posy>turtle.y2) turtle.y2 = posy				
				turtle.wx = posx// + margin[1]* fontSize
				// correct length to actual used data
				return this.LENCORRECT()
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
		//this.pixelStyle()
		//var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))
		//var field = (((.75-texture2D(this.fontSampler, this.textureCoords.xy).r)*4.) * this.aaFactor) / adjust * 1.4 
		//this._field = field

		if(this.group < 0.){
			this.viewport(this.ppos)
			this.moveTo(5.,0.)
			this.lineTo(5.,this.psize.y)
			return this.stroke('#4',1.)
		}

		this.pixelStyle()
		
		//var sigDist = s1.a-.5//(s1.a*2.+s2.a+s3.a+s4.a+s5.a)/5.7 - .5// + 0.1*this.boldness
		var s = texture2D(this.fontSampler, this.textureCoords.xy)
		//var sigDist = s.a - .5
		var sigDist = max(min(s.r,s.g),min(max(s.r,s.g),s.b))-.5+0.1*this.boldness
		var adjust = length(vec2(length(dFdx(this.textureCoords.x*this.fontTextureSize.x)), length(dFdy(this.textureCoords.y*this.fontTextureSize.y))))*0.07
		//var adjust = length(vec2(length(dFdx(this.textureCoords.x)), length(dFdy(this.textureCoords.y))))*12.
		var opacity = clamp(sigDist/adjust + 0.5, 0.0, 1.0)

		return vec4(this.color.rgb*opacity, opacity)
		//field = this._field - this.boldness

		//return this.drawField(field)
	}
}
