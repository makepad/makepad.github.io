module.exports = function painterTodo(proto){

	proto.onConstructPainterTodo = function(){
		this.currentShader = undefined
		this.currentUniLocs = undefined
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
		this.floatGlobal(nameIds.this_DOT_todoId, todo.todoId)
		this.vec2fGlobal(nameIds.this_DOT_viewScroll, todo.xScroll, todo.yScroll)
		this.vec4fGlobal(nameIds.this_DOT_viewSpace, todo.xView, todo.yView, todo.xTotal, todo.yTotal)
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
		if(repaint || todo.animLoop || todo.timeMax > this.repaintTime)return true
	}

	var todofn = proto.todofn = new Array(100)

	todofn[1] = function addChildTodo(i32, f32, o){
		var todo = this.todoIds[i32[o+2]]
		var ret = this.runTodo(todo)
		var todo = this.currentTodo
		var nameIds = this.nameIds
		// put back previous todo globals
		this.floatGlobal(nameIds.this_DOT_todoId, todo.todoId)
		this.vec2fGlobal(nameIds.this_DOT_viewScroll, todo.xScroll, todo.yScroll)
		this.vec4fGlobal(nameIds.this_DOT_viewSpace, todo.xView, todo.yView, todo.xTotal, todo.yTotal)
		return ret
	}

	todofn[2] = function useShader(i32, f32, o){
		var gl = this.gl
		var shaderid = i32[o+2]
		var shader = this.shaderIds[shaderid]
		// check last maxindex
		var prevAttrMax = -1
		if(this.gl.currentShader){
			prevAttrMax = this.gl.currentShader.maxAttrIndex
			//shader.prevMaxTexIndex = currentShader.maxTexIndex || 0
		}
		
		gl.currentShader = this.currentShader = shader
		
		if(shader){
			if(prevAttrMax > shader.maxAttrIndex){
				for(var i = shader.maxAttrIndex+1; i <= prevAttrMax; i++){
					gl.disableVertexAttribArray(i)
				}
			}
			else if(prevAttrMax < shader.maxAttrIndex){
				for(var i = shader.maxAttrIndex; i > prevAttrMax; i--){
					gl.enableVertexAttribArray(i)
				}
			}

			this.currentUniLocs = shader.uniLocs
			//shader.maxTexIndex = -1
			shader.instanced = false
			shader.indexed = false
			shader.samplers = 0
			shader.fallbackInstancedArrays = false
			gl.useProgram(shader.program)
		}
	}

	todofn[3] = function attributes(i32, f32, o, pthis){
		var currentShader = this.currentShader
		var gl = this.gl
		if(!currentShader) return
		var startId = i32[o+2]
		var range = i32[o+3]
		var meshid = i32[o+4]
		var stride = i32[o+5]
		var offset = i32[o+6]
		var slotoff = 0
		var mesh = this.meshIds[meshid]

		this.currentShader.attrlength = mesh.length

		if(!gl.ANGLE_instanced_arrays){
			if(!currentShader.fallbackInstancedArrays) currentShader.fallbackInstancedArrays = {attr:{}, inst:{}}
			var attr = currentShader.fallbackInstancedArrays.attr
			attr.mesh = mesh
			attr.stride = stride
			attr.startId = startId
			attr.range = range
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)

		for(var i = 0; i < range; i++){
			var loc = currentShader.attrlocs[startId+i]
			gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, stride * 4, offset*4 + slotoff)
			if(gl.ANGLE_instanced_arrays) gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(loc.index, 0)
			slotoff += loc.slots * 4
		}
	}

	todofn[4] = function instances(i32, f32, o){
		var currentShader = this.currentShader
		var gl = this.gl
		if(!currentShader) return

		var startId = i32[o+2]
		var range = i32[o+3]
		var meshid = i32[o+4]
		var stride = i32[o+5]
		var offset = i32[o+6]
		var divisor = i32[o+7]
		var slotoff = 0
		var mesh = this.meshIds[meshid]

		// fast geometry clipping
		var len = mesh.length
		
		if( mesh.yOffset &&  len > 100 && mesh.drawDiscard === 'y'){ // otherwise dont bother
			var array = mesh.array
			var yScroll = this.currentTodo.yScroll
			var yMax = this.currentTodo.yView
			var yOffset = mesh.yOffset
			var hOffset = mesh.hOffset
			var guard = yMax*0.5
			for(var start = 0; start < len; start += 100){
				var o = stride*start
				if(array[o + yOffset] - yScroll + (hOffset?array[o + hOffset]:guard) >= 0) break
			}
			start = Math.max(start - 100,0)

			for(var end = start; end < len; end += 100){
				if(array[stride*end + yOffset] - yScroll - guard> yMax) break
			}
			end = Math.min(end, len)
			offset = start 
			len = end - start
		}

		currentShader.instlength = len
		currentShader.instanced = true

		if(!gl.ANGLE_instanced_arrays){
			if(!currentShader.fallbackInstancedArrays) currentShader.fallbackInstancedArrays = {attr:{}, inst:{}}
			var inst = currentShader.fallbackInstancedArrays.inst
			inst.mesh = mesh
			inst.stride = stride
			inst.startId = startId
			inst.range = range
			inst.offset = offset
			inst.len = len
			return
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
		for(var i = 0; i < range; i++){
			var loc = currentShader.attrlocs[startId+i]
			var index = loc.index
			gl.vertexAttribPointer(index, loc.slots, gl.FLOAT, false, stride * 4, offset * stride  * 4 + slotoff)
			gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(index, divisor)
			slotoff += loc.slots * 4
		}
	}

	todofn[5] = function indices(i32, f32, o){
		var gl = this.gl
		var currentShader = this.currentShader
		if(!currentShader) return
		var mesh = this.meshIds[i32[o+2]]
		currentShader.attrlength = mesh.length
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh)
		currentShader.indexed = true
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
		var currentUniLocs = this.currentUniLocs
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
			gl.texImage2D(gl.TEXTURE_2D, 0, bufType, tex.w, tex.h, 0, bufType, dataType, new Uint8Array(tex.array))

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
		gl.uniform1i(currentUniLocs[i32[o+2]], texid)
	}

	//
	//
	// Uniforms
	//
	//

	todofn[10] = function intUniform(i32, f32, o){
		if(!this.currentShader) return
		this.gl.uniform1i(this.currentUniLocs[i32[o+2]], i32[o+3])
	}

	todofn[11] = function floatUniform(i32, f32, o){
		if(!this.currentShader) return
		this.gl.uniform1f(this.currentUniLocs[i32[o+2]], f32[o+3])
	}

	todofn[12] = function vec2Uniform(i32, f32, o){
		if(!this.currentShader) return
		this.gl.uniform2f(this.currentUniLocs[i32[o+2]], f32[o+3], f32[o+4])
	}

	todofn[13] = function vec3Uniform(i32, f32, o){
		if(!this.currentShader) return
		this.gl.uniform3f(this.currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5])
	}

	todofn[14] = function vec4Uniform(i32, f32, o){
		if(!this.currentShader) return
		this.gl.uniform4f(this.currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5], f32[o+6])
	}

	var identity = [
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1
	]

	var tmtx = new Float32Array(16)
	todofn[15] = function mat4Uniform(i32, f32, o){
		if(!this.currentShader) return
		tmtx[0] = f32[o+3]
		tmtx[1] = f32[o+4]
		tmtx[2] = f32[o+5]
		tmtx[3] = f32[o+6]
		tmtx[4] = f32[o+7]
		tmtx[5] = f32[o+8]
		tmtx[6] = f32[o+9]
		tmtx[7] = f32[o+10]
		tmtx[8] = f32[o+11]
		tmtx[9] = f32[o+12]
		tmtx[10] = f32[o+13]
		tmtx[11] = f32[o+14]
		tmtx[12] = f32[o+15]
		tmtx[13] = f32[o+16]
		tmtx[14] = f32[o+17]
		tmtx[15] = f32[o+18]

		this.gl.uniformMatrix4fv(this.currentUniLocs[i32[o+2]], 0, tmtx)
	}

	//
	//
	// Globals
	//
	//

	todofn[20] = 
	todofn[21] = 
	todofn[22] = 
	todofn[23] = 
	todofn[24] = 
	todofn[25] = function globalValue(i32, f32, o, pthis){
		var globals = this.globals
		for(var nameid = i32[o+2], i = 0, l = this.globalsLen; i < l; i+=5) if(globals[i] === nameid) break
		globals[i] = nameid
		globals[i+1] = i32[o] - 10
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		if(i >= l) this.globalsLen = i+5
	}

	//
	//
	// Drawing
	//
	//

	//ANGLE_instanced_arrays = undefined
	todofn[30] = function draw(i32, f32, o, pthis){
		var currentShader = this.currentShader
		var currentUniLocs = this.currentUniLocs
		var globals = this.globals
		var gl = this.gl

		if(!currentShader) return
		if(currentShader.name === 'Surface'){
		}
		// set the global uniforms
		var type = this.drawTypes[i32[o+2]]
		for(var i = 0, l = this.globalsLen; i < l; i+=5){
			if(currentUniLocs[globals[i]] !== undefined){
				todofn[globals[i+1]].call(this, globals[i+2], globals[i+3], globals[i+4])
			}
		}

		if(currentShader.instanced){

			if(currentShader.fallbackInstancedArrays){
				// alright we need to construct an array which is
				var fb = currentShader.fallbackInstancedArrays
				// well use the instances mesh
				var instmesh = fb.inst.mesh
				var vertexsize = fb.attr.stride + fb.inst.stride
				var instlen = fb.inst.mesh.length
				var attrlen = fb.attr.mesh.length
				var inststride = fb.inst.stride
				var attrstride = fb.attr.stride
				var numvertices = instlen * attrlen
				var totalsize = numvertices * vertexsize
				var attrarray = fb.attr.mesh.array
				var instarray = fb.inst.mesh.array
				// lets check if we need to update it
				if(instmesh.fbUpdateId !== instmesh.updateId){
					//console.log("UYPDATE",instmesh.fbUpdateId,instmesh.updateId)
					instmesh.fbUpdateId = instmesh.updateId
					var array = instmesh.fbArray = new Float32Array(totalsize)
					for(var i = 0; i < numvertices; i++){
						// first write the attribute data
						var o = i * vertexsize
						var attrvertex = (i % attrlen) * attrstride
						for(var j = 0; j < attrstride; j++){
							array[o++] =  attrarray[attrvertex + j]
						}
						// write the instance data
						var instvertex = Math.floor(i / attrlen) * inststride
						for(var j = 0; j < inststride; j++){
							array[o++] =  instarray[instvertex + j]
						}
					}
					// update geometry
					if(!instmesh.fbglbuf) instmesh.fbglbuf = gl.createBuffer()
					gl.bindBuffer(gl.ARRAY_BUFFER, instmesh.fbglbuf )
					gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW)
				}
				gl.bindBuffer(gl.ARRAY_BUFFER, instmesh.fbglbuf )

				// set all attributes
				var range = fb.attr.range
				var startId = fb.attr.startId
				var slotoff = 0
				for(var i = 0; i < range; i++){
					var loc = currentShader.attrlocs[startId+i]
					gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, vertexsize * 4, slotoff)
					slotoff += loc.slots * 4
				}

				var range = fb.inst.range
				var startId = fb.inst.startId
				for(var i = 0; i < range; i++){
					var loc = currentShader.attrlocs[startId+i]
					if(loc.index !== -1) gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, vertexsize * 4, slotoff)
					slotoff += loc.slots * 4
				}
				if(currentShader.indexed){
					gl.drawElements(type, fb.inst.len * attrlen, gl.UNSIGNED_SHORT, fb.inst.offset * attrlen)
				}
				else{
					gl.drawArrays(type, fb.inst.offset * attrlen, fb.inst.len * attrlen)
				}
			}
			else{
				var offset = i32[o+3]
				var len =  i32[o+4]
				var inst = i32[o+5]
				if(offset < 0){
					offset = 0
					len = currentShader.attrlength
					inst = currentShader.instlength
				}
				if(currentShader.indexed){
					gl.ANGLE_instanced_arrays.drawElementsInstancedANGLE(type, len, gl.UNSIGNED_SHORT, offset, inst)
				}
				else{
					gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(type, offset, len, inst)
				}
			}
		}
		else{
			var offset = i32[o+3]
			var len =  i32[o+4]
			if(offset < 0){
				offset = 0
				len = currentShader.attrlength
			}
			if(currentShader.indexed){
				gl.drawElements(type, len, gl.UNSIGNED_SHORT, offset)
			}
			else{
				gl.drawArrays(type, offset, len)
			}
		}
	}
}