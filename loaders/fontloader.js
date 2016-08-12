module.exports = function(font){
	var u16 = new Uint16Array(font)
	var u32 = new Uint32Array(font)
	var f32 = new Float32Array(font)
	var u8 = new Uint8Array(font)

	var map = {}

	if(u32[0] === 0x02F01175){ // sdf format
		map.type = 'sdf'
		map.texw = u16[2]
		map.texh = u16[3]
		var len = u32[2]

		if(len > 30000) throw new Error('Font length incorrect')
		var o = 3
		var glyphs = map.glyphs = {}
		for(var i = 0; i < len; i++){
			var unicode = u32[o++]
			var glyph = {
				x1: f32[o++],
				y1: f32[o++],
				x2: f32[o++],
				y2: f32[o++],
				advance: f32[o++],
				tx1: f32[o++],
				ty1: f32[o++],
				tx2: f32[o++],
				ty2: f32[o++]
			}
			glyph.w = glyph.x2 - glyph.x1
			glyph.h = glyph.y2 - glyph.y1
			glyphs[unicode] = glyph
		}
		map.textureArray = font.slice(o*4)
	}
	else if(u32[0] === 0x01F01175){ // sdf format
		map.type = 'arc'
		map.texw = u16[2]
		map.texh = u16[3]
		map.itemw = u16[4]
		map.itemh = u16[5]

		var len = u32[3] / (7*4)
		if(len > 30000) throw new Error('Font length incorrect')
		var o = 4
		var glyphs = map.glyphs = {}
		for(var i = 0; i < len; i++){
			var unicode = u32[o++]
			var glyph = {
				x1: f32[o++],
				y1: f32[o++],
				x2: f32[o++],
				y2: f32[o++],
				advance: f32[o++],
				tx1: u8[o*4], //nominal
				ty1: u8[o*4+1],
				tx2: u8[o*4+2], // atlas
				ty2: u8[o*4+3]
			}
			o++
			glyph.w = glyph.x2 - glyph.x1
			glyph.h = glyph.y2 - glyph.y1
			glyphs[unicode] = glyph
		}
		map.textureArray = font.slice(o*4)
	}
	else throw new Error('Font type not recognised')

	map.glyphs[32] = { // space
		x1: 0,
		y1: -0.3,
		x2: 0.5,
		y2: 1.,
		tx1:0,
		ty1:0,
		tx2:0,
		ty2:0,
		advance: 0.5
	}

	map.glyphs[10] = { // newline
		x1: 0,
		y1: -0.3,
		x2: 0.5,
		y2: 1.,
		tx1:0,
		ty1:0,
		tx2:0,
		ty2:0,
		advance: -0.5
	}
	map.glyphs[9] = { // tab
		x1: 0,
		y1: -0.3,
		x2: 2,
		y2: 1.,
		tx1:0,
		ty1:0,
		tx2:0,
		ty2:0,
		advance: 2,
	}
	return map
}