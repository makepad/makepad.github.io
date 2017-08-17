var types = exports

function getPrimary(fields){
	for(let key in fields){
		var type = fields[key]
		if(type.constructor === Type) return type
		type = getPrimary(type.fields)
		if(type) return type
	}
}
function getArray(fields){
	for(let key in fields){
		var type = fields[key]
		if(type.array) return type.array
	}
}

function getSlots(fields){
	var total = 0
	for(let key in fields){
		var type = fields[key]
		total += type.slots
	}
	return total || 1
}

function Type(config){
	var type = this
	if(!(type instanceof Type)){
		type = Object.create(Type.prototype)
		type.constructor = Type
	}
	for(let key in config){
		type[key] = config[key]
	}
	return type
}

function Struct(fields, name){
	var struct = this

	if(!(struct instanceof Struct)){
		struct = Object.create(Struct.prototype)
	}
	struct.fields = fields
	struct.name = name
	// lets precompute the slots and array
	struct.array = getArray(fields)
	struct.primary = getPrimary(fields)
	struct.slots = getSlots(fields)
	// lets find the first field that has a type
	return struct
}

Struct.prototype = Object.create(Type.prototype)
Struct.prototype.constructor = Struct

function Enum(enumSet){
	var enm = this
	if(!(enm instanceof Enum)){
		enm = Object.create(Enum.prototype)
	}
	enm.enum = enumSet
	enm.name = 'float'
	enm.slots = 1
	enm.array = Float32Array
	return enm
}

Enum.prototype = Object.create(Type.prototype)
Enum.prototype.constructor = Enum

function ObjectT(props){
	var obj = this
	if(!(obj instanceof ObjectT)){
		obj = Object.create(ObjectT.prototype)
	}
	obj.props = props
	obj.name = 'object'
	return obj
}

types.Type = Type
types.Struct = Struct
types.Enum = Enum
types.Object = ObjectT

// generic types
types.void = Type({
	name:'void'
})

types.bool = Type({
	name:'bool',
	array:Int32Array,
	slots:1
})

types.int = Type({
	name:'int',
	slots:1,
	array:Int32Array
})

types.uint16 = Type({
	name:'uint16',
	slots:1,
	array:Uint16Array
})

types.vec1 = 
types.float = Type({
	name:'float',
	slots:1,
	array:Float32Array
})

types.sampler2D = Type({
	name:'sampler2D',
	sampler:true
})

types.samplerCube = Type({
	name:'samplerCube',
	sampler:true
})

types.g =
types.gen = Type({
	name:'gen'
})

types.genorfloat = Type({
	name:'genorfloat'
})

types.bvec = Type({
	name:'bvec'
})

types.vec = Type({
	name:'vec'
})

types.genopt = Type({
	name:'gen',
	optional:true
})

types.floatopt = Type({
	name:'float',
	optional:true,
	slots:1,
	array:Float32Array
})

types.bvec2 = Struct({
	x:types.bool,
	y:types.bool,
}, 'bvec2')

types.bvec3 = Struct({
	x:types.bool,
	y:types.bool,
	z:types.bool
},'bvec3')

types.bvec4 = Struct({
	x:types.bool,
	y:types.bool,
	z:types.bool,
	w:types.bool
}, 'bvec4')

types.ivec2 = Struct({
	x:types.int,
	y:types.int
}, 'ivec2')

types.ivec3 = Struct({
	x:types.int,
	y:types.int,
	z:types.int
}, 'ivec3')

types.ivec4 = Struct({
	x:types.int,
	y:types.int,
	z:types.int,
	w:types.int
}, 'ivec4')

types.vec2 = Struct({
	x:types.float,
	y:types.float
}, 'vec2')

types.vec3 = Struct({
	x:types.float,
	y:types.float,
	z:types.float
}, 'vec3')

types.vec4 = Struct({
	x:types.float,
	y:types.float,
	z:types.float,
	w:types.float
}, 'vec4')

types.mat2 = Struct({
	a:types.float,
	b:types.float,
	c:types.float,
	d:types.float,	
}, 'mat2')

