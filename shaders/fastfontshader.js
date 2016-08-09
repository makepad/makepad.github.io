module.exports = require('shaders/sdffontshader').extend(function FastFontShader(proto, base){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		visible:{kind:'uniform',noTween:1, value:1.},
		x:{noInPlace:1, value:NaN},
		y:{noInPlace:1, value:NaN},
		color:{pack:'float12', value:'black'},
		outlineColor:{kind:'uniform', value:'white'},
		shadowColor: {kind:'uniform', value:[0,0,0,0.5]},
		fontSize:12,
		italic:{notween:1,value:0.},
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

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0,0, 1,
		1,0, 1,
		0, 1, 1,
		1, 1, 1
	)

	proto.toolMacros = {
		fast:function(txt, style){
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
			if(out){
				out.text += txt
				out.ann.push(txt, style, turtle.sx)
			}
			var sx = turtle.sx
			for(var i = 0; i < len; i++){
				var unicode = txt.charCodeAt(i)
				var g = glyphs[unicode]

				this.$WRITEPROPS({
					$fastWrite:true,
					visible:1,
					x:posx,
					y:posy,
					color: style.color,
					fontSize:fontSize,
					italic:style.italic,
					boldness:style.boldness, 
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
