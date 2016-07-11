var types = exports

// generic types
types.void = {
	_name:'void'
}

types.bool = {
	_name:'bool',
	_slots:1
}

types.bvec2 = {
	_name:'bvec2',
	_slots:2,
	_array:Int32Array,
	x:types.bool,
	y:types.bool
}

types.bvec3 = {
	_name:'bvec3',
	_slots:3,
	_array:Int32Array,
	x:types.bool,
	y:types.bool,
	z:types.bool
}

types.bvec4 = {
	_name:'bvec4',
	_slots:4,
	_array:Int32Array,
	x:types.bool,
	y:types.bool,
	z:types.bool,
	w:types.bool
}

types.int = {
	_name:'int',
	_slots:1,
	_array:Int32Array,
	_cast:parseInt
}

types.vec1 = 
types.float = {
	_name:'float',
	_slots:1,
	_array:Float32Array,
	_cast:parseFloat
}

types.vec2 = {
	_name:'vec2',
	_slots:2,
	_array:Float32Array,
	x:types.float,
	y:types.float
}

types.vec3 = {
	_name:'vec3',
	_slots:3,
	_array:Float32Array,
	x:types.float,
	y:types.float,
	z:types.float
}

types.vec4 = {
	_name:'vec4',
	_slots:4,
	_array:Float32Array,
	x:types.float,
	y:types.float,
	z:types.float,
	w:types.float
}

types.mat3 = {
	_name:'mat3',
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
	_name:'mat4',
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
	_name:'gen',
	_isa:function(type){
		return true
	}
}

types.genorfloat = {
	_name:'genorfloat',
	_isa:function(type){
		return true
	}
}

types.bvec = {
	_name:'bvec',
	_isa:function(type){
		return type && type._name && (type._name.indexOf('bvec') === 0|| type._name === 'bool')
	}
}

types.vec = {
	_name:'vec',
	_isa:function(type){
		return type && type._name && (type._name.indexOf('vec') === 0 || type._name === 'float')
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