types.mat3 = Struct({
	a:types.float,
	b:types.float,
	c:types.float,

	d:types.float,	
	e:types.float,
	f:types.float,

	g:types.float,
	h:types.float,	
	i:types.float,
}, 'mat3')

types.mat4 = Struct({
	a:types.float,
	b:types.float,
	c:types.float,
	d:types.float,
	
	e:types.float,
	f:types.float,
	g:types.float,
	h:types.float,
	
	i:types.float,
	j:types.float,
	k:types.float,
	l:types.float,

	m:types.float,
	n:types.float,
	o:types.float,
	p:types.float
}, 'mat4')

types.string = Type({
	name:'string'
})

// value to type conversion, used for attribute mapping
types.typeFromValue = function(value){
	if(typeof value === 'number') return types.float
	if(typeof value === 'boolean') return types.float
	if(typeof value === 'string') return types.vec4
	if(typeof value === 'object'){
		if(value._name) return value
		if(Array.isArray(value)){
			var len = value.length
			if(len === 1){
				var v0 = value[0]
				if(typeof v0 === 'string') return types.vec4
				if(typeof v0 === 'number') return types.vec4
			}

			if(len === 2){
				var v0 = value[0]
				if(typeof v0 === 'string') return types.vec4
			}
			if(len === 2) return types.vec2
			if(len === 3) return types.vec3
			if(len === 4) return types.vec4
			if(len === 9) return types.mat3
			if(len === 16) return types.mat4
		}
		if(value instanceof Float32Array){
			if(len === 2) return types.vec2
			if(len === 3) return types.vec3
			if(len === 4) return types.vec4
			if(len === 9) return types.mat3
			if(len === 16) return types.mat4
		}
	}
}

var hex = Array(128)
for(let hexl = 0; hexl <10; hexl++){
	hex[String(hexl).charCodeAt(0)] = hexl
	hex["ABCDEF".charCodeAt(hexl)] = 10+hexl
	hex["abcdef".charCodeAt(hexl)] = 10+hexl
}

types.colorFromString = function(str, alpha, ar, o){
	if(str.charCodeAt(0) === 35){ // starts with #
		var len = str.length
		if(str.length === 4){
			var r = hex[str.charCodeAt(1)]
			var g = hex[str.charCodeAt(2)]
			var b = hex[str.charCodeAt(3)]
			ar[o] = (r|r<<4)/255
			ar[o+1] = (g|g<<4)/255
			ar[o+2] = (b|b<<4)/255
			ar[o+3] = alpha
			return true
		}
		else if(len === 2){
			var r = hex[str.charCodeAt(1)]
			ar[o] = (r|r<<4)/255
			ar[o+1] = (r|r<<4)/255
			ar[o+2] = (r|r<<4)/255
			ar[o+3] = alpha
			return true
		}
		else if(str.length === 5){
			var r = hex[str.charCodeAt(1)]
			var g = hex[str.charCodeAt(2)]
			var b = hex[str.charCodeAt(3)]
			var a = hex[str.charCodeAt(4)]
			ar[o] = (r|r<<4)*alpha/255
			ar[o+1] = (g|g<<4)*alpha/255
			ar[o+2] = (b|b<<4)*alpha/255
			ar[o+3] = (a|a<<4)/255
			return true
		}
		else if(str.length === 7){
			ar[o] = (hex[str.charCodeAt(2)] | (hex[str.charCodeAt(1)] << 4))/255
			ar[o+1] = (hex[str.charCodeAt(4)] | (hex[str.charCodeAt(3)] << 4))/255
			ar[o+2] = (hex[str.charCodeAt(6)] | (hex[str.charCodeAt(5)] << 4))/255
			ar[o+3] = alpha
			return true
		}
		else if(str.length === 9){
			ar[o] = (hex[str.charCodeAt(2)] | (hex[str.charCodeAt(1)] << 4))*alpha/255
			ar[o+1] = (hex[str.charCodeAt(4)] | (hex[str.charCodeAt(3)] << 4))*alpha/255
			ar[o+2] = (hex[str.charCodeAt(6)] | (hex[str.charCodeAt(5)] << 4))*alpha/255
			ar[o+3] = (hex[str.charCodeAt(8)] | (hex[str.charCodeAt(7)] << 4))/255
			return true
		}
		return false
	}
	var col = str === 'random'?floor(Math.random()*16777215):types.colormap[str]
	if(col !== undefined){
		ar[o] = (col>>16)/255
		ar[o+1] = ((col>>8)&0xff)/255
		ar[o+2] = (col&0xff)/255
		ar[o+3] = alpha				
		return true
	}		
	return false
}

