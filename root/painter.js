var service = require('services/painter')
var types = require('types')
var bus = service.bus

var Painter = require('class').extend(function Painter(){
	require('events').call(this)
})
var painter = module.exports = new Painter()

// initialize w/h
var args = service.args
painter.w = args.w
painter.h = args.h
painter.pixelratio = args.pixelratio

bus.onmessage = function(msg){
	if(msg.fn === 'atResize'){
		painter.w = msg.w
		painter.h = msg.h
		painter.pixelratio = msg.pixelratio
	}
	if(painter[msg.fn]) painter[msg.fn](msg)
}

painter.syncDraw = function(){
	// we send the painter a request for a 'sync'
	// if there is still a previous sync waiting we wait till thats fired
	bus.postMessage({
		fn:'syncDraw'
	})
}

var nameids = {}
var nameidsalloc = 1

function newName(name){

	var nameid = nameids[name] = nameidsalloc++
	bus.postMessage({
		fn:'newName',
		name: name,
		nameid: nameid
	})
	return nameid
}

var todoidsalloc = 1
var todoids = {}

painter.nameid = function(name){
	var nameid = nameids[name]
	if(nameid) return nameid
	return newName(name)
}

painter.Todo = require('class').extend(function Todo(){

	this.initalloc = 256

	this.onconstruct = function(initalloc, painter){

		var todoid = todoidsalloc++

		bus.postMessage({
			fn:'newTodo',
			todoid:todoid
		})
		this.painter = painter
		this.offset = 0
		this.last = -1
		this.ended = false
		this.allocated = initalloc || this.initalloc
		this.todoid = todoid
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)

		// store the todo
		todoids[todoid] = this
	}

	this.beginTodo = function(){
		this.ended = false
		this.offset = 0
		this.last = -1
	}

	this.endTodo = function(){
		this.ended = true
		// sync our todo
		bus.batchMessage({
			fn:'updateTodo',
			todoid:this.todoid,
			buffer:this.f32.buffer,
			length:this.offset
		})
	}

	this.clearColor = function(red, green, blue, alpha){ // id:0
		// patch previous
		if(this.last >= 0 && this.i32[this.last] === 1){
			var o = this.last
			var i32 = this.i32, f32 = this.f32
			i32[o+2] |= 1
			f32[o+3] = red
			f32[o+4] = green
			f32[o+5] = blue
			f32[o+6] = alpha
			return
		}
		if(this.offset == 0)

		var o = (this.last = this.offset) 
		if((this.offset += 9) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 1 // id
		i32[o+1] = 7 // args
		i32[o+2] = 1
		f32[o+3] = red
		f32[o+4] = green
		f32[o+5] = blue
		f32[o+6] = alpha
	}

	this.clearDepth = function(depth){ // id:0
		// patch previous
		if(this.last >= 0 && this.array[this.last] === 1){
			var o = this.last
			var i32 = this.i32, f32 = this.f32
			i32[o+2] |= 2
			f32[o+7] = depth
			return
		}

		var o = (this.last = this.offset) 
		if((this.offset += 9) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 1 // id
		i32[o+1] = 7 // args
		i32[o+2] = 2
		f32[o+7] = depth
	}

	this.clearStencil = function(stencil){
		// patch previous
		if(this.last >= 0 && this.array[this.last] === 1){
			var o = this.last 
			var i32 = this.i32
			i32[o+2] |= 4
			i32[o+8] = stencil
			return
		}

		var o = (this.last = this.offset) + 2
		if((this.offset += 9) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 1 // id
		i32[o+1] = 7 // args
		i32[o+2] = 4
		i32[o+8] = stencil
	}

	this.useShader = function(shader){
		var o = (this.last = this.offset)
		if((this.offset += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 2
		i32[o+1] = 1
		i32[o+2] = shader.shaderid
	}

	this.attribute = function(nameid, mesh, offset, stride){

		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh.updatemsg)
		}

		i32[o+0] = 3
		i32[o+1] = 4
		i32[o+2] = nameid
		i32[o+3] = mesh.meshid
		i32[o+4] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+5] = offset || 0
	}

	this.attributes = function(startnameid, range, mesh){

		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh.updatemsg)
		}

		i32[o+0] = 4
		i32[o+1] = 5
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+3] = mesh.meshid
		i32[o+4] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+5] = offset || 0
	}

	this.int = function(nameid, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 10
		i32[o+1] = 2
		i32[o+2] = nameid
		i32[o+3] = x
	}

	this.float = function(nameid, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 11
		i32[o+1] = 2
		i32[o+2] = nameid
		f32[o+3] = x
	}

	this.vec2 = function(nameid, v){
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 12
		i32[o+1] = 3
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	this.vec3 = function(nameid, v){
		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 13
		i32[o+1] = 4
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	this.vec4 = function(nameid, v){ // id:6
		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 14
		i32[o+1] = 5
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	this.mat4 = function(nameid, m){
		var o = (this.last = this.offset)
		if((this.offset += 19) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 15
		i32[o+1] = 17
		i32[o+2] = nameid
		f32[o+3] = m[0]
		f32[o+4] = m[1]
		f32[o+5] = m[2]
		f32[o+6] = m[3]
		f32[o+7] = m[4]
		f32[o+8] = m[5]
		f32[o+9] = m[6]
		f32[o+10] = m[7]
		f32[o+11] = m[8]
		f32[o+12] = m[9]
		f32[o+13] = m[10]
		f32[o+14] = m[11]
		f32[o+15] = m[12]
		f32[o+16] = m[13]
		f32[o+17] = m[14]
		f32[o+18] = m[15]
	}

	this.intGlobal = function(nameid, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 20
		i32[o+1] = 2
		i32[o+2] = nameid
		i32[o+3] = x
	}


	this.floatGlobal = function(nameid, x){ // id:3
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 21
		i32[o+1] = 2
		i32[o+2] = nameid
		f32[o+3] = x
	}

	this.vec2Global = function(nameid, v){ // id:4
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 22
		i32[o+1] = 3
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	this.vec3Global = function(nameid, v){ // id:5
		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 23
		i32[o+1] = 4
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	this.vec4Global = function(nameid, v){ // id:6
		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 24
		i32[o+1] = 5
		i32[o+2] = nameid
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	this.globalMat4 = function(nameid, m){
		var o = (this.last = this.offset)
		if((this.offset += 19) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 25
		i32[o+1] = 17
		i32[o+2] = nameid
		f32[o+3] = m[0]
		f32[o+4] = m[1]
		f32[o+5] = m[2]
		f32[o+6] = m[3]
		f32[o+7] = m[4]
		f32[o+8] = m[5]
		f32[o+9] = m[6]
		f32[o+10] = m[7]
		f32[o+11] = m[8]
		f32[o+12] = m[9]
		f32[o+13] = m[10]
		f32[o+14] = m[11]
		f32[o+15] = m[12]
		f32[o+16] = m[13]
		f32[o+17] = m[14]
		f32[o+18] = m[15]
	}

	this.drawTriangles = function(from, to){ // id:10
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 30
		i32[o+1] = 2
		i32[o+2] = from || 0
		i32[o+3] = to || 3
	}

	this.drawLines = function(from, to){ // id:11
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 31
		i32[o+1] = 2
		i32[o+2] = from || 0
		i32[o+3] = to || 3
	}

	this.drawLineLoop = function(from, to){ // id:12
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 32
		i32[o+1] = 2
		i32[o+2] = from || 0
		i32[o+3] = to || 3
	}

	this.drawLineStrip = function(from, to){ // id:13
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 33
		i32[o+1] = 2
		i32[o+2] = from || 0
		i32[o+3] = to || 3
	}

	this.drawTriangleStrip = function(from, to){ // id:14
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var a = this.i32
		
		i32[o+0] = 34
		i32[o+1] = 2
		i32[o+2] = from || 0
		i32[o+3] = to || 3
	}

	this.drawTriangleFan = function(){ // id:15
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 35
		i32[o+1] = 2
		i32[o+2] = 0
		i32[o+3] = 3
	}

	this.addTodo = function(todo){ // id: 20
		var o = (this.last = this.offset)
		if((this.offset += 3) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 40
		i32[o+1] = 1
		i32[o+2] = todo.todoid
	}

	this.runTodo = function(){
		if(!this.ended) this.endTodo()
		// the commandset and overload uniform sets
		bus.batchMessage({
			fn: 'runTodo',
			todoid:this.todoid
		})
	}
})

var shaderids = {}
var shaderidsalloc = 1

painter.Shader = require('class').extend(function Shader(){

	// default code
	this.code = {
		pixel:
			"uniform vec2 prop;\n"+
			"void main(){\n"+
			"	gl_FragColor = vec4(0., prop.x, 0., 1.);\n"+
			"}\n",
		vertex:
			"attribute vec2 mesh;\n"+
			"void main(){\n"+
			"	gl_Position = vec4(mesh.x, mesh.y, 0, 1.);\n"+
			"}\n"
	}

	this.onconstruct = function(code){
		if(!code) code = this.code

		var shaderid = shaderidsalloc++

		var refs = {}

		parseShaderAttributes(code.vertex, refs)
		parseShaderUniforms(code.vertex, refs)
		parseShaderUniforms(code.pixel, refs)
		for(var name in refs) if(!nameids[name]) newName(name)

		bus.postMessage({
			fn:'newShader',
			code:{
				vertex:code.vertex,
				pixel:code.pixel
			},
			shaderid:shaderid
		})

		this.shaderid = shaderid
		this.code = code

		shaderids[shaderid] = this
	}
})

var meshidsalloc = 1
var meshids = {}

painter.ids = nameids

painter.Mesh = require('class').extend(function Mesh(){

	this.onconstruct = function(struct, initalloc){
		var slots = 0
		if(typeof struct === 'number'){
			slots = struct
			struct = types.float
		}
		if(!struct) struct = this.struct

		if(!initalloc) alloc = this.initalloc

		var meshid = meshidsalloc++

		bus.postMessage({
			fn:'newMesh',
			meshid:meshid
		})

		this.struct = struct
		this.arraytype = types.getArray(struct)
		this.slots = slots || types.getSlots(struct)
		this.allocated = 0
		this.length = 0
		this.updatemsg = {
			fn: 'updateMesh',
			meshid: meshid,
			array: undefined,
			length: 0
		}
		if(initalloc){
			this.allocated = initalloc
			this.array = this.msg.array = new this.arraytype(initalloc * this.slots)
		}
	}

	this.struct = types.vec4
	this.initalloc = 1024

	this.alloc = function(newlength){
		this.allocated = newlength > this.allocated * 2? newlength: this.allocated * 2
		var newarray = new this.arraytype(this.allocated * this.slots)
		var oldarray = this.array
		for(var i = 0, len = this.length * this.slots; i < len; i++){
			newarray[i] = oldarray[i]
		}
		this.updatemsg.array = this.array = newarray
	}

	this.push = function(){
		var arglen = arguments.length
		var argtuples = arglen / this.slots

		if(arglen%this.slots){
			throw new Error('push alignment error, got: '+arglen+' arguments instead of a multiple of '+this.slots)
		}
		// resize it
		var newlength = this.length + argtuples
		if(newlength > this.allocated) this.alloc(newlength)
		// copy it in
		var array = this.array
		var off = this.length * this.slots

		for(var i = 0; i < arglen; i++){
			array[off + i] = arguments[i]
		}

		this.dirty = true
		this.updatemsg.length = this.length = newlength

		return this
	}

	this.pushQuad = function(){

		var arglen = arguments.length
		
		if(arglen !== this.slots * 4){
			throw new Error('pushquad needs '+(4*this.slots)+' arguments, got: '+arglen+' arguments instead of a multiple of '+this.slots)
		}

		var newlength = this.length + 6
		if(newlength > this.allocated) this.alloc(newlength)

		// copy it in
		var array = this.array
		var off = this.length * this.slots
		var slots = this.slots

		for(var i = 0, len = this.slots; i < len; i++){
			// TL
			array[off + i] = arguments[i]
			// TR
			array[off + i + 1 * slots] = 
			array[off + i + 3 * slots] = arguments[i + slots]
			// BL
			array[off + i + 2 * slots] = 
			array[off + i + 4 * slots] = arguments[i + 2 * slots]
			// BR
			array[off + i + 2 * slots] = 
			array[off + i + 4 * slots] = arguments[i + 3 * slots]
		}

		this.dirty = true
		this.updatemsg.length = this.length = newlength

		return this
	}
})

function parseShaderUniforms(code, obj){
	obj = obj || {}
	code.replace(/uniform\s*(\S+)\s+(\S+);/g, function(m, type, name){
		obj[name] = type
	})
	return obj
}

function parseShaderAttributes(code, obj){
	obj = obj || {}
	code.replace(/attribute\s*(\S+)\s+(\S+);/g, function(m, type, name){
		obj[name] = type
	})
	return obj
}