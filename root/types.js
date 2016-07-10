var types = exports

// generic types
types.void = {
	_type:'void'
}

types.bool = {
	_type:'bool',
	_slots:1
}

types.bvec2 = {
	_type:'bvec2',
	_slots:2,
	_array:Int32Array,
	x:types.bool,
	y:types.bool
}

types.bvec3 = {
	_type:'bvec3',
	_slots:3,
	_array:Int32Array,
	x:types.bool,
	y:types.bool,
	z:types.bool
}

types.bvec4 = {
	_type:'bvec4',
	_slots:4,
	_array:Int32Array,
	x:types.bool,
	y:types.bool,
	z:types.bool,
	w:types.bool
}

types.int = {
	_type:'int',
	_slots:1,
	_array:Int32Array,
	_cast:parseInt
}

types.float = {
	_type:'float',
	_slots:1,
	_array:Float32Array,
	_cast:parseFloat
}

types.vec2 = {
	_type:'vec2',
	_slots:2,
	_array:Float32Array,
	x:types.float,
	y:types.float
}

types.vec3 = {
	_type:'vec3',
	_slots:3,
	_array:Float32Array,
	x:types.float,
	y:types.float,
	z:types.float
}

types.vec4 = {
	_type:'vec4',
	_slots:4,
	_array:Float32Array,
	x:types.float,
	y:types.float,
	z:types.float,
	w:types.float
}

types.mat3 = {
	_type:'mat3',
	_slots:9,
	_array:Float32Array,
	a:types.float,
	b:types.float,
	c:types.float,

	d:types.float,	
	e:types.float,
	f:types.float,

	g:types.float,
	h:types.float,	
	i:types.float,
}

types.mat4 = {
	_type:'mat4',
	_slots:16,
	_array:Float32Array,
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
}

types.gen = {
	_type:'gen',
	_isa:function(type){
		return true
	}
}

types.genorfloat = {
	_type:'genorfloat',
	_isa:function(type){
		return true
	}
}

types.bvec = {
	_type:'bvec',
	_isa:function(type){
		return type && type._type && (type._type.indexOf('bvec') === 0|| type._type === 'bool')
	}
}

types.vec = {
	_type:'vec',
	_isa:function(type){
		return type && type._type && (type._type.indexOf('vec') === 0 || type._type === 'float')
	}
}

types.genopt = Object.create(types.gen)
types._optional = true

types.floatopt = Object.create(types.float)
types._optional = true

types.getArray = function getArray(struct){
	if(struct._array) return struct._array
	for(var key in struct){
		if(key.charCodeAt(0) === 95) continue
		var sub = getArray(struct[key])
		if(sub) return sub
	}
}

types.getSlots = function getSlots(struct){
	if(struct._slots) return struct._slots
	var total = 0
	for(var key in struct){
		if(key.charCodeAt(0) === 95) continue
		total += getSlots(struct[key])
	}
	return total || 1
}

// value to type conversion, used for attribute mapping
types.fromvalue = function(value){
	if(typeof value === 'number') return types.float
	if(typeof value === 'boolean') return types.float
	if(typeof value === 'string') return types.vec4
	if(typeof value === 'object'){
		if(value._type) return value
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