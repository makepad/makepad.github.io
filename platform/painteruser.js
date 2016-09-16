module.exports = function painterUser(proto){

	proto.onConstructPainterUser = function(){
		this.shaderIds = {}
		this.nameIds = {}
		this.meshIds = {}
		this.todoIds = {}
		this.textureIds = {}
		this.framebufferIds = {}
		this.localShaderCache = {}
	}

	proto.user_newName = function(msg){
		this.nameIds[msg.name] = msg.nameId
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

		var shader = this.localShaderCache[cacheid]
		if(shader){
			shader.refCount++
			this.shaderIds[shaderid] = shader
			return
		}

		shader = gl.globalShaderCache[cacheid] || (gl.globalShaderCache[cacheid] = this.compileShader(vertexcode, pixelcode))
		if(!shader) return

		shader = Object.create(shader)
		shader.refCount = 1
		this.mapShaderIO(shader, vertexcode, pixelcode)
		shader.name = msg.name
		this.shaderIds[shaderid] = shader
		this.localShaderCache[cacheid] = shader
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


	proto.user_assignTodoToFramebuffer = function(msg){
		// we are attaching a todo to a framebuffer.
		var framebuffer = this.framebufferIds[msg.fbId]
		framebuffer.todoId = msg.todoId
		// if we attached to the main framebuffer, repaint
		if(framebuffer === this.mainFramebuffer){
			this.requestRepaint()
		}
	}

	//
	//
	// Texture management
	//
	//

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

	//
	//
	// Todo management
	//
	//
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
		if(window.stamp){
			window.stamp1 = window.stamp
			window.stamp = undefined
		}
		//console.log("UPDATETODO",performance.now()-window.stamp)

		// lets just store the todo message as is
		var todo = this.todoIds[msg.todoId]

		// redefine deps
		var deps = msg.deps
		if(!todo.deps) todo.deps = []
		todo.deps.length = 0
		for(var key in deps){
			todo.deps.push(key)
		}

		todo.f32 = new Float32Array(msg.buffer)
		todo.i32 = new Int32Array(msg.buffer)
		todo.name = msg.name
		todo.length = msg.length
		todo.timeStart = msg.timeStart
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
		
		// what if we are the todo of the mainFrame
		if(this.mainFramebuffer && this.mainFramebuffer.todoId === todo.todoId){
			this.requestRepaint()
		}
	}

	proto.user_updateTodoTime = function(msg){
		var todo = this.todoIds[msg.todoId]
		todo.timeStart = msg.timeStart
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

	proto.user_newMesh = function(msg){
		var gl = this.gl
		var glbuffer = gl.createBuffer()
		this.meshIds[msg.meshId] = glbuffer
	}

	proto.user_updateMesh = function(msg){
		var gl = this.gl
		var glbuffer = this.meshIds[msg.meshId]

		if(glbuffer.drawDiscard = msg.drawDiscard){
			glbuffer.xOffset = msg.xOffset
			glbuffer.yOffset = msg.yOffset
			glbuffer.wOffset = msg.wOffset
			glbuffer.hOffset = msg.hOffset
		}

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

	var slotsTable = {
		'float':1,
		'vec2':2,
		'vec3':3,
		'vec4':4,
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

		return {
			program:shader
		}
	}

	proto.mapShaderIO = function(shader, vertexcode, pixelcode){
		var gl = this.gl
		var nameIds = this.nameIds
		// parse out uniforms and attributes
		var attrs = parseShaderAttributes(vertexcode)

		var uniforms = {}
		parseShaderUniforms(vertexcode, uniforms)
		parseShaderUniforms(pixelcode, uniforms)

		// look up attribute ids
		var attrlocs = {}
		var maxAttrIndex = 0
		for(var name in attrs){
			var nameid = nameIds[name]
			var index = gl.getAttribLocation(shader.program, name)

			if(index > maxAttrIndex) maxAttrIndex = index
			attrlocs[nameid] = {
				index: index,
				slots: slotsTable[attrs[name]]
			}
		}
		shader.attrlocs = attrlocs
		shader.maxAttrIndex = maxAttrIndex
		shader.refCount = 1
		var uniLocs = {}
		for(var name in uniforms){
			var nameid = nameIds[name]
			var index = gl.getUniformLocation(shader.program, name)
			uniLocs[nameid] = index
		}
		shader.uniLocs = uniLocs
	}

}
