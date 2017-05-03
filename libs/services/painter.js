var service = require('$painter1')
var types = require('base/types')
var IdAlloc = require('base/idalloc')

class Painter extends require('base/class'){
	prototype(){
	}
}

var painter = module.exports = new Painter()

// initialize w/h
var args = service.args
painter.x = args.x
painter.y = args.y
painter.w = args.w
painter.h = args.h
painter.pixelRatio = args.pixelRatio
painter.timeBoot = args.timeBoot

var pileupQueue = []
var pileupTimer

function flushPileupQueue(){
	for(let i = 0; i < pileupQueue.length; i++){
		var msg = pileupQueue[i]
		if(painter[msg.fn]) painter[msg.fn](msg)
	}
	pileupQueue.length = 0
}

service.onMessage = function(msg){
	if(msg.fn === 'onMove'){
		painter.x = msg.x
		painter.y = msg.y
		if(painter[msg.fn]) painter[msg.fn](msg)
	}
	if(msg.fn === 'onResize'){
		painter.w = msg.w
		painter.h = msg.h
		painter.pixelRatio = msg.pixelRatio
		if(painter[msg.fn]) painter[msg.fn](msg)
		return
	}
	if(Date.now()-msg.pileupTime > 16){
		if(pileupTimer) clearTimeout(pileupTimer)
		pileupQueue.push(msg)
		pileupTimer = setTimeout(flushPileupQueue, 16)
		return
	}
	if(pileupTimer) clearTimeout(pileupTimer), pileupTimer = undefined
	pileupQueue.push(msg)
	flushPileupQueue()
}

painter.sync = function(){
	// we send the painter a request for a 'sync'
	// if there is still a previous sync waiting we wait till thats fired
	service.postMessage({
		fn:'sync'
	})
}

var nameIds = new IdAlloc()
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

