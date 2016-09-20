module.exports = function painterTodo(proto){

	proto.onConstructPainterTodo = function(){
		this.currentShader = undefined
		//this.currentUniLocs = undefined
		this.currentTodo = undefined
		this.repaintTime = 0

		var gl = this.gl
		// texture flags
		this.textureBufTypes = [
			gl.RGBA,
			gl.RGB,
			gl.ALPHA,
			gl.LUMINANCE,
			gl.LUMINANCE_ALPHA,
			gl.DEPTH_COMPONENT16,
			gl.STENCIL_INDEX,
			gl.DEPTH_STENCIL
		]

		this.textureDataTypes = [
			gl.UNSIGNED_BYTE,
			gl.UNSIGNED_SHORT,
			gl.OES_texture_float && gl.FLOAT,
			gl.OES_texture_half_float && gl.OES_texture_half_float.HALF_FLOAT_OES,
			gl.OES_texture_float_linear && gl.OES_texture_float_linear.FLOAT_LINEAR_OES,
			gl.OES_texture_half_float_linear && gl.OES_texture_half_float_linear.HALF_FLOAT_LINEAR_OES
		]

		// sampler props
		this.samplerFilter = [
			gl.NEAREST,
			gl.LINEAR,
			gl.NEAREST_MIPMAP_NEAREST,
			gl.LINEAR_MIPMAP_NEAREST,
			gl.NEAREST_MIPMAP_LINEAR,
			gl.LINEAR_MIPMAP_LINEAR
		]

		this.samplerWrap = [
			gl.REPEAT,
			gl.CLAMP_TO_EDGE,
			gl.MIRRORED_REPEAT
		]

		this.drawTypes = [
			gl.TRIANGLES,
			gl.TRIANGLE_STRIP,
			gl.TRIANGLE_FAN,
			gl.LINES,
			gl.LINE_STRIP,
			gl.LINE_LOOP
		]
	}

	proto.runTodo = function(todo){
		//console.log("Running todo "+todo.name)
		if(!todo) return false

		var lastTodo = this.currentTodo
		this.currentTodo = todo
		// set todoId
		var nameIds = this.nameIds
		var todoUbo = this.uboIds[todo.uboId]

		this.floatUbo(todoUbo, nameIds.this_DOT_todoId, todo.todoId)
		this.vec2fUbo(todoUbo, nameIds.this_DOT_viewScroll, todo.xScroll, todo.yScroll)
		this.vec4fUbo(todoUbo, nameIds.this_DOT_viewSpace, todo.xView, todo.yView, todo.xTotal, todo.yTotal)

		var f32 = todo.f32
		var i32 = todo.i32
		var len = todo.length
		var last = 0
		var repaint = false
		var todofn = this.todofn
		for(var o = 0; o < len; o += argc + 2){
			var fnid = i32[o]
			var argc = i32[o + 1]
			var fn = todofn[fnid]
			if(!fn) console.error('cant find '+fnid+ ' last was ' + last)
			last = fnid
			var ret = fn.call(this, i32, f32, o)
			if(ret) repaint = true
		}
		this.currentTodo = lastTodo
		if(!this.inPickPass && this.processScrollState(todo))return true
		if(repaint || todo.animLoop || todo.timeMax >= this.repaintTime)return true
	}

	var todofn = proto.todofn = new Array(100)

	todofn[1] = function addChildTodo(i32, f32, o){
		var todo = this.todoIds[i32[o+2]]
		var ret = this.runTodo(todo)
		return ret
	}

	todofn[2] = function useShader(i32, f32, o){
		var gl = this.gl
		var shaderid = i32[o+2]
		var shader = this.shaderIds[shaderid]
		// check last maxindex
		//var prevAttrMax = -1
		//if(this.gl.currentShader){
			//prevAttrMax = this.gl.currentShader.maxAttrIndex
			//shader.prevMaxTexIndex = currentShader.maxTexIndex || 0
		//}
		
		gl.currentShader = this.currentShader = shader
		
		if(shader){
			/*
			if(prevAttrMax > shader.maxAttrIndex){
				for(var i = shader.maxAttrIndex+1; i <= prevAttrMax; i++){
					gl.disableVertexAttribArray(i)
				}
			}
			else if(prevAttrMax < shader.maxAttrIndex){
				for(var i = shader.maxAttrIndex; i > prevAttrMax; i--){
					gl.enableVertexAttribArray(i)
				}
			}*/

			//this.currentUniLocs = shader.uniLocs
			//shader.maxTexIndex = -1
			//shader.instanced = false
			//shader.indexed = false
			shader.vao = undefined
			shader.samplers = 0
			shader.fallbackInstancedArrays = false
			gl.useProgram(shader.program)
		}
	}


	todofn[40] = function clear(i32, f32, o){
		var gl = this.gl
		var mask = i32[o+2]
		var clr = 0
		if(mask&1){
			if(!this.inPickPass){
				gl.clearColor(f32[o+3],f32[o+4], f32[o+5], f32[o+6])
			} else {
				gl.clearColor(this.currentTodo.todoId/255,0,0,this.worker.workerId/255)
			}
			clr |= gl.COLOR_BUFFER_BIT
		}
		if(mask&2){
			gl.clearDepth(f32[o+7])
			clr |= gl.DEPTH_BUFFER_BIT
		}
		if(mask&4){
			gl.clearStencil(i32[o+8])
			clr |= gl.STENCIL_BUFFER_BIT
		}
		gl.clear(clr)
	}

	var blendFn = proto.blendFn = [
		0x0, //painter.ZERO = 0
		0x1, //painter.ONE = 1
		0x300,//painter.SRC_COLOR = 2
		0x301,//painter.ONE_MINUS_SRC_COLOR = 3
		0x302,//painter.SRC_ALPHA = 4
		0x303,//painter.ONE_MINUS_SRC_ALPHA = 5
		0x304,//painter.DST_ALPHA = 6
		0x305,//painter.ONE_MINUS_DST_ALPHA = 7
		0x306,//painter.DST_COLOR = 8
		0x307,//painter.ONE_MINUS_DST_COLOR = 9
		0x308,//painter.SRC_ALPHA_SATURATE = 10
		0x8001,//painter.CONSTANT_COLOR = 11
		0x8002,//painter.ONE_MINUS_CONSTANT_COLOR = 12
	]
	
	var blendEq = proto.blendEq = [
		0x800a,//painter.FUNC_SUBTRACT = 0
		0x800b,//painter.FUNC_REVERSE_SUBTRACT = 1
		0x8006,//painter.FUNC_ADD = 2
		0x8007,//painter.MIN = 3
		0x8008//painter.MAX = 4
	]

	todofn[41] = function blending(i32, f32, o){
		var gl = this.gl
		if(this.inPickPass){
			gl.disable(gl.BLEND)
			return
		}
		gl.enable(gl.BLEND)
		gl.blendEquationSeparate(blendEq[i32[o+3]], blendEq[i32[o+6]])
		gl.blendFuncSeparate(blendFn[i32[o+2]],blendFn[i32[o+4]],blendFn[i32[o+5]],blendFn[i32[o+7]])
		gl.blendColor(f32[o+8], f32[o+9], f32[o+10], f32[o+11])
	}

	// other flags
	proto.textureFlags = {
		FLIP_Y: 1<<0,
		PREMULTIPLY_ALPHA: 1<<1,
		CUBEMAP: 1<<2,
		SAMPLELINEAR: 1<<3
	}

	todofn[8] = function sampler(i32, f32, o){
		var gl = this.gl
		var currentShader = this.currentShader
		//var currentUniLocs = this.currentUniLocs
		if(!currentShader) return

		// this thing lazily creates textures and samplers
		var nameid = i32[o+2]
		var tex = this.textureIds[i32[o+3]]
		var samplerType = i32[o+4]

		var sam = tex.samplers[samplerType] || (tex.samplers[samplerType] = {})

		var texid = currentShader.samplers++

		// its a data texture
		// otherwise it should exist already
		if(sam.updateId !== tex.updateId && tex.array){
			sam.updateId = tex.updateId
			if(sam.gltex) gl.deleteTexture(sam.gltex)

			sam.gltex = gl.createTexture()
			gl.bindTexture(gl.TEXTURE_2D, sam.gltex)

			// lets set the flipy/premul
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tex.flags & this.textureFlags.FLIP_Y?gl.TRUE:gl.FALSE)
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, tex.flags & this.textureFlags.PREMULTIPLY_ALPHA?gl.TRUE:gl.FALSE)

			// lets figure out the flags
			var bufType = this.textureBufTypes[tex.bufType]
			var dataType = this.textureDataTypes[tex.dataType]
			// upload array
			var dt = performance.now()
			//gl.texSubImage2D(gl.TEXTURE_2D, 1, 0, 0, tex.w, tex.h, bufType, dataType, new Uint8Array(tex.array), 0)
			gl.texImage2D(gl.TEXTURE_2D, 0, bufType, tex.w, tex.h, 0, bufType, dataType, new Uint8Array(tex.array))
			//console.log(performance.now()-dt, tex.array.byteLength, dataType)
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.samplerFilter[(samplerType>>0)&0xf])
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.samplerFilter[(samplerType>>4)&0xf])
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.samplerWrap[(samplerType>>8)&0xf])
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.samplerWrap[(samplerType>>12)&0xf])
		}
		if(!sam.gltex){
			return console.log("sampler texture invalid")
		}

		// bind it
		//currentShader.maxTexIndex = texid
		gl.activeTexture(gl.TEXTURE0 + texid)
		gl.bindTexture(gl.TEXTURE_2D, sam.gltex)
		gl.uniform1i(currentShader.uniLocs[this.nameRev[i32[o+2]]], texid)
	}

	//
	//
	// Ubos, fake for now. Coming in webGL 2
	//
	//

	var uboMap = {
		float:function floatUbo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var v = f32[o]
			if(uniVals[name] === v) return
			uniVals[name] = v
			gl.uniform1f(loc, v)
		},
		int:function intUbo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var o = offsets[name]
			var v = i32[o]
			if(uniVals[name] === v) return
			uniVals[name] = v
			gl.uniform1i(loc, v)
		},		
		vec2:function vec2Ubo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var p = uniVals[name]
			var f0 = f32[o]
			var f1 = f32[o+1]
			if(p[0] === f0 && p[1] === f1) return
			p[0] = f0
			p[1] = f1
			gl.uniform2f(loc, f0, f1)
		},
		vec3:function vec3Ubo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var p = uniVals[name]
			var f0 = f32[o]
			var f1 = f32[o+1]
			var f2 = f32[o+1]
			if(p[0] === f0 && p[1] === f1 && p[2] === f2) return
			p[0] = f0
			p[1] = f1
			p[2] = f2
			gl.uniform3f(loc, f0, f1, f2)
		},
		vec4:function vec4Ubo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var p = uniVals[name]
			if(!p) return
			var f0 = f32[o]
			var f1 = f32[o+1]
			var f2 = f32[o+2]
			var f3 = f32[o+3]
			if(p[0] === f0 && p[1] === f1 && p[2] === f2 && p[3] === f3) return
			p[0] = f0
			p[1] = f1
			p[2] = f2
			p[3] = f3
			gl.uniform4f(loc, f0, f1, f2, f3)
		},
		mat4:function mat4Ubo(gl, uniVals, uniLocs, name, i32, f32, o){
			var loc = uniLocs[name]
			if(!loc)return
			var p = uniVals[name]
			var f0 = f32[o]
			var f1 = f32[o+1]
			var f2 = f32[o+2]
			var f3 = f32[o+3]
			var f4 = f32[o+4]
			var f5 = f32[o+5]
			var f6 = f32[o+6]
			var f7 = f32[o+7]
			var f8 = f32[o+8]
			var f9 = f32[o+9]
			var f10 = f32[o+10]
			var f11 = f32[o+11]
			var f12 = f32[o+12]
			var f13 = f32[o+13]
			var f14 = f32[o+14]
			var f15 = f32[o+15]
			if(p[0] === f0 && p[1] === f1 && p[2] === f2 && p[3] === f3 && 
			   p[4] === f4 && p[5] === f5 && p[6] === f6 && p[7] === f7 && 
			   p[8] === f8 && p[9] === f9 && p[10] === f10 && p[11] === f11 && 
			   p[12] === f12 && p[13] === f13 && p[14] === f14 && p[15] === f15) return
			p[0] = f0
			p[1] = f1
			p[2] = f2
			p[3] = f3
			p[4] = f4
			p[5] = f5
			p[6] = f6
			p[7] = f7
			p[8] = f8
			p[9] = f9
			p[10] = f10
			p[11] = f11
			p[12] = f12
			p[13] = f13
			p[14] = f14
			p[15] = f15
			gl.uniformMatrix4fv(loc, 0, p)
		}
	}

	window.typestats = {}
	
	todofn[20] = function ubo(i32, f32, o){
		// lets assign our ubo.
		//var nameId = o32[o+2]
		var gl = this.gl
		var shader = this.currentShader
		var uniLocs = shader.uniLocs
		var uniVals = shader.uniVals
		var ubo = this.uboIds[i32[o+3]]
		var order = ubo.order
		var offsets = ubo.offsets
		var i32 = ubo.i32
		var f32 = ubo.f32
		for(var l = order.length, i = 0; i < l; i++){
			var prop = order[i]
			uboMap[prop.type](gl, uniVals, uniLocs, prop.name, i32, f32, offsets[prop.nameId])
		}
	}

	todofn[21] = function vao(i32, f32, o){
		var vao = this.vaoIds[i32[o+2]]
		this.currentShader.vao = vao
		this.gl.OES_vertex_array_object.bindVertexArrayOES(vao)
	}

	//
	//
	// Drawing
	//
	//

	//ANGLE_instanced_arrays = undefined
	todofn[30] = function draw(i32, f32, o, pthis){
		var currentShader = this.currentShader
		//var currentUniLocs = this.currentUniLocs
		var globals = this.globals
		var gl = this.gl

		if(!currentShader) return

		// set the global uniforms
		var type = this.drawTypes[i32[o+2]]
		var vao = currentShader.vao

		if(vao.instMesh){
			var offset = i32[o+3]
			var len =  i32[o+4]
			var inst = i32[o+5]
			if(vao.indexMesh){
				if(offset < 0){
					offset = 0
					len = vao.indexMesh.length
					inst = vao.instMesh.length
				}
				gl.ANGLE_instanced_arrays.drawElementsInstancedANGLE(type, len, gl.UNSIGNED_SHORT, offset, inst)
			}
			else{
				if(offset < 0){
					offset = 0
					len = vao.attrMesh.length
					inst = vao.instMesh.length
				}
				gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(type, offset, len, inst)
			}
		}
		else{
			var offset = i32[o+3]
			var len =  i32[o+4]
			if(vao.indexMesh){
				if(offset < 0){
					offset = 0
					len = vao.indexMesh.length
				}
				gl.drawElements(type, len, gl.UNSIGNED_SHORT, offset)
			}
			else{
				if(offset < 0){
					offset = 0
					len = vao.attrMesh.length
				}
				gl.drawArrays(type, offset, len)
			}
		}
	}

}