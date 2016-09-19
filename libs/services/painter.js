var service = require('$painter1')
var types = require('base/types')

var Painter = require('base/class').extend(function Painter(proto){
	require('base/events')(proto)
})

var painter = module.exports = new Painter()

// initialize w/h
var args = service.args
painter.x = args.x
painter.y = args.y
painter.w = args.w
painter.h = args.h
painter.pixelRatio = args.pixelRatio
painter.timeBoot = args.timeBoot

service.onMessage = function(msg){
	if(msg.fn === 'onResize'){
		painter.x = msg.x
		painter.y = msg.y
		painter.w = msg.w
		painter.h = msg.h
		painter.pixelRatio = msg.pixelRatio
	}
	if(painter[msg.fn]) painter[msg.fn](msg)
}

painter.sync = function(){
	// we send the painter a request for a 'sync'
	// if there is still a previous sync waiting we wait till thats fired
	service.postMessage({
		fn:'sync'
	})
}

var nameIds = {}
var nameIdsAlloc = 1

painter.nameId = function(name){
	var nameId = nameIds[name]
	if(nameId) return nameId
	var nameId = nameIds[name] = nameIdsAlloc++
	service.postMessage({
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
	if(todo){
		todo.xScroll = msg.x
		todo.yScroll = msg.y
		if(todo.onScroll) todo.onScroll(msg)
	}
}

painter.Todo = require('base/class').extend(function Todo(proto){

	proto.initalloc = 256

	proto.onConstruct = function(initalloc){

		var todoId = todoIdsAlloc++

		service.postMessage({
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
		
		this.xScroll = 0
		this.yScroll = 0
		this.timeMax = 0
		// store the todo
		todoIds[todoId] = this
	}

	proto.updateTodoTime = function(){
		service.batchMessage({
			fn:'updateTodoTime',
			todoId:this.todoId,
			//timeStart:this.timeStart,
			timeMax:this.timeMax
		})
	}

	proto.toMessage = function(){
		return [{
			fn:'updateTodo',
			name:this.name,
			deps:this.deps,
			todoId:this.todoId,
			uboId:this.todoUbo && this.todoUbo.uboId,

			buffer:this.f32.buffer,
			length:this.length,
			// animation related
			//timeStart:this.timeStart,
			timeMax:this.timeMax,

			wPainter:painter.w,
			hPainter:painter.h,

			// scroll viewport
			xTotal:this.xTotal,
			xView:this.xView,
			yTotal:this.yTotal,
			yView:this.yView,
			// id's of the scrollbars
			xScrollId:this.xScrollId,
			yScrollId:this.yScrollId,
			// start coordinates of the scrollbars
			xsScroll:this.xsScroll,
			ysScroll:this.ysScroll,
			// momentum
			scrollMomentum:this.scrollMomentum,
			scrollToSpeed:this.scrollToSpeed,
			scrollMask:this.scrollMask
		}]
	}

	proto.scrollTo = function(x, y, scrollToSpeed){
		if(x !== undefined) this.xScroll = x
		if(y !== undefined) this.yScroll = y

		service.batchMessage({
			fn:'scrollTo',
			todoId:this.todoId,
			x:this.xScroll,
			y:this.yScroll,
			scrollToSpeed:scrollToSpeed || this.scrollToSpeed
		})
	}
	
	proto.scrollSet = function(x, y){
		if(x !== undefined) this.xScroll = x
		if(y !== undefined) this.yScroll = y
		
		service.batchMessage({
			fn:'scrollSet',
			todoId:this.todoId,
			x:this.xScroll,
			y:this.yScroll
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
		service.batchMessage(this)
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
			service.batchMessage(texture)
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

	proto.ubo = function(nameId, block){
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 20
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = block.uboId
	}

	proto.vao = function(vao){
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 21
		i32[o+1] = 1
		i32[o+2] = vao.vaoId
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

painter.Shader = require('base/class').extend(function Shader(proto){

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

		service.postMessage({
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

painter.Mesh = require('base/class').extend(function Mesh(proto){

	proto.toMessage = function(){
		
		if(!this.dirty || !this.array){
			return null
		}
		this.dirty = false

		if(this.transferData){
			var sendarray = this.array
			this.array = undefined
			this.allocated = 0
			this.length = 0	
		}
		else{
			var sendarray = new this.arraytype(this.array)
		}
		//console.log("UPDATING", this.name, sendarray.buffer.byteLength/(4*this.slots))
		return [{
			fn:'updateMesh',
			arrayType:this.type.name,
			meshId:this.meshId,
			length:this.length,
			array:sendarray.buffer
			//drawDiscard: this.drawDiscard,
			//xOffset:this.xOffset,
			//yOffset:this.yOffset,
			//wOffset:this.wOffset,
			//hOffset:this.hOffset
		}, [sendarray.buffer]]
	}

	proto.updateMesh = function(){
		service.batchMessage(this)
	}

	proto.onConstruct = function(type, initalloc){
		var slots = 0
		if(typeof type === 'number'){
			slots = type
			type = types.float
		}

		if(!type) debugger

		if(!initalloc) initalloc = this.initalloc

		var meshId = meshIdsAlloc++

		service.postMessage({
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
		this.dirty = true
		if(initalloc){
			this.allocated = initalloc
			this.array = new this.arraytype(initalloc * this.slots)
		}
	}

	proto.type = types.vec4
	proto.initalloc = 1

	proto.alloc = function(newlength){
		var oldalloc = this.allocated * this.slots
		this.allocated = newlength > this.allocated * 2? newlength: this.allocated * 2
		var newarray = new this.arraytype(this.allocated * this.slots)
		var oldarray = this.array

		for(var i = 0; i < oldalloc; i++){
			newarray[i] = oldarray[i]
		}
		this.array = newarray
		this.dirty = true
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

painter.Texture = require('base/class').extend(function Texture(proto){
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
	painter.TRANSFER_DATA = 1<<4

	proto.toMessage = function(){

		var transfer = []
		var sendbuffer
		if(this.array){
			if(this.flags & painter.TRANSFER_DATA){
				if(this.array.constructor === ArrayBuffer) sendbuffer = this.array
				else sendbuffer = this.array.buffer
			}
			else{
				var constr = this.array.constructor
				if(constr === ArrayBuffer) constr = Uint8Array
				sendbuffer = new constr(this.array).buffer
			}
			transfer.push(sendbuffer)
		}

		return [{
			fn:'newTexture',
			bufType:this.bufType,
			dataType:this.dataType,
			flags:this.flags,
			w:this.w,
			h:this.h,
			array:sendbuffer,
			texId:this.texId
		}, transfer]
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

		service.batchMessage(this)
	}

	proto.resize = function(w, h){
		service.batchMessage({
			fn:'resizeTexture',
			id: this.texId,
			w:w,
			h:h
		})
	}
})

var vaoIdsAlloc = 1
var vaoIds = {}

// Vertex attribute object
painter.Vao = require('base/class').extend(function Vao(proto){
	proto.toMessage = function(){
		return [{
			fn:'newVao',
			vaoId:this.vaoId,
			shaderId:this.shaderId,
			buffer:this.f32.buffer,
			length:this.length
		}]
	}

	proto.onConstruct = function(shader){
		var vaoId = vaoIdsAlloc++
		vaoIds[vaoId] = this
		service.batchMessage(this)
		this.last = -1
		this.length = 0
		this.allocated = 20
		this.vaoId = vaoId
		this.shaderId = shader.shaderId
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)
	}
	// copy relevant todo functions
	proto.resize = painter.Todo.prototype.resize

	proto.resize = function(){
		var len = this.length
		var lastlen = this.last
		this.allocated = len > this.allocated * 2? len: this.allocated * 2
		var oldi32 = this.i32
		var newi32 = this.i32 = new Int32Array(this.allocated)
		for(var i = 0 ; i < lastlen; i++){
			newi32[i] = oldi32[i]
		}
	}

	proto.attributes = function(startnameid, range, mesh, offset, stride){

		var o = (this.last = this.length)
		if((this.length += 7) > this.allocated) this.resize()
		var i32 = this.i32
		// use the mesh message for lazy serialization

		if(mesh.dirty){
			service.batchMessage(mesh)
		}

		i32[o+0] = 1
		i32[o+1] = 5
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.meshId
		i32[o+5] = stride || mesh.slots
		i32[o+6] = offset
	}

	proto.instances = function(startnameid, range, mesh, divisor, offset, stride){

		var o = (this.last = this.length)
		if((this.length += 8) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			service.batchMessage(mesh)
		}
		i32[o+0] = 2
		i32[o+1] = 6
		i32[o+2] = startnameid
		i32[o+3] = range
		i32[o+4] = mesh.meshId
		i32[o+5] = stride || mesh.slots
		i32[o+6] = offset
		i32[o+7] = divisor || 1
	}

	proto.indices = function(mesh){

		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32

		// use the mesh message for lazy serialization
		if(mesh.dirty){
			service.batchMessage(mesh)
		}

		i32[o+0] = 3
		i32[o+1] = 1
		i32[o+2] = mesh.meshId
	}
})

var uboIdsAlloc = 1
var uboIds = {}

// uniform buffer object
painter.Ubo = require('base/class').extend(function Ubo(proto){

	proto.toMessage = function(){
		this.updating = false
		// do a change check on the uniforms
		var i32a = this.i32
		var i32b = this.i32last
		for(var i = this.size - 1;i>=0; i--){
			if(i32a[i] !== i32b[i]) break
		}
		if(i<0) return null // no change in buffers
		// swap the buffers		
		this.i32last = this.i32
		this.i32 = i32b
		var f32b = this.f32last
		this.f32last = this.f32
		this.f32 = f32b
		return [{
			fn:'updateUbo',
			buffer:this.f32last.buffer,
			size:this.size,
			uboId:this.uboId
		}]
	}

	proto.onConstruct = function(layoutDef){
		var uboId = uboIdsAlloc++
		uboIds[uboId] = this
		var offsets = this.offsets = {}
		var order = this.order = []
		var size = 0
		for(var key in layoutDef){
			var item = layoutDef[key]
			var slots = item.type.slots
			var nameId = nameIds[key] || painter.nameId(key)
			offsets[nameId] = size
			this.order.push({
				nameId:nameIds[key], type:item.type.name
			})
			size += slots
		}
		this.uboId = uboId
		service.batchMessage({
			fn:'newUbo',
			uboId: this.uboId,
			order: order
		})
		this.size = size
		this.f32 = new Float32Array(size)
		this.i32 = new Int32Array(this.f32.buffer)
		this.f32last = new Float32Array(size)
		this.i32last = new Int32Array(this.f32last.buffer)
	}

	proto.int = function(nameId, x){
		if(!this.updating) this.update()
		this.i32[this.offsets[nameId]] = x
	}

	proto.float = function(nameId, x){
		if(!this.updating) this.update()
		this.f32[this.offsets[nameId]] = x
	}

	proto.vec2 = function(nameId, v){
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		f32[o  ] = v[0]
		f32[o+1] = v[1]
	}

	proto.vec3 = function(nameId, v){
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		f32[o  ] = v[0]
		f32[o+1] = v[1]
		f32[o+2] = v[2]
	}

	proto.vec4 = function(nameId, v){ // id:6
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		if(typeof v === 'string'){
			types.colorFromString(v, 1, f32, o)
		}
		else if(v.length === 2){
			types.colorFromString(v[0], v[1], f32, o)
		} 
		else {
			f32[o  ] = v[0]
			f32[o+1] = v[1]
			f32[o+2] = v[2]
			f32[o+3] = v[3]
		}
	}

	proto.mat4 = function(nameId, m){
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		f32[o  ] = m[0]
		f32[o+1] = m[1]
		f32[o+2] = m[2]
		f32[o+3] = m[3]
		f32[o+4] = m[4]
		f32[o+5] = m[5]
		f32[o+6] = m[6]
		f32[o+7] = m[7]
		f32[o+8] = m[8]
		f32[o+9] = m[9]
		f32[o+10] = m[10]
		f32[o+11] = m[11]
		f32[o+12] = m[12]
		f32[o+13] = m[13]
		f32[o+14] = m[14]
		f32[o+15] = m[15]
	}

	proto.update = function(){
		this.updating = true
		service.batchMessage(this)
	}
})

var framebufferIdsAlloc = 1
var framebufferIds = {}

painter.Framebuffer = require('base/class').extend(function Framebuffer(proto){

	proto.onConstruct = function(w, h, attachments, xStart, yStart){
		var fbId = framebufferIdsAlloc ++
		framebufferIds[fbId] = this

		var attach

		for(var key in attachments){
			if(!attach) attach = {}
			var texture = attachments[key]
			if(texture){
				texture.framebufferId = fbId
				attach[key] = texture.texId
			}
		}

		this.fbId = fbId
		this.attachments = attach

		service.batchMessage({
			fn:'newFramebuffer',
			fbId: fbId,
			attach: attach,
			w:w,
			h:h,
			xStart:xStart,
			yStart:yStart,
		})
	}

	proto.resize = function(w, h, xStart, yStart){
		service.batchMessage({
			fn:'newFramebuffer',
			fbId: this.fbId,
			attach: this.attachments,
			w:w,
			h:h,
			xStart:xStart,
			yStart:yStart,
		})
	}

	proto.assignTodoAndUbo = function(todo, ubo){
		service.batchMessage({
			fn:'assignTodoAndUboToFramebuffer',
			fbId:this.fbId,
			todoId:todo.todoId,
			uboId:ubo.uboId
		})
	}
})
// create the main framebuffer
painter.mainFramebuffer = new painter.Framebuffer()

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