painter.onScrollTodo = function(msg){
	var todo = todoIds[msg.todoId]
	if(todo){
		todo.xScroll = msg.x
		todo.yScroll = msg.y
		if(todo.onScroll) todo.onScroll(msg)
	}
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

painter.TRIANGLES = 0
painter.TRIANGLE_STRIP = 1
painter.TRIANGLE_FAN = 2
painter.LINES = 3
painter.LINE_STRIP = 4
painter.LINE_LOOP = 5

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

painter.NEVER = 0
painter.LESS = 1
painter.EQUAL = 2
painter.LEQUAL = 3
painter.GREATER = 4
painter.NOTEQUAL = 5
painter.GEQUAL = 6
painter.ALWAYS = 7

var todoIds = new IdAlloc()

function sortOrdering(a,b){
	if(a.order === b.order){
		if(a.index > b.index) return 1
		if(a.index < b.index) return -1
		return 0
	}
	if(a.order > b.order) return 1
	if(a.order < b.order) return -1
	return 0
}

painter.Todo = class Todo extends require('base/class'){

	prototype(){
		this.todoIds = todoIds
	}

	constructor(initalloc){
		super()

		// var keys = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
		// for(let key of keys){
		// 	let fn = this[key]
		// 	this[key] = function(){
		// 		console.log(key, arguments)
		// 		return fn.apply(this, arguments)
		// 	}
		// }

		this.initalloc = 256

		this.todoId = todoIds.alloc(this)

		service.batchMessage({
			fn:'newTodo',
			todoId:this.todoId
		})

		this.length = 0
		this.rootId = this.todoId
		this.deps = {}

		this.last = -1
		this.allocated = initalloc || this.initalloc
		this.root = this
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)
		this.ordering = []

		this.props = []
		this.props2 = []
		this.xScroll = 0
		this.yScroll = 0
		this.timeMax = 0
	}

	destroyTodo(){
		todoIds.free(this.todoId)
		service.batchMessage({
			fn:'destroyTodo',
			todoId:this.todoId
		})
		this.todoId = undefined
	}

	updateTodoTime(){
		service.batchMessage({
			fn:'updateTodoTime',
			todoId:this.todoId,
			//timeStart:this.timeStart,
			timeMax:this.timeMax
		})
	}

	toMessage(){
		var deps = []
		for(let key in this.deps){
			deps.push(key)
		}
		
		// lets sort our order in the todo buffer
		var buffer = this.f32.buffer

		// lets apply todo order sorting
		if(this.orderSort){
			// copy it
			var ordering = this.ordering
			
			if(this.onFinalizeTodoOrder) this.onFinalizeTodoOrder(this)

			var i32 = this.i32
			var o32 = new Int32Array(i32)
			var o = this.orderStart
			ordering.sort(sortOrdering)
			for(let i = 0, l = ordering.length; i < l; i++){
				var ord = ordering[i]
				for(let c = ord.start, e = ord.end; c < e; c++){
					o32[o++] = i32[c]
				}
			}
			buffer = o32.buffer

		}

		this.batched = false

		return [{
			fn:'updateTodo',
			viewId:this.viewId,
			deps:deps,
			children:this.children,
			todoId:this.todoId,
			uboId:this.todoUbo && this.todoUbo.uboId,

			buffer:buffer,
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
			
			// feed back xScroll and yScroll for sync
			xScrollSync:this.xScroll,
			yScrollSync:this.yScroll,
			scrollMode:this.scrollMode,
			// adaptive scrollmode visibility
			xVisible:this.xVisible,
			yVisible:this.yVisible,
			wVisible:this.wVisible,
			hVisible:this.hVisible,
			
			// id's of the scrollbars
			xScrollId:this.xScrollId,
			yScrollId:this.yScrollId,
			// start coordinates of the scrollbars
			xsScroll:this.xsScroll,
			ysScroll:this.ysScroll,
			scrollMinSize:this.scrollMinSize,
			// momentum
			scrollMomentum:this.scrollMomentum,
			scrollToSpeed:this.scrollToSpeed,
			scrollMask:this.scrollMask
		}]
	}

	scrollSync(){
		service.batchMessage({
			fn:'scrollSync',
			todoId:this.todoId,
			x:this.xScroll,
			y:this.yScroll
		})
	}

	scrollTo(x, y, scrollToSpeed){
		if(x !== undefined) this.xScroll = x
		if(y !== undefined) this.yScroll = y
		//if(this.batched) return
		service.batchMessage({
			fn:'scrollTo',
			todoId:this.todoId,
			x:this.xScroll,
			y:this.yScroll,
			scrollToSpeed:scrollToSpeed || this.scrollToSpeed
		})
	}
	
	scrollSet(x, y){
		if(x !== undefined) this.xScroll = x
		if(y !== undefined) this.yScroll = y
		
		service.batchMessage({
			fn:'scrollSet',
			todoId:this.todoId,
			x:this.xScroll,
			y:this.yScroll
		})
	}

	resize(){
		var len = this.length
		var lastlen = this.last
		this.allocated = len > this.allocated * 2? len: this.allocated * 2
		var oldi32 = this.i32
		this.f32 = new Float32Array(this.allocated)
		var newi32 = this.i32 = new Int32Array(this.f32.buffer)
		for(let i = 0 ; i < lastlen; i++){
			newi32[i] = oldi32[i]
		}
	}

	clearTodo(){
		this.length = 0
		this.deps = {}
		this.children = []
		var props2 = this.props2
		this.props2 = this.props
		this.props = props2
		this.props.length = 0
		this.ordering.length = 0
		this.orderStart = -1
		this.orderSort = false
		this.last = -1
		this.w = painter.w
		this.h = painter.h
		this.batched = true
		service.batchMessage(this)
	}

	dependOnFramebuffer(framebuffer){
		this.root.deps[framebuffer.fbId] = true
	}

	addChildTodo(todo){ // id: 20
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 1
		i32[o+1] = 1
		i32[o+2] = todo.todoId
		this.children.push(todo.todoId)
		todo.root = this.root
		todo.parentId = this.todoId
		todo.rootId = this.root.todoId
	}

	beginOrder(order, prop){
		var ordering = this.ordering
		var props = this.props
		if(ordering.length){ // make sure there are no holes
			if(ordering[ordering.length - 1].end !== this.length){
				ordering.length = 0
				this.orderStart = -1
			}
		}
		if(order) this.orderSort = true
		if(this.orderStart<0) this.orderStart = this.length
		if(prop) props.push(prop)
		ordering.push({order:order, index:ordering.length, start:this.length})
	}

	endOrder(order){
		var ordering = this.ordering
		ordering[ordering.length - 1].end = this.length
	}

	useShader(shader){
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32

		i32[o+0] = 2
		i32[o+1] = 1
		i32[o+2] = shader.shaderId
	}

	sampler(nameId, texture, sam){
		if(!texture) return

		var o = (this.last = this.length)
		if((this.length += 5) > this.allocated) this.resize()
		var i32 = this.i32

		if(texture.dirty){
			texture.dirty = false
			service.batchMessage(texture)
		}

		// its owned by a framebuffer
		if(texture.framebufferId){
			// flag dependency on our deps
			this.deps[texture.framebufferId] = 1
		}

		i32[o+0] = 8
		i32[o+1] = 3
		i32[o+2] = nameId
		i32[o+3] = texture.texId
		i32[o+4] = (sam.minfilter<<0) | (sam.magfilter<<4) | (sam.wraps<<8)| (sam.wrapt<<12) //(sampler.minfilter<<0) | (sampler.magfilter<<4) | (sampler.wraps<<8)| (sampler.wrapt<<12)
	}

	ubo(nameId, block){
		var o = (this.last = this.length)
		if((this.length += 4) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 20
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = block.uboId
	}

	vao(vao){
		var o = (this.last = this.length)
		if((this.length += 3) > this.allocated) this.resize()
		var i32 = this.i32, f32 = this.f32

		i32[o+0] = 21
		i32[o+1] = 1
		i32[o+2] = vao.vaoId
	}

	drawArrays(type, from, to, instances){ // id:10
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

	clearColor(red, green, blue, alpha){ // id:0
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

	clearDepth(depth){ // id:0
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

	clearStencil(stencil){
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

	// array is src, fn, dest, alphasrc, alphafn, alphadest
	blending (array, color){

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

	
	// array is src, fn, dest, alphasrc, alphafn, alphadest
	depthTest (depthFunc, write, znear, zfar){

		var o = (this.last = this.length)
		if((this.length += 6) > this.allocated) this.resize()

		var i32 = this.i32
		var f32 = this.f32
		i32[o+0] = 42
		i32[o+1] = 4
		i32[o+2] = depthFunc
		i32[o+3] = write? 1: 0
		f32[o+4] = znear
		f32[o+5] = zfar
	}

	/*
	function wrapFn(key, fn){
		return function(){
			console.log("Todo: "+key, arguments)
			return fn.apply(this, arguments)
		}
	}

	for(let key in proto){
		if(typeof proto[key] === 'function'){
			proto[key] = wrapFn(key, proto[key])
		}
	}*/
}

var shaderIds = new IdAlloc()

painter.Shader = class Shader extends require('base/class'){

	constructor(code){
		super()
		this.shaderId = shaderIds.alloc(this)

		var refs = {}

		parseShaderAttributes(code.vertex, refs)
		parseShaderUniforms(code.vertex, refs)
		parseShaderUniforms(code.pixel, refs)
		for(let name in refs) if(!nameIds[name]) painter.nameId(name)

		service.batchMessage({
			fn:'newShader',
			code:{
				vertex:code.vertex,
				pixel:code.pixel
			},
			trace:code.trace,
			name:code.name,
			shaderId:this.shaderId
		})

		this.code = code
	}

	destroyShader(){
		shaderIds.free(this.shaderId)
		service.batchMessage({
			fn:'destroyShader',
			shaderId:this.shaderId
		})
		this.shaderId = undefined
	}
}

var meshIds = new IdAlloc()

painter.Mesh = class Mesh extends require('base/class'){

	toMessage(){
		if(!this.dirty || !this.array || this.meshId === undefined){
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
		}, [sendarray.buffer]]
	}

	updateMesh(){
		service.batchMessage(this)
	}

	constructor(type, initalloc){
		super()
		var slots = 0
		if(typeof type === 'number'){
			slots = type
			type = types.float
		}

		if(!initalloc) initalloc = 1
		this.meshId = meshIds.alloc(this)

		service.batchMessage({
			fn:'newMesh',
			meshId:this.meshId
		})

		this.type = type
		this.arraytype = type.array
		this.slots = slots || type.slots
		this.lutStart = {}
		this.lutEnd = {}
		this.lutStart2 = {}
		this.lutEnd2 = {}
		this.allocated = 0
		this.allocated2 = 0
		this.array = undefined
		this.length = 0
		this.length2 = 0
		this.dirty = true
		if(initalloc){
			this.allocated = initalloc
			this.array = new this.arraytype(initalloc * this.slots)
		}
	}

	destroyMesh(){
		meshIds.free(this.meshId)
		service.batchMessage({
			fn:'destroyMesh',
			meshId:this.meshId
		})
		this.meshId = undefined
	}

	alloc(newlength){
		var oldalloc = this.allocated * this.slots
		this.allocated = newlength > this.allocated * 2? newlength: this.allocated * 2
		var newarray = new this.arraytype(this.allocated * this.slots)
		var oldarray = this.array

		for(let i = 0; i < oldalloc; i++){
			newarray[i] = oldarray[i]
		}
		this.array = newarray
		this.dirty = true
	}

	// double buffering the buffers
	flip(clear){
		var array = this.array
		var allocated = this.allocated
		var length = this.length
		var lutStart = this.lutStart
		var lutEnd = this.lutEnd

		if(clear){
			this.length = 0
			this.array = this.array2
			this.allocated = this.allocated2 //|| 0
			this.lutStart = {}
			this.lutEnd = {}
		}
		else{
			this.length = this.length2// || 0
			this.array = this.array2
			this.allocated = this.allocated2 //|| 0
			this.lutStart = this.lutStart2// || {}
			this.lutEnd = this.lutEnd2// || {}
		}

		this.array2 = array
		this.allocated2 = allocated
		this.length2 = length
		this.lutStart2 = lutStart
		this.lutEnd2 = lutEnd
		this.dirty = true
		this.updateMesh()
	}

	push(){
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

		for(let i = 0; i < arglen; i++){
			array[off + i] = arguments[i]
		}

		this.dirty = true
		this.length = newlength

		return this
	}

	pushQuad(){

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

		for(let i = 0, len = this.slots; i < len; i++){
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
}
                        
var textureIds = new IdAlloc()
// texture format flags
painter.RGBA = 0
painter.RGB = 1
painter.ALPHA = 2
painter.LUMINANCE = 3
painter.LUMINANCE_ALPHA = 4
painter.DEPTH_COMPONENT16 = 5
painter.STENCIL_INDEX = 6
painter.DEPTH_STENCIL = 7

// texture type
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

painter.Texture = class Texture extends require('base/class'){
	
	prototype(){
		this.size = [1,1]
		this.offset = [0,0]
	}

	toMessage(){

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
		var ret = [{
			fn:'newTexture',
			format:this.format,
			type:this.type,
			flags:this.flags,
			external:this.external,
			w:this.w,
			h:this.h,
			array:sendbuffer,
			texId:this.texId
		}, transfer]
		return ret
	}

	constructor(options){
		super()
		
		//format, type, flags, w, h, array
		this.format = options.format || painter.RGBA
		this.type = options.type || painter.UNSIGNED_BYTE
		this.external = options.external
		this.flags = options.flags || 0
		this.w = options.w 
		this.h = options.h
		this.array = options.array
		this.texId = textureIds.alloc(this)
		service.batchMessage(this)
	}

	update(options){
		service.batchMessage(this)
		if(!options) return
		if(options.format !== undefined) this.format = options.format
		if(options.type !== undefined) this.type = options.type
		if(options.flags !== undefined) this.flags = options.flags
		if(options.w !== undefined) this.w = options.w
		if(options.h !== undefined) this.h = options.h
		if(options.array !== undefined) this.array = options.array
	}

	destroyTexture(){
		textureIds.free(this.textureId)
		service.batchMessage({
			fn:'destroyTexture',
			textureId:this.textureId
		})
		this.textureId = undefined
	}

	resize(w, h){
		service.batchMessage({
			fn:'resizeTexture',
			id: this.texId,
			w:w,
			h:h
		})
	}
}

var vaoIds = new IdAlloc()

// Vertex attribute object
painter.Vao = class Vao extends require('base/class'){
	toMessage(){
		return [{
			fn:'newVao',
			vaoId:this.vaoId,
			shaderId:this.shaderId,
			buffer:this.f32.buffer,
			length:this.length
		}]
	}

	constructor(shader){
		super()
		service.batchMessage(this)
		this.last = -1
		this.length = 0
		this.allocated = 20
		this.vaoId = vaoIds.alloc(this)
		this.shaderId = shader.shaderId
		// the two datamappings
		this.f32 = new Float32Array(this.allocated)
		this.i32 = new Int32Array(this.f32.buffer)
	}

	destroyVao(){
		vaoIds.free(this.vaoId)
		service.batchMessage({
			fn:'destroyVao',
			vaoId:this.vaoId
		})
		this.vaoId = undefined
	}

	resize(){
		var len = this.length
		var lastlen = this.last
		this.allocated = len > this.allocated * 2? len: this.allocated * 2
		var oldi32 = this.i32
		var newi32 = this.i32 = new Int32Array(this.allocated)
		for(let i = 0 ; i < lastlen; i++){
			newi32[i] = oldi32[i]
		}
	}

	attributes(startnameid, range, mesh, offset, stride){

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

	instances(startnameid, range, mesh, divisor, offset, stride){

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

	indices(mesh){

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
}

var uboIds = new IdAlloc()

// uniform buffer object
painter.Ubo = class Ubo extends require('base/class'){

	toMessage(){
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

	constructor(layoutDef){
		super()
		var offsets = this.offsets = {}
		var order = this.order = []
		var size = 0
		for(let key in layoutDef){
			var item = layoutDef[key]
			var slots = item.type.slots
			var nameId = nameIds[key] || painter.nameId(key)
			offsets[nameId] = size
			this.order.push({
				nameId:nameIds[key], type:item.type.name
			})
			size += slots
		}

		this.uboId = uboIds.alloc(this)

		service.batchMessage({
			fn:'newUbo',
			uboId: this.uboId,
			order: order
		})
		this.layout = layoutDef
		this.size = size
		this.f32 = new Float32Array(size)
		this.i32 = new Int32Array(this.f32.buffer)
		this.f32last = new Float32Array(size)
		this.i32last = new Int32Array(this.f32last.buffer)
	}

	destroyUbo(){
		uboIds.free(this.uboId)
		service.batchMessage({
			fn:'destroyUbo',
			uboId:this.uboId
		})
		this.uboId = undefined
	}

	ints(name, x){
		this.int(painter.nameId(name), x)
	}

	int(nameId, x){
		if(!this.updating) this.update()
		this.i32[this.offsets[nameId]] = x
	}

	floats(name, x){
		this.float(painter.nameId(name), x)
	}

	float(nameId, x){
		if(!this.updating) this.update()
		this.f32[this.offsets[nameId]] = x
	}

	vec2s(name, v){
		this.vec2(painter.nameId(name), v)
	}

	vec2(nameId, v){
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		f32[o  ] = v[0]
		f32[o+1] = v[1]
	}

	vec3s(name, v){
		this.vec3(painter.nameId(name), v)
	}

	vec3(nameId, v){
		if(!this.updating) this.update()
		var o = this.offsets[nameId]
		var f32 = this.f32
		f32[o  ] = v[0]
		f32[o+1] = v[1]
		f32[o+2] = v[2]
	}

	vec4s(name, v){
		this.vec4(painter.nameId(name), v)
	}

	vec4(nameId, v){ // id:6
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

	mat4s(name, m){
		this.mat4(painter.nameId(name), m)
	}

	mat4(nameId, m){
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

	update(){
		this.updating = true
		service.batchMessage(this)
	}
}

var framebufferIds = new IdAlloc()

painter.Framebuffer = class Framebuffer extends require('base/class'){

	constructor(w, h, attachments){
		super()
		var fbId = framebufferIds.alloc(this)
		var attach

		for(let key in attachments){
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
			h:h//,
			//xStart:xStart,
			//yStart:yStart,
		})
	}

	destroyFramebuffer(){
		framebufferIds.free(this.fbId)
		service.batchMessage({
			fn:'destroyFramebuffer',
			fbId:this.fbId
		})
		this.fbId = undefined
	}

	resize(w, h){
		service.batchMessage({
			fn:'newFramebuffer',
			fbId: this.fbId,
			attach: this.attachments,
			w:w,
			h:h//,
			//xStart:xStart,
			//yStart:yStart,
		})
	}

	position(x, y){
		service.batchMessage({
			fn:'positionFramebuffer',
			fbId: this.fbId,
			x:x,
			y:y
		})
	}

	assignTodoAndUbo(todo, ubo){
		service.batchMessage({
			fn:'assignTodoAndUboToFramebuffer',
			fbId:this.fbId,
			todoId:todo.todoId,
			uboId:ubo.uboId
		})
	}
}

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