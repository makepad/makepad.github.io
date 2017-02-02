// serialization buffers
var persistIds = new WeakMap()
var persistId = 1

function resize(buf, delta){
	var req = buf.off + delta
	var newsize = buf.size

	while(req>=newsize) newsize = newsize * 2

	var nu32 = new Uint32Array(newsize)
	var nf64 = new Float64Array(nu32.buffer)
	var f64 = buf.f64

	for(let i = 0, l = buf.size>>1; i < l; i++){
		nf64[i] = f64[i]
	}

	buf.size = newsize
	buf.f64 = nf64
	buf.u32 = nu32
	buf.u16 = new Uint16Array(nu32.buffer)
}

var types = exports.types = {
	ref:1,
	undefined:2,
	null:3,
	number:4,
	boolean:5,
	string:6,
	function:7,
	array:8,
	object:9,
	map:10,
	set:11,
	weakmap:12,
	weakset:13,
	arraybuffer:14,
	storeproxy:15
}

function serialize(buf, value){
	if(value === undefined){
		if(buf.off >= buf.size) resize(buf, 1)
		buf.u32[buf.off++] = 2
		return
	}
	if(value === null){
		if(buf.off >= buf.size) resize(buf.off)
		buf.u32[buf.off++] = 3
		return
	}
	if(typeof value === 'number'){
		if(buf.off+4>=buf.size) resize(buf, 4)
		buf.u32[buf.off++] = 4
		if(buf.off&1) buf.off ++
		buf.f64[buf.off>>1] = value, buf.off += 2
		return
	}
	if(typeof value === 'boolean'){
		if(buf.off + 1 >= buf.size) resize(buf, 1)
		buf.u32[buf.off++] = 5
		buf.u32[buf.off++] = value?1:0
		return
	}
	if(typeof value === 'string'){
		var l = value.length
		if(buf.off + l >= buf.size) resize(buf, l)
		buf.u32[buf.off++] = 6		
		buf.u32[buf.off++] = l
		var o = buf.off<<1
		var u16 = buf.u16
		for(var i = 0; i < l; i++){
			u16[o++] = value.charCodeAt(i)
		}
		if(o&1)o++
		buf.off = o>>1
		return
	}
	if(typeof value === 'function'){
		var off = buf.weak.get(value)
		if(off !== undefined){
			if(buf.off + 1 >= buf.size) resize(buf, 1)
			buf.u32[buf.off++] = 1 // id ref
			buf.u32[buf.off++] = off
			return
		}
		buf.weak.set(value, buf.off)

		var str = value.toString()
		var l = str.length
		if(buf.off + l >= buf.size) resize(buf, l)
		buf.u32[buf.off++] = 7	// function-as-string
		buf.u32[buf.off++] = l
		var o = buf.off<<1
		var u16 = buf.u16
		for(let i = 0; i < l; i++){
			u16[o++] = str.charCodeAt(i)
		}
		if(o&1)o++
		buf.off = o>>1
		return
	}
	if(typeof value === 'object'){
		var off = buf.weak.get(value)
		if(off !== undefined){
			if(buf.off + 1 >= buf.size) resize(prop, 1)
			buf.u32[buf.off++] = 1 // id ref
			buf.u32[buf.off++] = off
			return
		}
		buf.weak.set(value, buf.off)
		var id = persistIds.get(value)
		if(id === undefined){
			id = persistId++
			persistIds.set(value, id)
		}

		if(Array.isArray(value)){
			if(buf.off + 3 >= buf.size) resize(buf, 1)
			buf.u32[buf.off++] = 8 // array
			var bufSkip = buf.off++
			buf.u32[buf.off++] = id // object
			var l = value.length
			buf.u32[buf.off++] = l
			for(let i = 0; i < l; i++){
				serialize(buf, value[i])
			}
			buf.u32[bufSkip] = buf.off
			return
		}
		else {
			// itsa  typed array
			if(value instanceof Map){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 10 
				return

			}
			if(value instanceof Set){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 11
				return

			}
			if(value instanceof WeakMap){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 12
				return
			}
			if(value instanceof WeakSet){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 13
				return
			}
			if(value.buffer instanceof ArrayBuffer || value instanceof ArrayBuffer){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 14
				return
			}
			// what if its a proxyarray
			if('__unwrap__' in value){
				if(buf.off >= buf.size) resize(buf, 0)
				buf.u32[buf.off++] = 15
				serialize(buf, value['__unwrap__'])
				return
			}
			// lets build the prototype chain
			if(buf.off + 3 >= buf.size) resize(buf, 3)
			var proto = Object.getPrototypeOf(value)
			buf.u32[buf.off++] = 9 // object
			var bufSkip = buf.off++
			buf.u32[buf.off++] = id // object
			//console.log("HERE", buf.off, buf.u32[0])
			serialize(buf, proto)
			var keys = Object.getOwnPropertyNames(value)
			var l = keys.length
			if(buf.off >= buf.size) resize(buf, 0)
			buf.u32[buf.off++] = l

			for(var i = 0; i < l; i++){
				var key = keys[i]
				serialize(buf, key)
				var desc = Object.getOwnPropertyDescriptor(value, key)
				serialize(buf, desc.value)
			}
			buf.u32[bufSkip] = buf.off
			return
		}
	}

	// nothing?
	if(buf.off >= size) resize(buf.off)
	buf.u32[buf.off++] = 0
	return
}

var profIds = {}
function profile(id){
	var last = profIds[id]
	if(last !== undefined){
		console.log("Profile: "+(performance.now()-last))
		profIds[id] = undefined
	}
	else{
		profIds[id] = performance.now()
	}
}

function log(v){
	var stack = module.worker.decodeException(new Error())
	
	// serialize v over the worker boundary using a typed array
	var u32 = new Uint32Array(128)
	
	var buf = {
		size: 128,
		off: 0,
		u32: u32,
		u16: new Uint16Array(u32.buffer),
		f64: new Float64Array(u32.buffer),
		weak: new WeakMap()
	}
	
	serialize(buf, v)
	// ok lets transfer this buffer to the main thread
	//console.log(buf.u32[1])
	module.worker.postMessage({
		$:'worker1',
		msg:{
			fn:'onLog',
			stack:stack,
			data:buf.u32.buffer
		}
	},[buf.u32.buffer])
}

// lets define _ 
module.worker.defineGlobal('_', function(){return profile}, log)

