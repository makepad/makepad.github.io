var service = require('services/painter')
var types = require('types')
var bus = service.bus

var Painter = require('class').extend(function Painter(proto){
	require('events')(proto)
})
var painter = module.exports = new Painter()

// initialize w/h
var args = service.args
painter.w = args.w
painter.h = args.h
painter.pixelratio = args.pixelratio

bus.onMessage = function(msg){
	if(msg.fn === 'atResize'){
		painter.w = msg.w
		painter.h = msg.h
		painter.pixelratio = msg.pixelratio
	}
	if(painter[msg.fn]) painter[msg.fn](msg)
}

painter.sync = function(){
	// we send the painter a request for a 'sync'
	// if there is still a previous sync waiting we wait till thats fired
	bus.postMessage({
		fn:'sync'
	})
}

var nameIds = {}
var nameIdsAlloc = 1

function newName(name){

	var nameId = nameIds[name] = nameIdsAlloc++
	bus.postMessage({
		fn:'newName',
		name: name,
		nameId: nameId
	})
	return nameId
}

var todoIdsAlloc = 1
var todoIds = {}

painter.nameId = function(name){
	var nameId = nameIds[name]
	if(nameId) return nameId
	return newName(name)
}

painter.Todo = require('class').extend(function Todo(proto){

	proto.initalloc = 256

	proto.onConstruct = function(initalloc, painter){

		var todoId = todoIdsAlloc++

		bus.postMessage({
			fn:'newTodo',
			todoId:todoId
		})
		this.painter = painter
		this.offset = 0
		this.last = -1
		this.ended = false
		this.allocated = initalloc || this.initalloc
		this.todoId = todoId
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)

		// store the todo
		todoIds[todoId] = this
	}

	proto.beginTodo = function(){
		this.ended = false
		this.offset = 0
		this.deps = {}
		this.last = -1
	}

	proto.endTodo = function(){
		this.ended = true
		// sync our todo
		bus.batchMessage({
			fn:'updateTodo',
			deps:this.deps,
			todoId:this.todoId,
			buffer:this.f32.buffer,
			length:this.offset
		})
	}

	proto.useShader = function(shader){
		var o = (this.last = this.offset)
		if((this.offset += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 2
		i32[o+1] = 1
		i32[o+2] = shader.shaderId
	}

	proto.attributes = function(startnameid, range, mesh, offset, stride){

		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32
		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh.self)
		}
		i32[o+0] = 3
		i32[o+1] = 5
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.self.meshId
		i32[o+5] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+6] = offset
	}

	proto.instances = function(startnameid, range, mesh, divisor, offset, stride){

		var o = (this.last = this.offset)
		if((this.offset += 8) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh.self)
		}

		i32[o+0] = 4
		i32[o+1] = 6
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.self.meshId
		i32[o+5] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+6] = offset
		i32[o+7] = divisor || 1
	}

	proto.indexes = function(nameId, mesh){

		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh.self)
		}

		i32[o+0] = 7
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = mesh.self.meshId
	}

	proto.sampler = function(nameId, texture, sam){
		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32

		if(texture.dirty){
			texture.dirty = false
			bus.batchMessage(texture.self)
		}

		// lets check if texture is a Framebuffer
		var isfb = 0
		if(texture.isFramebuffer){
			// make a dep-ref on our todo root
			this.root.deps[texture.self.texId] = true
			isfb = 1
		}

		i32[o+0] = 8
		i32[o+1] = 4
		i32[o+2] = nameId
		i32[o+3] = isfb
		i32[o+4] = texture.self.texId
		i32[o+5] = (sam.minfilter<<0) | (sam.magfilter<<4) | (sam.wraps<<8)| (sam.wrapt<<12) //(sampler.minfilter<<0) | (sampler.magfilter<<4) | (sampler.wraps<<8)| (sampler.wrapt<<12)
	}

	proto.int = function(nameId, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 10
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = x
	}

	proto.float = function(nameId, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 11
		i32[o+1] = 2
		i32[o+2] = nameId
		f32[o+3] = x
	}

	proto.vec2 = function(nameId, v){
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 12
		i32[o+1] = 3
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	proto.vec3 = function(nameId, v){
		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 13
		i32[o+1] = 4
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	proto.vec4 = function(nameId, v){ // id:6
		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 14
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	proto.mat4 = function(nameId, m){
		var o = (this.last = this.offset)
		if((this.offset += 19) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 15
		i32[o+1] = 17
		i32[o+2] = nameId
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

	proto.intGlobal = function(nameId, x){
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 20
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = x
	}


	proto.floatGlobal = function(nameId, x){ // id:3
		var o = (this.last = this.offset)
		if((this.offset += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 21
		i32[o+1] = 2
		i32[o+2] = nameId
		f32[o+3] = x
	}

	proto.vec2Global = function(nameId, v){ // id:4
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 22
		i32[o+1] = 3
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	proto.vec3Global = function(nameId, v){ // id:5
		var o = (this.last = this.offset)
		if((this.offset += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 23
		i32[o+1] = 4
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	proto.vec4Global = function(nameId, v){ // id:6
		var o = (this.last = this.offset)
		if((this.offset += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 24
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	proto.globalMat4 = function(nameId, m){
		var o = (this.last = this.offset)
		if((this.offset += 19) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 25
		i32[o+1] = 17
		i32[o+2] = nameId
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

	proto.drawTriangles = function(from, to, instances){ // id:10
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 30
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.drawLines = function(from, to, instances){ // id:11
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 31
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.drawLineLoop = function(from, to, instances){ // id:12
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 32
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.drawLineStrip = function(from, to, instances){ // id:13
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 33
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.drawTriangleStrip = function(from, to, instances){ // id:14
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var a = this.i32
		
		i32[o+0] = 34
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.drawTriangleFan = function(from, to, instances){ // id:15
		var o = (this.last = this.offset)
		if((this.offset += 5) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 35
		i32[o+1] = 3
		i32[o+2] = from || -1
		i32[o+3] = to || -1
		i32[o+4] = instances || -1
	}

	proto.clearColor = function(red, green, blue, alpha){ // id:0
		// patch previous
		if(this.last >= 0 && this.i32[this.last] === 40){
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

		i32[o+0] = 40 // id
		i32[o+1] = 7 // args
		i32[o+2] = 1
		f32[o+3] = red
		f32[o+4] = green
		f32[o+5] = blue
		f32[o+6] = alpha
	}

	proto.clearDepth = function(depth){ // id:0
		// patch previous
		if(this.last >= 0 && this.array[this.last] === 40){
			var o = this.last
			var i32 = this.i32, f32 = this.f32
			i32[o+2] |= 2
			f32[o+7] = depth
			return
		}

		var o = (this.last = this.offset) 
		if((this.offset += 9) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 40 // id
		i32[o+1] = 7 // args
		i32[o+2] = 2
		f32[o+7] = depth
	}

	proto.clearStencil = function(stencil){
		// patch previous
		if(this.last >= 0 && this.array[this.last] === 40){
			var o = this.last 
			var i32 = this.i32
			i32[o+2] |= 4
			i32[o+8] = stencil
			return
		}

		var o = (this.last = this.offset) + 2
		if((this.offset += 9) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 40 // id
		i32[o+1] = 7 // args
		i32[o+2] = 4
		i32[o+8] = stencil
	}
	// array is src, fn, dest, alphasrc, alphafn, alphadest
	proto.blending = function(array, color){

		var o = (this.last = this.offset)
		if((this.offset += 12) > this.allocated) this.resize()

		var i32 = this.i32
		var f32 = this.f32
		i32[o+0] = 41
		i32[o+1] = 10
		i32[o+2] = array[0]
		i32[o+3] = array[1]
		i32[o+4] = array[2]
		i32[o+5] = array[3] || array[0]
		i32[o+6] = array[4] || array[1]
		i32[o+7] = array[5] || array[2]
		if(color){
			f32[o+8] = color[0]
			f32[o+9] = color[1]
			f32[o+10] = color[2]
			f32[o+11] = color[3]
		}
	}

	proto.addTodo = function(todo){ // id: 20
		var o = (this.last = this.offset)
		if((this.offset += 3) > this.allocated) this.resize()
		var a = this.i32

		i32[o+0] = 50
		i32[o+1] = 1
		i32[o+2] = todo.todoId
		todo.root = this.root
	}
/*
	proto.runTodo = function(){
		if(!this.ended) this.endTodo()
		// the commandset and overload uniform sets
		bus.batchMessage({
			fn: 'runTodo',
			todoId:this.todoId
		})
	}*/
})

var shaderIds = {}
var shaderIdsAlloc = 1

// blending sources
painter.ZERO = 0x0
painter.ONE = 0x1
painter.SRC_COLOR = 0x300
painter.ONE_MINUS_SRC_COLOR = 0x301
painter.SRC_ALPHA = 0x302
painter.ONE_MINUS_SRC_ALPHA = 0x303
painter.DST_ALPHA = 0x304 
painter.ONE_MINUS_DST_ALPHA = 0x305
painter.DST_COLOR = 0x306 
painter.ONE_MINUS_DST_COLOR = 0x307
painter.SRC_ALPHA_SATURATE = 0x308
painter.CONSTANT_COLOR = 0x8001
painter.ONE_MINUS_CONSTANT_COLOR = 0x8002

// blending function
painter.FUNC_SUBTRACT = 0x800a
painter.FUNC_REVERSE_SUBTRACT = 0x800b
painter.FUNC_ADD = 0x8006
painter.MIN = 0x8007
painter.MAX = 0x8008

painter.Shader = require('class').extend(function Shader(proto){

	// default code
	proto.code = {
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

	proto.onConstruct = function(code){
		if(!code) code = this.code

		var shaderId = shaderIdsAlloc++

		var refs = {}

		parseShaderAttributes(code.vertex, refs)
		parseShaderUniforms(code.vertex, refs)
		parseShaderUniforms(code.pixel, refs)
		for(var name in refs) if(!nameIds[name]) newName(name)

		bus.postMessage({
			fn:'newShader',
			code:{
				vertex:code.vertex,
				pixel:code.pixel
			},
			shaderId:shaderId
		})

		this.shaderId = shaderId
		this.code = code

		shaderIds[shaderId] = this
	}
})

var meshIdsAlloc = 1
var meshIds = {}

//painter.ids = nameIds

painter.Mesh = require('class').extend(function Mesh(proto){

	proto.onConstruct = function(type, initalloc){
		var slots = 0
		if(typeof type === 'number'){
			slots = type
			type = types.float
		}

		if(!type) debugger

		if(!initalloc) alloc = this.initalloc

		var meshId = meshIdsAlloc++

		bus.postMessage({
			fn:'newMesh',
			meshId:meshId
		})

		this.type = type
		this.arraytype = type.array
		this.slots = slots || type.slots

		this.allocated = 0
		this.self = {
			fn: 'updateMesh',
			meshId: meshId,
			array: undefined,
			length: 0
		}
		if(initalloc){
			this.allocated = initalloc
			this.self.array = new this.arraytype(initalloc * this.slots)
		}
	}

	proto.type = types.vec4
	proto.initalloc = 1024

	proto.alloc = function(newlength){
		this.allocated = newlength > this.allocated * 2? newlength: this.allocated * 2
		var newarray = new this.arraytype(this.allocated * this.slots)
		var oldarray = this.self.array
		for(var i = 0, len = this.self.length * this.slots; i < len; i++){
			newarray[i] = oldarray[i]
		}
		this.self.array = newarray
	}

	proto.push = function(){
		var arglen = arguments.length
		var argtuples = arglen / this.slots

		if(arglen%this.slots){
			throw new Error('push alignment error, got: '+arglen+' arguments instead of a multiple of '+this.slots)
		}
		// resize it
		var newlength = this.self.length + argtuples
		if(newlength > this.allocated) this.alloc(newlength)
		// copy it in
		var array = this.self.array
		var off = this.self.length * this.slots

		for(var i = 0; i < arglen; i++){
			array[off + i] = arguments[i]
		}

		this.dirty = true
		this.self.length = newlength

		return this
	}

	proto.pushQuad = function(){

		var arglen = arguments.length
		
		if(arglen !== this.slots * 4){
			throw new Error('pushquad needs '+(4*this.slots)+' arguments, got: '+arglen+' arguments instead of a multiple of '+this.slots)
		}

		var newlength = this.self.length + 6
		if(newlength > this.allocated) this.alloc(newlength)

		// copy it in
		var array = this.self.array
		var off = this.self.length * this.slots
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
			array[off + i + 5 * slots] = arguments[i + 3 * slots]
		}

		this.dirty = true
		this.self.length = newlength
		return this
	}
})

// min/magfilter values
painter.NEAREST = 1
painter.LINEAR = 2
painter.NEAREST_MIPMAP_NEAREST = 3
painter.LINEAR_MIPMAP_NEAREST = 4
painter.NEAREST_MIPMAP_LINEAR = 5
painter.LINEAR_MIPMAP_LINEAR = 6

// wraps/t values
painter.REPEAT = 10
painter.CLAMP_TO_EDGE = 11
painter.MIRRORED_REPEAT = 12

// texture buffer type flags
painter.RGB = 1 << 0
painter.ALPHA = 1 << 1
painter.RGBA = painter.RGB|painter.ALPHA
painter.DEPTH = 1 << 2
painter.STENCIL = 1 << 3
painter.LUMINANCE = 1 << 4

// data type flags
painter.UNSIGNED_BYTE = 1<<8
painter.FLOAT = 1 << 9
painter.HALF_FLOAT = 1<<10
painter.FLOAT_LINEAR = 1 << 11
painter.HALF_FLOAT_LINEAR = 1 << 12

// other flags
painter.FLIP_Y = 1<<16
painter.PREMULTIPLY_ALPHA = 1<<17
painter.CUBEMAP = 1<<19

// prefab sampler types
painter.SAMPLER2DNEAREST = {
	type: types.sampler2D,
	minfilter: painter.NEAREST,
	magfilter: painter.NEAREST,
	wraps: painter.CLAMP_TO_EDGE,
	wrapt: painter.CLAMP_TO_EDGE
}

painter.SAMPLER2DLINEAR = {
	type: types.sampler2D,
	minfilter: painter.LINEAR,
	magfilter: painter.LINEAR,
	wraps: painter.CLAMP_TO_EDGE,
	wrapt: painter.CLAMP_TO_EDGE
}

var textureIdsAlloc = 1
var textureIds = {}

painter.Texture = require('class').extend(function Texture(proto){
	var Texture = proto.constructor
	
	proto.onConstruct = function(flags, w, h, array){
		var texId = textureIdsAlloc++
		textureIds[texId] = this

		this.self = {
			fn:'newTexture',
			flags:flags,
			w:w,
			h:h,
			array:array,
			texId:texId
		}

		bus.batchMessage(this.self)
	}
})

var framebufferIdsAlloc = 1
var framebufferIds = {}

painter.Framebuffer = require('class').extend(function Framebuffer(proto){

	proto.onConstruct = function(attachments){
		var fbId = framebufferIdsAlloc ++
		framebufferIds[fbId] = this

		var attach 

		for(var key in attachments){
			if(!attach) attach = {}
			texture = attachments[key]
			attach[key] = texture.self.texId
		}

		this.self = {
			fn:'newFramebuffer',
			fbId:fbId,
			attach:attach
		}

		bus.batchMessage(this.self)
	}
	
	proto.isFramebuffer = true
	
	// attach a todo to the framebuffer
	// the main framebuffer is the first 
	proto.attachTodo = function(todo){
		bus.batchMessage({
			fn:'attachFramebufferTodo',
			fbId:this.self.fbId,
			todoId:todo.todoId
		})
	}
})
// create the main framebuffer
painter.mainFramebuffer = new painter.Framebuffer()

// allocate 2 nameIds for
painter.nameId('painterPickPass')
painter.nameId('painterPickMat4')

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