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
painter.pixelRatio = args.pixelRatio
painter.timeBoot = args.timeBoot

bus.onMessage = function(msg){
	if(msg.fn === 'onResize'){
		painter.w = msg.w
		painter.h = msg.h
		painter.pixelRatio = msg.pixelRatio
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

painter.nameId = function(name){
	var nameId = nameIds[name]
	if(nameId) return nameId
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

painter.onScrollTodo = function(msg){
	var todo = todoIds[msg.todoId]
	if(todo && todo.onScroll) todo.onScroll(msg.x, msg.y)
}

painter.Todo = require('class').extend(function Todo(proto){

	proto.initalloc = 256

	proto.onConstruct = function(initalloc){

		var todoId = todoIdsAlloc++

		bus.postMessage({
			fn:'newTodo',
			todoId:todoId
		})

		this.length = 0
		this.todoId = todoId
		this.rootId = todoId
		this.deps = {}

		this.last = -1
		this.allocated = initalloc || this.initalloc
		this.todoId = todoId
		this.root = this
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)

		// store the todo
		todoIds[todoId] = this
	}

	proto.toMessage = function(){
		return {
			fn:'updateTodo',
			name:this.name,
			deps:this.deps,
			todoId:this.todoId,
			buffer:this.f32.buffer,
			length:this.length,
			timeStart:this.timeStart,
			timeMax:this.timeMax,
			animLoop:this.animLoop,
			wPainter:painter.w,
			hPainter:painter.h,
			xTotal:this.xTotal,
			xView:this.xView,
			yTotal:this.yTotal,
			yView:this.yView,
			xScrollId:this.xScrollId,
			yScrollId:this.yScrollId,
			momentum:this.momentum
		}
	}

	proto.setScroll = function(x, y){
		bus.postMessage({
			fn:'scrollTodo',
			todoId:this.todoId,
			x:x,
			y:y
		})
	}

	proto.resize = function(){
		var len = this.length
		var lastlen = this.last
		this.allocated = len > this.allocated * 2? len: this.allocated * 2
		var oldi32 = this.i32
		this.f32 = new Float32Array(this.allocated)
		var newi32 = this.i32 = new Int32Array(this.f32.buffer)
		for(var i = 0 ; i < lastlen; i++){
			newi32[i] = oldi32[i]
		}
	}

	proto.clearTodo = function(){
		this.length = 0
		this.deps = {}
		this.last = -1
		this.w = painter.w
		this.h = painter.h
		bus.batchMessage(this)
	}

	proto.dependOnFramebuffer = function(framebuffer){
		this.root.deps[framebuffer.fbId] = true
	}

	proto.addChildTodo = function(todo){ // id: 20
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 1
		i32[o+1] = 1
		i32[o+2] = todo.todoId

		todo.root = this.root
		todo.parentId = this.todoId
		todo.rootId = this.root.todoId
	}

	proto.useShader = function(shader){
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 2
		i32[o+1] = 1
		i32[o+2] = shader.shaderId
	}

	proto.attributes = function(startnameid, range, mesh, offset, stride){

		var o = (this.last = this.length)
		if((this.length += 7) > this.allocated) this.resize()
		var i32 = this.i32
		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh)
		}

		i32[o+0] = 3
		i32[o+1] = 5
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.meshId
		i32[o+5] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+6] = offset
	}

	proto.instances = function(startnameid, range, mesh, divisor, offset, stride){

		var o = (this.last = this.length)
		if((this.length += 8) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh)
		}
		i32[o+0] = 4
		i32[o+1] = 6
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.meshId
		i32[o+5] = stride || mesh.slots * mesh.arraytype.BYTES_PER_ELEMENT
		i32[o+6] = offset
		i32[o+7] = divisor || 1
	}

	proto.indexes = function(nameId, mesh){

		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			mesh.dirty = false
			bus.batchMessage(mesh)
		}

		i32[o+0] = 5
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = mesh.meshId
	}

	// min/magfilter values
	painter.NEAREST = 0
	painter.LINEAR = 1
	painter.NEAREST_MIPMAP_NEAREST = 2
	painter.LINEAR_MIPMAP_NEAREST = 3
	painter.NEAREST_MIPMAP_LINEAR = 4
	painter.LINEAR_MIPMAP_LINEAR = 5

	// wraps/t values
	painter.REPEAT = 0
	painter.CLAMP_TO_EDGE = 1
	painter.MIRRORED_REPEAT = 2

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

	proto.sampler = function(nameId, texture, sam){
		var o = (this.last = this.length)
		if((this.length += 5) > this.allocated) this.resize()
		var i32 = this.i32

		if(texture.dirty){
			texture.dirty = false
			bus.batchMessage(texture)
		}

		// its owned by a framebuffer
		if(texture.framebufferId){
			// flag dependency on root todo
			this.root.deps[texture.framebufferId] = 1
		}

		i32[o+0] = 8
		i32[o+1] = 3
		i32[o+2] = nameId
		i32[o+3] = texture.texId
		i32[o+4] = (sam.minfilter<<0) | (sam.magfilter<<4) | (sam.wraps<<8)| (sam.wrapt<<12) //(sampler.minfilter<<0) | (sampler.magfilter<<4) | (sampler.wraps<<8)| (sampler.wrapt<<12)
	}

	proto.intUniform = function(nameId, x){
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 10
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = x
	}

	proto.floatUniform = function(nameId, x){
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 11
		i32[o+1] = 2
		i32[o+2] = nameId
		f32[o+3] = x
	}

	proto.vec2Uniform = function(nameId, v){
		var o = (this.last = this.length)
		if((this.length += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 12
		i32[o+1] = 3
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	proto.vec3Uniform = function(nameId, v){
		var o = (this.last = this.length)
		if((this.length += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 13
		i32[o+1] = 4
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	proto.vec4Uniform = function(nameId, v){ // id:6
		var o = (this.last = this.length)
		if((this.length += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 14
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	proto.mat4Uniform = function(nameId, m){
		var o = (this.last = this.length)
		if((this.length += 19) > this.allocated) this.resize()
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
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 20
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = x
	}

	proto.floatGlobal = function(nameId, x){ // id:3
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 21
		i32[o+1] = 2
		i32[o+2] = nameId
		f32[o+3] = x
	}

	proto.vec2Global = function(nameId, v){ // id:4
		var o = (this.last = this.length)
		if((this.length += 5) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32
		i32[o+0] = 22
		i32[o+1] = 3
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
	}

	proto.vec3Global = function(nameId, v){ // id:5
		var o = (this.last = this.length)
		if((this.length += 6) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 23
		i32[o+1] = 4
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
	}

	proto.vec4Global = function(nameId, v){ // id:6
		var o = (this.last = this.length)
		if((this.length += 7) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 24
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = v[0]
		f32[o+4] = v[1]
		f32[o+5] = v[2]
		f32[o+6] = v[3]
	}

	proto.mat4Global = function(nameId, m){
		var o = (this.last = this.length)
		if((this.length += 19) > this.allocated) this.resize()
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
	
	painter.TRIANGLES = 0
	painter.TRIANGLE_STRIP = 1
	painter.TRIANGLE_FAN = 2
	painter.LINES = 3
	painter.LINE_STRIP = 4
	painter.LINE_LOOP = 5

	proto.drawArrays = function(type, from, to, instances){ // id:10
		var o = (this.last = this.length)
		if((this.length += 6) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 30
		i32[o+1] = 4
		i32[o+2] = type
		i32[o+3] = from || -1
		i32[o+4] = to || -1
		i32[o+5] = instances || -1
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

		var o = (this.last = this.length) 
		if((this.length += 9) > this.allocated) this.resize()
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

		var o = (this.last = this.length) 
		if((this.length += 9) > this.allocated) this.resize()
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

		var o = (this.last = this.length)
		if((this.length += 9) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 40 // id
		i32[o+1] = 7 // args
		i32[o+2] = 4
		i32[o+8] = stencil
	}

	// blending sources
	painter.ZERO = 0
	painter.ONE = 1
	painter.SRC_COLOR = 2
	painter.ONE_MINUS_SRC_COLOR = 3
	painter.SRC_ALPHA = 4
	painter.ONE_MINUS_SRC_ALPHA = 5
	painter.DST_ALPHA = 6
	painter.ONE_MINUS_DST_ALPHA = 7
	painter.DST_COLOR = 8
	painter.ONE_MINUS_DST_COLOR = 9
	painter.SRC_ALPHA_SATURATE = 10
	painter.CONSTANT_COLOR = 11
	painter.ONE_MINUS_CONSTANT_COLOR = 12

	// blending function
	painter.FUNC_SUBTRACT = 0
	painter.FUNC_REVERSE_SUBTRACT = 1
	painter.FUNC_ADD = 2
	painter.MIN = 3
	painter.MAX = 4

	// array is src, fn, dest, alphasrc, alphafn, alphadest
	proto.blending = function(array, color){

		var o = (this.last = this.length)
		if((this.length += 12) > this.allocated) this.resize()

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
	/*
	function wrapFn(key, fn){
		return function(){
			console.log("Todo: "+key, arguments)
			return fn.apply(this, arguments)
		}
	}

	for(var key in proto){
		if(typeof proto[key] === 'function'){
			proto[key] = wrapFn(key, proto[key])
		}
	}*/
})

var shaderIds = {}
var shaderIdsAlloc = 1

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
		for(var name in refs) if(!nameIds[name]) painter.nameId(name)

		bus.postMessage({
			fn:'newShader',
			code:{
				vertex:code.vertex,
				pixel:code.pixel
			},
			name:code.name,
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

	proto.toMessage = function(){
		return {
			fn:'updateMesh',
			meshId:this.meshId,
			length:this.length,
			array:this.array,
			xOffset:this.xOffset,
			yOffset:this.yOffset,
			wOffset:this.wOffset,
			hOffset:this.hOffset
		}
	}

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
		this.meshId = meshId
		this.array = undefined
		this.length = 0
		if(initalloc){
			this.allocated = initalloc
			this.array = new this.arraytype(initalloc * this.slots)
		}
	}

	proto.type = types.vec4
	proto.initalloc = 1024

	proto.alloc = function(newlength){
		this.allocated = newlength > this.allocated * 2? newlength: this.allocated * 2
		var newarray = new this.arraytype(this.allocated * this.slots)
		var oldarray = this.array

		for(var i = 0, len = this.length * this.slots; i < len; i++){
			newarray[i] = oldarray[i]
		}
		this.array = newarray
	}

	proto.push = function(){
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
		this.length = newlength

		return this
	}

	proto.pushQuad = function(){

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
			array[off + i + 5 * slots] = arguments[i + 3 * slots]
		}

		this.dirty = true
		this.length = newlength
		return this
	}
})

var textureIdsAlloc = 1
var textureIds = {}

painter.Texture = require('class').extend(function Texture(proto){
	var Texture = proto.constructor

	// texture buffer type flags
	painter.RGBA = 0
	painter.RGB = 1
	painter.ALPHA = 2
	painter.LUMINANCE = 3
	painter.LUMINANCE_ALPHA = 4
	painter.DEPTH_COMPONENT16 = 5
	painter.STENCIL_INDEX = 6
	painter.DEPTH_STENCIL = 7

	// data type
	painter.UNSIGNED_BYTE = 0
	painter.UNSIGNED_SHORT = 1
	painter.FLOAT = 2
	painter.HALF_FLOAT = 3
	painter.FLOAT_LINEAR = 4
	painter.HALF_FLOAT_LINEAR = 5

	// other flags
	painter.FLIP_Y = 1<<0
	painter.PREMULTIPLY_ALPHA = 1<<1
	painter.CUBEMAP = 1<<2
	painter.SAMPLELINEAR = 1<<3
	
	proto.toMessage = function(){
		return {
			fn:'newTexture',
			bufType:this.bufType,
			dataType:this.dataType,
			flags:this.flags,
			w:this.w,
			h:this.h,
			array:this.array,
			texId:this.texId
		}
	}

	proto.onConstruct = function(bufType, dataType, flags, w, h, array){
		var texId = textureIdsAlloc++
		textureIds[texId] = this

		this.bufType = bufType
		this.dataType = dataType
		this.flags = flags
		this.w = w
		this.h = h
		this.array = array
		this.texId = texId

		bus.batchMessage(this)
	}

	proto.resize = function(w, h){
		bus.batchMessage({
			fn:'resizeTexture',
			id: this.texId,
			w:w,
			h:h
		})
	}
})

var framebufferIdsAlloc = 1
var framebufferIds = {}

painter.Framebuffer = require('class').extend(function Framebuffer(proto){

	proto.onConstruct = function(w, h, attachments){
		var fbId = framebufferIdsAlloc ++
		framebufferIds[fbId] = this

		var attach 

		for(var key in attachments){
			if(!attach) attach = {}
			texture = attachments[key]
			if(texture){
				texture.framebufferId = fbId
				attach[key] = texture.texId
			}
		}

		this.fbId = fbId
		this.attachments = attach

		bus.batchMessage({
			fn:'newFramebuffer',
			fbId: fbId,
			attach: attach,
			w:w,
			h:h
		})
	}

	proto.resize = function(w, h){
		bus.batchMessage({
			fn:'newFramebuffer',
			fbId: this.fbId,
			attach: this.attachments,
			w:w,
			h:h
		})
	}

	// attach a todo to the framebuffer
	// the main framebuffer is the first 
	proto.assignTodo = function(todo){
		bus.batchMessage({
			fn:'assignTodoToFramebuffer',
			fbId:this.fbId,
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