types.colorFromStringPacked = function(str, alpha, ar, o){
	if(str.charCodeAt(0) === 35){ // starts with #
		var len = str.length
		if(len === 4){
			var r = hex[str.charCodeAt(1)]
			var g = hex[str.charCodeAt(2)]
			var b = hex[str.charCodeAt(3)]
			ar[o] = ((r|r<<4)<<16) + (((g|g<<4))<<4)
			ar[o+1] = ((b|b<<4)<<16) + ((alpha*4095)|0)
			return true
		}
		else if(len === 2){
			var r = hex[str.charCodeAt(1)]
			ar[o] = ((r|r<<4)<<16) + (((r|r<<4))<<4)
			ar[o+1] = ((r|r<<4)<<16) + ((alpha*4095)|0)
			return true
		}
		else if(len === 5){
			var r = hex[str.charCodeAt(1)]
			var g = hex[str.charCodeAt(2)]
			var b = hex[str.charCodeAt(3)]
			var t = hex[str.charCodeAt(4)]
			ar[o] = ((r|r<<4)*alpha<<16) + (((g|g<<4))*alpha<<4)
			ar[o+1] = ((b|b<<4)*alpha<<16) + (((t|t<<4))<<4)
			return true
		}
		else if(len === 7){
			ar[o] = ((hex[str.charCodeAt(2)] | (hex[str.charCodeAt(1)]<<4))<<16) + 
				((hex[str.charCodeAt(4)] | (hex[str.charCodeAt(3)]<<4))<<4)
			ar[o+1] = ((hex[str.charCodeAt(6)] | (hex[str.charCodeAt(5)]<<4))<<16)+
				((alpha*4095)|0)
			return true
		}
		else if(len === 9){
			ar[o] = ((hex[str.charCodeAt(2)] | (hex[str.charCodeAt(1)]<<4))*alpha<<16) + 
				((hex[str.charCodeAt(4)] | (hex[str.charCodeAt(3)]<<4))*alpha<<4)
			ar[o+1] = ((hex[str.charCodeAt(6)] | (hex[str.charCodeAt(5)]<<4))*alpha<<16)+
				((hex[str.charCodeAt(8)] | (hex[str.charCodeAt(7)]<<4))<<4)
			return true
		}
		return false
	}
	var col = str === 'random'?floor(Math.random()*16777215):types.colormap[str]
	if(col !== undefined){
		var dx = 4095/255
		ar[o] = (((col>>16)*dx)<<12)+ ((((col>>8)&0xff)*dx)|0)
		ar[o+1] = (((col&0xff)*dx)<<12)+((alpha*4095)|0)
		return true
	}		
	return false
}


