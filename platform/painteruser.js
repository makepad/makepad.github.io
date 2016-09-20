module.exports = function painterUser(proto){

	proto.onConstructPainterUser = function(){
		this.shaderIds = {}
		this.nameIds = {}
		this.nameRev = {}
		this.meshIds = {}
		this.todoIds = {}
		this.textureIds = {}
		this.framebufferIds = {}
		this.uboIds = {}
		this.vaoIds = {}
		this.localShaderCache = {}
	}

	proto.user_newName = function(msg){
		this.nameIds[msg.name] = msg.nameId
		this.nameRev[msg.nameId] = msg.name
	}

	proto.user_newShader = function(msg){
		this.stopBootCache()

		var gl = this.gl
		var pixelcode = msg.code.pixel
		var vertexcode = msg.code.vertex
		var shaderid = msg.shaderId

		pixelcode =  "#extension GL_OES_standard_derivatives : enable\n"+
					 "precision highp float;\nprecision highp int;\n"+
		             pixelcode
		vertexcode = "precision highp float;\nprecision highp int;\n"+
					 vertexcode

		var cacheid = vertexcode + '@@@@' + pixelcode

		this.writeBootCache(cacheid)

		//var shader = this.localShaderCache[cacheid]
		//if(shader){
		//	shader.refCount++
		//	this.shaderIds[shaderid] = shader
		//	return
		//}
		shader = gl.globalShaderCache[cacheid] || (gl.globalShaderCache[cacheid] = this.compileShader(vertexcode, pixelcode))
		if(!shader) return
		//shader.refCount = 1
		shader.name = msg.name
		this.shaderIds[shaderid] = shader
		//this.localShaderCache[cacheid] = shader
	}

	proto.user_newFramebuffer = function(msg){
		var gl = this.gl
		var prev = this.framebufferIds[msg.fbId]

		// delete previous if its there
		
		if(prev){
			if(prev.w == msg.w && prev.h === msg.h){
				prev.xStart = msg.xStart
				prev.yStart = msg.yStart
				if(prev.child) this.resizeChild(prev.child, msg.fbId)
				return
			}
			for(var key in prev.attach){
				var sam = prev.attach[key].samplers
				for(var samkey in sam){
					var gltex = sam[samkey].gltex
					if(gltex) gl.deleteTexture(sam[samkey].gltex)
				}
			}
			gl.deleteFramebuffer(prev.glfb)
			if(prev.glpfb) gl.deleteFramebuffer(prev.glpfb)
		}
		
		if(!msg.attach){ // main framebuffer
			if(this.mainFramebuffer){
				throw new Error('Dont create a mainframebuffer more than once')
			}
			
			this.mainFramebuffer =  this.framebufferIds[msg.fbId] = this.parentFramebuffer || {
			}

			return
		}
		
		// create all attached textures as needed
		var attach = {}
		for(var key in msg.attach){
			var tex = this.textureIds[msg.attach[key]]
			// we might need to create this texture
			var defsam = (tex.flags&this.textureFlags.SAMPLELINEAR)?'4352':'4352'
			var samplers = tex.samplers
			samplers[defsam] = {}
			// check if we have the texture/sampler
		
			// lets make a rendertarget texture (or buffer)
			var gltex = gl.createTexture()
			samplers[defsam].gltex = gltex

			gl.bindTexture(gl.TEXTURE_2D, gltex)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			
			var bufType = this.textureBufTypes[tex.bufType]
			var dataType = this.textureDataTypes[tex.dataType]
			gl.texImage2D(gl.TEXTURE_2D, 0, bufType, msg.w, msg.h, 0, bufType, dataType, null)
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.glframe_buf)

			tex.w = msg.w
			tex.h = msg.h
			tex.pixelRatio = this.args.pixelRatio
			attach[key] = tex
		}
		// and create framebuffer and attach all of the textures

		var glfb = gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, glfb)
		if(attach.color0){
			var color0 = attach.color0.samplers['4352'].gltex
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color0, 0)

		}
		if(attach.depth){
			var depth = attach.depth.samplers['4352'].gltex
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0)
		}
		
		// make a pick framebuffer
		if(attach.pick){
			var glpfb = gl.createFramebuffer()
			gl.bindFramebuffer(gl.FRAMEBUFFER, glpfb)
			var pick = attach.pick.samplers['4352'].gltex
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pick, 0)
			if(attach.depth){
				var depth = attach.depth.samplers['4352'].gltex
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0)
			}
		}

		// store it
		var fb = this.framebufferIds[msg.fbId] = {
			glpfb: glpfb,
			glfb: glfb,
			todoId: prev && prev.todoId || undefined,
			attach: attach,
			xStart: msg.xStart,
			yStart: msg.yStart
		}

		// signal the child their framebuffer has resized
		if(prev && prev.child){
			fb.child = prev.child
			this.resizeChild(prev.child, msg.fbId)
		}
	}

	proto.user_assignTodoAndUboToFramebuffer = function(msg){
		// we are attaching a todo to a framebuffer.
		var framebuffer = this.framebufferIds[msg.fbId]
		framebuffer.todoId = msg.todoId
		framebuffer.uboId = msg.uboId
		// if we attached to the main framebuffer, repaint
		if(framebuffer === this.mainFramebuffer){
			this.requestRepaint()
		}
	}

	proto.user_newTexture = function(msg){
		var tex = this.textureIds[msg.texId]
		if(!tex){
			tex = this.textureIds[msg.texId] = {samplers:{}}
			tex.bufType = msg.bufType
			tex.dataType = msg.dataType
			tex.flags = msg.flags
		}
		tex.w = msg.w
		tex.h = msg.h
		tex.array = msg.array
		tex.updateId = this.frameId
	}
	
	proto.user_newTodo = function(msg){
		this.todoIds[msg.todoId] = {
			todoId:msg.todoId,
			xScroll:0,
			yScroll:0,
			xScrollFlick:0,
			yScrollFlick:0
		}
	}

	proto.user_updateTodo = function(msg){
		//console.log("UPDATETODO",performance.now()-window.stamp)

		// lets just store the todo message as is
		var todo = this.todoIds[msg.todoId]

		// redefine deps
		todo.deps = msg.deps
		todo.children = msg.children

		todo.f32 = new Float32Array(msg.buffer)
		todo.i32 = new Int32Array(msg.buffer)

		todo.name = msg.name
		todo.length = msg.length
		//todo.timeStart = msg.timeStart

		todo.timeMax = msg.timeMax 
		todo.animLoop = msg.animLoop

		todo.wPainter = msg.wPainter
		todo.hPainter = msg.hPainter

		todo.xTotal = msg.xTotal
		todo.xView = msg.xView
		todo.yTotal = msg.yTotal
		todo.yView = msg.yView
		todo.xScrollId = msg.xScrollId
		todo.yScrollId = msg.yScrollId
		todo.xsScroll = msg.xsScroll
		todo.ysScroll = msg.ysScroll
		todo.scrollToSpeed = msg.scrollToSpeed || .5
		todo.scrollMomentum = msg.scrollMomentum
		todo.scrollMask = msg.scrollMask

		todo.uboId = msg.uboId

		// what if we are the todo of the mainFrame
		if(this.mainFramebuffer && this.mainFramebuffer.todoId === todo.todoId){
			this.requestRepaint()
		}
	}

	proto.user_updateTodoTime = function(msg){
		var todo = this.todoIds[msg.todoId]
		//todo.timeStart = msg.timeStart
		todo.timeMax = msg.timeMax
		this.requestRepaint()
	}

	proto.user_scrollTo = function(msg){
		var todo = this.todoIds[msg.todoId]
		todo.xScrollTo = msg.x
		todo.yScrollTo = msg.y
		todo.scrollToSpeed = msg.scrollToSpeed
		this.requestRepaint()
	}

	proto.user_scrollSet = function(msg){
		var todo = this.todoIds[msg.todoId]
		todo.xScroll = msg.x
		todo.yScroll = msg.y
		this.requestRepaint()
	}

	proto.user_newMesh = function(msg){
		var gl = this.gl
		var glbuffer = gl.createBuffer()
		this.meshIds[msg.meshId] = glbuffer
	}

	proto.user_updateMesh = function(msg){
		var gl = this.gl
		var glbuffer = this.meshIds[msg.meshId]

		glbuffer.length = msg.length

		glbuffer.updateId = this.frameId
		// check the type
		if(msg.arrayType === 'uint16'){
			glbuffer.array = new Uint16Array(msg.array)
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glbuffer)
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
		}
		else{
			glbuffer.array = new Float32Array(msg.array)
			gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer)
			gl.bufferData(gl.ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
		}
	}

	proto.slotsTable = {
		'float':1,
		'int':1,
		'vec2':2,
		'vec3':3,
		'vec4':4,
		'mat4':16
	}

	proto.user_newUbo = function(msg){
		var ubo = this.uboIds[msg.uboId]
		if(ubo) return console.error('new ubo already exists')
		var order = msg.order
		// compute offsets
		var offsets = {}
		var nmorder = []
		var size = 0
		var nameRev = this.nameRev
		for(var l = order.length, i = 0; i < l; i++){
			var item = order[i]
			item.name = nameRev[item.nameId]
			offsets[item.nameId] = size
			size += this.slotsTable[item.type]
		}
		var f32 = new Float32Array(size)
		this.uboIds[msg.uboId] = {
			order: order,
			offsets: offsets,
			f32: f32,
			i32: new Int32Array(f32.buffer)
		}
	}
	
	proto.user_updateUbo = function(msg){
		var ubo = this.uboIds[msg.uboId]
		ubo.f32 = new Float32Array(msg.buffer)
		ubo.i32 = new Int32Array(msg.buffer)
	}

	var vaofn = Array(4)

	vaofn[1] = function attributes(vao, i32, o){

		var gl = this.gl
		var startId = i32[o+2]
		var range = i32[o+3]
		var meshid = i32[o+4]
		var stride = i32[o+5]
		var offset = i32[o+6]
		var slotoff = 0
		var mesh = this.meshIds[meshid]

		vao.attrMesh = mesh

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
		var nameRev = this.nameRev
		var attrLocs = vao.shader.attrLocs
		for(var i = 0; i < range; i++){
			var loc = attrLocs[nameRev[startId+i]]
			gl.enableVertexAttribArray(loc.index)
			gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, stride * 4, offset*4 + slotoff)
			if(gl.ANGLE_instanced_arrays) gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(loc.index, 0)
			slotoff += loc.slots * 4
		}
	}

	vaofn[2] = function instances(vao, i32, o){
		var gl = this.gl
		var startId = i32[o+2]
		var range = i32[o+3]
		var meshid = i32[o+4]
		var stride = i32[o+5]
		var offset = i32[o+6]
		var divisor = i32[o+7]
		var slotoff = 0
		var mesh = this.meshIds[meshid]

		vao.instMesh = mesh

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
		var nameRev = this.nameRev
		var attrLocs = vao.shader.attrLocs
		for(var i = 0; i < range; i++){
			var loc = attrLocs[nameRev[startId+i]]
			var index = loc.index
			gl.enableVertexAttribArray(index)
			gl.vertexAttribPointer(index, loc.slots, gl.FLOAT, false, stride * 4, offset * stride  * 4 + slotoff)
			gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(index, divisor)
			slotoff += loc.slots * 4
		}
	}

	vaofn[3] = function indices(vao, i32, o){
		var gl = this.gl
		var mesh = this.meshIds[i32[o+2]]
		vao.indexMesh = mesh
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh)
	}

	proto.user_newVao = function(msg){
		var vao = this.vaoIds[msg.vaoId]
		//if(vao) return console.error('new vao already exists')
		var gl = this.gl
		vao = this.vaoIds[msg.vaoId] = gl.OES_vertex_array_object.createVertexArrayOES()
		vao.msg = msg
		
		gl.OES_vertex_array_object.bindVertexArrayOES(vao)

		vao.shader = this.shaderIds[msg.shaderId]
		var i32 = new Int32Array(msg.buffer)
		var len = msg.length
		var last = 0
		var repaint = false
		var todofn = this.todofn
		for(var o = 0; o < len; o += argc + 2){
			var fnid = i32[o]
			var argc = i32[o + 1]
			var fn = vaofn[fnid]
			if(!fn) console.error('cant find vao '+fnid)
			else fn.call(this, vao, i32, o)
		}

		gl.OES_vertex_array_object.bindVertexArrayOES(null)
	}

	// new shader helpers
	function addLineNumbers(code){
		var lines = code.split('\n')
		var out = ''
		for(var i = 0; i < lines.length; i++){
			out += (i+1)+': '+lines[i]+'\n'
		}
		return out	
	}

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

	function logShaderError(){
		var args = arguments
		for(var i =0 ; i < args.length; i++){
			var s = '' + args[i]
			if(s.length > 1024){
				out = ''
				var a = s.split('\n')
				for(j = 0; j < a.length; j++){
					out += a[j] + '\n'
					if(out.length>512){
						console.log(out)
						out = ''
					}
				}
			}
			else console.log(s)
		}
	}

	proto.compileShader = function(vertexcode, pixelcode){
		var gl = this.gl
		var vertexshader = gl.createShader(gl.VERTEX_SHADER)
		gl.shaderSource(vertexshader, vertexcode)
		gl.compileShader(vertexshader)
		if (!gl.getShaderParameter(vertexshader, gl.COMPILE_STATUS)){
			return logShaderError(gl.getShaderInfoLog(vertexshader), addLineNumbers(vertexcode))
		}
		
		// compile pixelshader
		var pixelshader = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(pixelshader, pixelcode)
		gl.compileShader(pixelshader)
		if (!gl.getShaderParameter(pixelshader, gl.COMPILE_STATUS)){
			return logShaderError(gl.getShaderInfoLog(pixelshader), addLineNumbers(pixelcode))
		}

		shader = gl.createProgram()
		gl.attachShader(shader, vertexshader)
		gl.attachShader(shader, pixelshader)
		gl.linkProgram(shader)
		if(!gl.getProgramParameter(shader, gl.LINK_STATUS)){
			return logShaderError(
				gl.getProgramInfoLog(shader),
				addLineNumbers(vertexcode), 
				addLineNumbers(pixelcode)
			)
		}

		// parse out uniforms and attributes
		var attrs = parseShaderAttributes(vertexcode)

		var uniforms = {}
		parseShaderUniforms(vertexcode, uniforms)
		parseShaderUniforms(pixelcode, uniforms)

		// look up attribute ids
		var attrLocs = {}
		var maxAttrIndex = 0
		for(var name in attrs){
			//var nameid = nameIds[name]
			var index = gl.getAttribLocation(shader, name)

			if(index > maxAttrIndex) maxAttrIndex = index
			attrLocs[name] = {
				index: index,
				slots: this.slotsTable[attrs[name]]
			}
		}

		var uniLocs = {}
		var uniVals = {}
		for(var name in uniforms){
			//var nameid = nameIds[name]
			var type = uniforms[name]
			var slots = this.slotsTable[type]
			if(slots > 1){
				uniVals[name] = new Float32Array(slots)
			}
			var index = gl.getUniformLocation(shader, name)
			uniLocs[name] = index
		}

		return {
			attrLocs:attrLocs,
			maxAttrIndex:maxAttrIndex,
			refCount:1,
			uniVals:uniVals,
			uniLocs:uniLocs,
			program:shader
		}
	}
}
