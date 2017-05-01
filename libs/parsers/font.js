module.exports = function(font){
	var u16 = new Uint16Array(font)
	var u32 = new Uint32Array(font)
	var f32 = new Float32Array(font)
	var u8 = new Uint8Array(font)
	var dt = Date.now()
	var map = {}
	if(u32[0] === 0x03F01175){ // msdf format
		map.type = 'msdf'
		var texw = map.texw = u16[2]
		var texh = map.texh = u16[3]
		var texu32 = new Uint32Array(texw * texh)
		var len = u32[2]
		var off = u32[3]
		var kern = u32[4]
		// create the 4 offsets
		var header = 5*4 + len*10*4 + kern * 3 * 4

		var oR = header
		var oG = off + header
		var oB = off*2 + header
		var oS = off*3 + header
		if(len > 30000) throw new Error('Font length incorrect:'+ len)
		var o = 5
		var ox = 0
		var oy = 0
		var mh = 0
		var glyphs = map.glyphs = {}
		for(let i = 0; i < len; i++){
			var unicode = u32[o++]
			var glyph = {
				x1: f32[o++],
				y1: f32[o++],
				x2: f32[o++],
				y2: f32[o++],
				advance: f32[o++]
			}
			var single = u32[o++]
			var offset = u32[o++]
			var tw = u32[o++]
			var th = u32[o++]
			//console.log(o, unicode, single)
			if(th > mh) mh = th;

            if(ox+tw >= texw) ox = 0, oy += mh+1, mh = 0;
			
			if(single){
				var ow = offset + oS
				for(var y = 0; y < th; y++){
					for(var x = 0; x < tw; x++, ow++){
						var v = u8[ow]
						texu32[x+ox+(y+oy)*texw] = (v<<16)| (v<<8) | v
					}
				}
			}
			else{
				var ow = offset
				for(var y = 0; y < th; y++){
					for(var x = 0; x < tw; x++, ow++){
						texu32[x+ox+(y+oy)*texw] = (u8[oR+ow]<<16)| (u8[oG+ow]<<8) | (u8[oB+ow]<<0)
					}
				}
			}
			
			glyph.tx1 = ox / texw
			glyph.ty1 = (oy + th) / texh
			glyph.tx2 = (ox + tw) / texw
			glyph.ty2 = oy / texh

			glyph.w = glyph.x2 - glyph.x1
			glyph.h = glyph.y2 - glyph.y1
			//console.log("Loading ",i, unicode)
			glyphs[unicode] = glyph
			// reconstitute font texture from offset streams
			ox += tw+1;
		}

		map.textureArray = texu32//font.slice(o*4)
	}
	else if(u32[0] === 0x02F01175){ // sdf format
		map.type = 'sdf'
		map.texw = u16[2]
		map.texh = u16[3]
		var len = u32[2]

		if(len > 30000) throw new Error('Font length incorrect')
		var o = 3
		var glyphs = map.glyphs = {}
		for(let i = 0; i < len; i++){
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
	else if(u32[0] === 0x01F01175){ // arc format
		map.type = 'arc'
		map.texw = u16[2]
		map.texh = u16[3]
		map.itemw = u16[4]
		map.itemh = u16[5]

		var len = u32[3] / (7*4)
		if(len > 30000) throw new Error('Font length incorrect')
		var o = 4
		var glyphs = map.glyphs = {}
		for(let i = 0; i < len; i++){
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
	if(!map.glyphs[63]){
		for(var key in map.glyphs){
			map.glyphs[63] = map.glyphs[key]
			break
		}
	}
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

	map.glyphs[13] = 
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