types.colormap = {
	// CSS
	AliceBlue:0xF0F8FF,
	AntiqueWhite:0xFAEBD7,
	Aqua:0x00FFFF,
	Aquamarine:0x7FFFD4,
	Azure:0xF0FFFF,
	Beige:0xF5F5DC,
	Bisque:0xFFE4C4,
	Black:0x000000,
	BlanchedAlmond:0xFFEBCD,
	Blue:0x0000FF,
	BlueViolet:0x8A2BE2,
	Brown:0xA52A2A,
	Burlywood:0xDEB887,
	CadetBlue:0x5F9EA0,
	Chartreuse:0x7FFF00,
	Chocolate:0xD2691E,
	Coral:0xFF7F50,
	Cornflower:0x6495ED,
	Cornsilk:0xFFF8DC,
	Crimson:0xDC143C,
	Cyan:0x00FFFF,
	DarkBlue:0x00008B,
	DarkCyan:0x008B8B,
	DarkGoldenrod:0xB8860B,
	DarkGray:0xA9A9A9,
	DarkGreen:0x006400,
	DarkKhaki:0xBDB76B,
	DarkMagenta:0x8B008B,
	DarkOliveGreen:0x556B2F,
	DarkOrange:0xFF8C00,
	DarkOrchid:0x9932CC,
	DarkRed:0x8B0000,
	DarkSalmon:0xE9967A,
	DarkSeaGreen:0x8FBC8F,
	DarkSlateBlue:0x483D8B,
	DarkSlateGray:0x2F4F4F,
	DarkTurquoise:0x00CED1,
	DarkViolet:0x9400D3,
	DeepPink:0xFF1493,
	DeepSkyBlue:0x00BFFF,
	DimGray:0x696969,
	DodgerBlue:0x1E90FF,
	Firebrick:0xB22222,
	FloralWhite:0xFFFAF0,
	ForestGreen:0x228B22,
	Fuchsia:0xFF00FF,
	Gainsboro:0xDCDCDC,
	GhostWhite:0xF8F8FF,
	Gold:0xFFD700,
	Goldenrod:0xDAA520,
	Gray:0xBEBEBE,
	WebGray:0x808080,
	Green:0x00FF00,
	WebGreen:0x008000,
	GreenYellow:0xADFF2F,
	Honeydew:0xF0FFF0,
	HotPink:0xFF69B4,
	IndianRed:0xCD5C5C,
	Indigo:0x4B0082,
	Ivory:0xFFFFF0,
	Khaki:0xF0E68C,
	Lavender:0xE6E6FA,
	LavenderBlush:0xFFF0F5,
	LawnGreen:0x7CFC00,
	LemonChiffon:0xFFFACD,
	LightBlue:0xADD8E6,
	LightCoral:0xF08080,
	LightCyan:0xE0FFFF,
	LightGoldenrod:0xFAFAD2,
	LightGray:0xD3D3D3,
	LightGreen:0x90EE90,
	LightPink:0xFFB6C1,
	LightSalmon:0xFFA07A,
	LightSeaGreen:0x20B2AA,
	LightSkyBlue:0x87CEFA,
	LightSlateGray:0x778899,
	LightSteelBlue:0xB0C4DE,
	LightYellow:0xFFFFE0,
	Lime:0x00FF00,
	LimeGreen:0x32CD32,
	Linen:0xFAF0E6,
	Magenta:0xFF00FF,
	Maroon:0xB03060,
	WebMaroon:0x7F0000,
	MediumAquamarine:0x66CDAA,
	MediumBlue:0x0000CD,
	MediumOrchid:0xBA55D3,
	MediumPurple:0x9370DB,
	MediumSeaGreen:0x3CB371,
	MediumSlateBlue:0x7B68EE,
	MediumSpringGreen:0x00FA9A,
	MediumTurquoise:0x48D1CC,
	MediumVioletRed:0xC71585,
	MidnightBlue:0x191970,
	MintCream:0xF5FFFA,
	MistyRose:0xFFE4E1,
	Moccasin:0xFFE4B5,
	NavajoWhite:0xFFDEAD,
	NavyBlue:0x000080,
	OldLace:0xFDF5E6,
	Olive:0x808000,
	OliveDrab:0x6B8E23,
	Orange:0xFFA500,
	OrangeRed:0xFF4500,
	Orchid:0xDA70D6,
	PaleGoldenrod:0xEEE8AA,
	PaleGreen:0x98FB98,
	PaleTurquoise:0xAFEEEE,
	PaleVioletRed:0xDB7093,
	PapayaWhip:0xFFEFD5,
	PeachPuff:0xFFDAB9,
	Peru:0xCD853F,
	Pink:0xFFC0CB,
	Plum:0xDDA0DD,
	PowderBlue:0xB0E0E6,
	Purple:0xA020F0,
	WebPurple:0x7F007F,
	RebeccaPurple:0x663399,
	Red:0xFF0000,
	RosyBrown:0xBC8F8F,
	RoyalBlue:0x4169E1,
	SaddleBrown:0x8B4513,
	Salmon:0xFA8072,
	SandyBrown:0xF4A460,
	SeaGreen:0x2E8B57,
	Seashell:0xFFF5EE,
	Sienna:0xA0522D,
	Silver:0xC0C0C0,
	SkyBlue:0x87CEEB,
	SlateBlue:0x6A5ACD,
	SlateGray:0x708090,
	Snow:0xFFFAFA,
	SpringGreen:0x00FF7F,
	SteelBlue:0x4682B4,
	Tan:0xD2B48C,
	Teal:0x008080,
	Thistle:0xD8BFD8,
	Tomato:0xFF6347,
	Turquoise:0x40E0D0,
	Violet:0xEE82EE,
	Wheat:0xF5DEB3,
	White:0xFFFFFF,
	WhiteSmoke:0xF5F5F5,
	Yellow:0xFFFF00,
	YellowGreen:0x9ACD32,
	// material design
	Red500:0xF44336,
	Red50:0xFFEBEE,
	Red100:0xFFCDD2,
	Red200:0xEF9A9A,
	Red300:0xE57373,
	Red400:0xEF5350,
	Red500:0xF44336,
	Red600:0xE53935,
	Red700:0xD32F2F,
	Red800:0xC62828,
	Red900:0xB71C1C,
	RedA100:0xFF8A80,
	RedA200:0xFF5252,
	RedA400:0xFF1744,
	RedA700:0xD50000,

	Pink500:0xE91E63,
	Pink50:0xFCE4EC,
	Pink100:0xF8BBD0,
	Pink200:0xF48FB1,
	Pink300:0xF06292,
	Pink400:0xEC407A,
	Pink500:0xE91E63,
	Pink600:0xD81B60,
	Pink700:0xC2185B,
	Pink800:0xAD1457,
	Pink900:0x880E4F,
	PinkA100:0xFF80AB,
	PinkA200:0xFF4081,
	PinkA400:0xF50057,
	PinkA700:0xC51162,

	Purple500:0x9C27B0,
	Purple50:0xF3E5F5,
	Purple100:0xE1BEE7,
	Purple200:0xCE93D8,
	Purple300:0xBA68C8,
	Purple400:0xAB47BC,
	Purple500:0x9C27B0,
	Purple600:0x8E24AA,
	Purple700:0x7B1FA2,
	Purple800:0x6A1B9A,
	Purple900:0x4A148C,
	PurpleA100:0xEA80FC,
	PurpleA200:0xE040FB,
	PurpleA400:0xD500F9,
	PurpleA700:0xAA00FF,

	DeepPurple500:0x673AB7,
	DeepPurple50:0xEDE7F6,
	DeepPurple100:0xD1C4E9,
	DeepPurple200:0xB39DDB,
	DeepPurple300:0x9575CD,
	DeepPurple400:0x7E57C2,
	DeepPurple500:0x673AB7,
	DeepPurple600:0x5E35B1,
	DeepPurple700:0x512DA8,
	DeepPurple800:0x4527A0,
	DeepPurple900:0x311B92,
	DeepPurpleA100:0xB388FF,
	DeepPurpleA200:0x7C4DFF,
	DeepPurpleA400:0x651FFF,
	DeepPurpleA700:0x6200EA,

	Indigo500:0x3F51B5,
	Indigo50:0xE8EAF6,
	Indigo100:0xC5CAE9,
	Indigo200:0x9FA8DA,
	Indigo300:0x7986CB,
	Indigo400:0x5C6BC0,
	Indigo500:0x3F51B5,
	Indigo600:0x3949AB,
	Indigo700:0x303F9F,
	Indigo800:0x283593,
	Indigo900:0x1A237E,
	IndigoA100:0x8C9EFF,
	IndigoA200:0x536DFE,
	IndigoA400:0x3D5AFE,
	IndigoA700:0x304FFE,

	Blue500:0x2196F3,
	Blue50:0xE3F2FD,
	Blue100:0xBBDEFB,
	Blue200:0x90CAF9,
	Blue300:0x64B5F6,
	Blue400:0x42A5F5,
	Blue500:0x2196F3,
	Blue600:0x1E88E5,
	Blue700:0x1976D2,
	Blue800:0x1565C0,
	Blue900:0x0D47A1,
	BlueA100:0x82B1FF,
	BlueA200:0x448AFF,
	BlueA400:0x2979FF,
	BlueA700:0x2962FF,

	LightBlue500:0x03A9F4,
	LightBlue50:0xE1F5FE,
	LightBlue100:0xB3E5FC,
	LightBlue200:0x81D4FA,
	LightBlue300:0x4FC3F7,
	LightBlue400:0x29B6F6,
	LightBlue500:0x03A9F4,
	LightBlue600:0x039BE5,
	LightBlue700:0x0288D1,
	LightBlue800:0x0277BD,
	LightBlue900:0x01579B,
	LightBlueA100:0x80D8FF,
	LightBlueA200:0x40C4FF,
	LightBlueA400:0x00B0FF,
	LightBlueA700:0x0091EA,

	Cyan500:0x00BCD4,
	Cyan50:0xE0F7FA,
	Cyan100:0xB2EBF2,
	Cyan200:0x80DEEA,
	Cyan300:0x4DD0E1,
	Cyan400:0x26C6DA,
	Cyan500:0x00BCD4,
	Cyan600:0x00ACC1,
	Cyan700:0x0097A7,
	Cyan800:0x00838F,
	Cyan900:0x006064,
	CyanA100:0x84FFFF,
	CyanA200:0x18FFFF,
	CyanA400:0x00E5FF,
	CyanA700:0x00B8D4,

	Teal500:0x009688,
	Teal50:0xE0F2F1,
	Teal100:0xB2DFDB,
	Teal200:0x80CBC4,
	Teal300:0x4DB6AC,
	Teal400:0x26A69A,
	Teal500:0x009688,
	Teal600:0x00897B,
	Teal700:0x00796B,
	Teal800:0x00695C,
	Teal900:0x004D40,
	TealA100:0xA7FFEB,
	TealA200:0x64FFDA,
	TealA400:0x1DE9B6,
	TealA700:0x00BFA5,

	Green500:0x4CAF50,
	Green50:0xE8F5E9,
	Green100:0xC8E6C9,
	Green200:0xA5D6A7,
	Green300:0x81C784,
	Green400:0x66BB6A,
	Green500:0x4CAF50,
	Green600:0x43A047,
	Green700:0x388E3C,
	Green800:0x2E7D32,
	Green900:0x1B5E20,
	GreenA100:0xB9F6CA,
	GreenA200:0x69F0AE,
	GreenA400:0x00E676,
	GreenA700:0x00C853,

	LightGreen500:0x8BC34A,
	LightGreen50:0xF1F8E9,
	LightGreen100:0xDCEDC8,
	LightGreen200:0xC5E1A5,
	LightGreen300:0xAED581,
	LightGreen400:0x9CCC65,
	LightGreen500:0x8BC34A,
	LightGreen600:0x7CB342,
	LightGreen700:0x689F38,
	LightGreen800:0x558B2F,
	LightGreen900:0x33691E,
	LightGreenA100:0xCCFF90,
	LightGreenA200:0xB2FF59,
	LightGreenA400:0x76FF03,
	LightGreenA700:0x64DD17,

	Lime500:0xCDDC39,
	Lime50:0xF9FBE7,
	Lime100:0xF0F4C3,
	Lime200:0xE6EE9C,
	Lime300:0xDCE775,
	Lime400:0xD4E157,
	Lime500:0xCDDC39,
	Lime600:0xC0CA33,
	Lime700:0xAFB42B,
	Lime800:0x9E9D24,
	Lime900:0x827717,
	LimeA100:0xF4FF81,
	LimeA200:0xEEFF41,
	LimeA400:0xC6FF00,
	LimeA700:0xAEEA00,

	Yellow500:0xFFEB3B,
	Yellow50:0xFFFDE7,
	Yellow100:0xFFF9C4,
	Yellow200:0xFFF59D,
	Yellow300:0xFFF176,
	Yellow400:0xFFEE58,
	Yellow500:0xFFEB3B,
	Yellow600:0xFDD835,
	Yellow700:0xFBC02D,
	Yellow800:0xF9A825,
	Yellow900:0xF57F17,
	YellowA100:0xFFFF8D,
	YellowA200:0xFFFF00,
	YellowA400:0xFFEA00,
	YellowA700:0xFFD600,

	Amber500:0xFFC107,
	Amber50:0xFFF8E1,
	Amber100:0xFFECB3,
	Amber200:0xFFE082,
	Amber300:0xFFD54F,
	Amber400:0xFFCA28,
	Amber500:0xFFC107,
	Amber600:0xFFB300,
	Amber700:0xFFA000,
	Amber800:0xFF8F00,
	Amber900:0xFF6F00,
	AmberA100:0xFFE57F,
	AmberA200:0xFFD740,
	AmberA400:0xFFC400,
	AmberA700:0xFFAB00,

	Orange500:0xFF9800,
	Orange50:0xFFF3E0,
	Orange100:0xFFE0B2,
	Orange200:0xFFCC80,
	Orange300:0xFFB74D,
	Orange400:0xFFA726,
	Orange500:0xFF9800,
	Orange600:0xFB8C00,
	Orange700:0xF57C00,
	Orange800:0xEF6C00,
	Orange900:0xE65100,
	OrangeA100:0xFFD180,
	OrangeA200:0xFFAB40,
	OrangeA400:0xFF9100,
	OrangeA700:0xFF6D00,

	DeepOrange500:0xFF5722,
	DeepOrange50:0xFBE9E7,
	DeepOrange100:0xFFCCBC,
	DeepOrange200:0xFFAB91,
	DeepOrange300:0xFF8A65,
	DeepOrange400:0xFF7043,
	DeepOrange500:0xFF5722,
	DeepOrange600:0xF4511E,
	DeepOrange700:0xE64A19,
	DeepOrange800:0xD84315,
	DeepOrange900:0xBF360C,
	DeepOrangeA100:0xFF9E80,
	DeepOrangeA200:0xFF6E40,
	DeepOrangeA400:0xFF3D00,
	DeepOrangeA700:0xDD2C00,

	Brown500:0x795548,
	Brown50:0xEFEBE9,
	Brown100:0xD7CCC8,
	Brown200:0xBCAAA4,
	Brown300:0xA1887F,
	Brown400:0x8D6E63,
	Brown500:0x795548,
	Brown600:0x6D4C41,
	Brown700:0x5D4037,
	Brown800:0x4E342E,
	Brown900:0x3E2723,

	Grey500:0x9E9E9E,
	Grey50:0xFAFAFA,
	Grey100:0xF5F5F5,
	Grey200:0xEEEEEE,
	Grey300:0xE0E0E0,
	Grey400:0xBDBDBD,
	Grey500:0x9E9E9E,
	Grey600:0x757575,
	Grey700:0x616161,
	Grey800:0x424242,
	Grey850:0x313131,
	Grey900:0x212121,
	Black:0x000000,
	White:0xFFFFFF,

	BlueGrey500:0x607D8B,
	BlueGrey50:0xECEFF1,
	BlueGrey100:0xCFD8DC,
	BlueGrey200:0xB0BEC5,
	BlueGrey300:0x90A4AE,
	BlueGrey400:0x78909C,
	BlueGrey500:0x607D8B,
	BlueGrey600:0x546E7A,
	BlueGrey700:0x455A64,
	BlueGrey800:0x37474F,
	BlueGrey900:0x263238
}

for(var key in types.colormap){
	types.colormap[key.toLowerCase()] = types.colormap[key]
}
/*
types.jstypeof = function(value){
	if(typeof value === 'string') return String
	else if (typeof value === 'number') return Number
	else if(typeof value === 'boolean') return Boolean
	else if(Array.isArray(value)) return Array
	else if(value instanceof Float32Array) return Array
	else if(value instanceof Int32Array) return Array
	else if(typeof value === 'function') return Function
	else if(typeof value === 'Date') return Date
	return Object
}*/