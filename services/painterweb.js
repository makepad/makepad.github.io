var canvas = service.canvas
var args = service.args
var bus = service.bus

// api implementations
var todofn = Array(100)
var userfn = {}

var options = {
	alpha: canvas.getAttribute("noalpha")?false:true,
	depth: canvas.getAttribute("nodepth")?false:true,
	stencil: canvas.getAttribute("nostencil")?false:true,
	antialias: canvas.getAttribute("antialias")?true:false,
	premultipliedAlpha: canvas.getAttribute("premultipliedAlpha")?true:false,
	preserveDrawingBuffer: canvas.getAttribute("preserveDrawingBuffer")?true:false,
	preferLowPowerToHighPerformance: true//canvas.getAttribute("preferLowPowerToHighPerformance")?true:false,
}

var gl = canvas.getContext('webgl', options) ||
         canvas.getContext('webgl-experimental', options) ||
         canvas.getContext('experimental-webgl', options)

var canvasWidth = 0
var canvasHeight = 0

function resize(){
	var pixelratio = window.devicePixelRatio
	var w = canvasWidth = canvas.offsetWidth
	var h = canvasHeight = canvas.offsetHeight
	var sw = canvas.width = w * pixelratio
	var sh =  canvas.height = h * pixelratio
	canvas.style.width = w + 'px'
	canvas.style.height = h + 'px'

	gl.viewport(0,0,sw,sh)
	if(args.pixelratio){
		bus.postMessage({fn:'onResize', pixelratio:pixelratio, w:w, h:h})
	}
	args.pixelratio = window.devicePixelRatio
	args.w = canvas.offsetWidth
	args.h = canvas.offsetHeight
}

window.addEventListener('resize', resize)
resize()
// set the right width / height

function runTodo(todo){
	var f32 = todo.f32
	var i32 = todo.i32
	var len = todo.length
	for(var o = 0; o < len; o += argc + 2){
		var fnid = i32[o]
		var argc = i32[o + 1]
		var fn = todofn[fnid]
		if(!fn) console.error('cant find '+fnid)
		fn(i32, f32, o)
	}
}

var repaintPending = false
function repaint(time){
	repaintPending = false
	// lets set some globals
	globalLen = 0
	intGlobal(nameIds.painterPickPass, 0)
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.viewport(0,0,args.w*args.pixelratio,args.h*args.pixelratio)
	//mat4Global(nameIds.painterPickMat4, mat4)
	
	pickPass = false
	runTodo(mainFramebuffer.todo)
	//runTodo(mainFramebuffer.todo)
	// post a sync to the worker for time and frameId
	bus.postMessage({fn:'onSync', time:time/1000, frameId:frameId++})
}

function requestRepaint(){
	if(!repaintPending){
		repaintPending = true
		window.requestAnimationFrame(repaint)
	}
}

bus.onMessage = function(msg){
	userfn[msg.fn](msg)
}

// internal picking API
var pickBuf = new Uint8Array(4)
var pickMat = [
	1,0,0,0,
	0,1,0,0,
	0,0,1,0,
	0,0,0,1
]

var pickPass = false
var pickFb = gl.createFramebuffer()
var pickTex = gl.createTexture()
var pickZbuf = gl.createRenderbuffer()
gl.bindTexture(gl.TEXTURE_2D, pickTex)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0)
gl.bindRenderbuffer(gl.RENDERBUFFER, pickZbuf)
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, 1, 1)
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, pickZbuf)
gl.bindRenderbuffer(gl.RENDERBUFFER, null)

var pickDebug = false

exports.pick = function(x, y){

	if(!mainFramebuffer){
		return {hi:0,lo:0}
	}

	globalLen = 0

	var w = args.w / 2
	var h = args.h / 2

	var facx = pickDebug?1:w
	var facy = pickDebug?1:h

	pickMat[0] = facx
	pickMat[5] = facy
	pickMat[3] = -(x/w)*facx + (facx-1.)
	pickMat[7] = (y/h)*facy - (facy-1.)

	mat4Global(nameIds.painterPickMat4, pickMat)
	intGlobal(nameIds.painterPickPass, 1)

	if(!pickDebug){
		gl.viewport(0,0,1,1)
		gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb)
	}

	pickPass = true
	runTodo(mainFramebuffer.todo)
	gl.readPixels(0, 0, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pickBuf)
	return {
		hi:pickBuf[0],
		lo:(pickBuf[1]<<8)|pickBuf[2]
	}
}

// load extensions
var OES_standard_derivatives = gl.getExtension('OES_standard_derivatives')
var ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays')
var EXT_blend_minmax = gl.getExtension('EXT_blend_minmax')
var OES_texture_half_float_linear = gl.getExtension('OES_texture_half_float_linear')
var OES_texture_float_linear = gl.getExtension('OES_texture_float_linear')
var OES_texture_half_float = gl.getExtension('OES_texture_half_float')
var OES_texture_float = gl.getExtension('OES_texture_float')

// resources
var shaderIds = {}
var nameIds = {}
var meshids = {}
var todoIds = {}
var textureIds = {}
var framebufferIds = {}
var mainFramebuffer
var frameId = 0

var currentShader
var currentUniLocs

var slotsTable = {
	'float':1,
	'vec2':2,
	'vec3':3,
	'vec4':4,
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

//
//
// Globals, for setting them in the main thread
//
//

var globalF32 = new Float32Array(1000)
var globalI32 = new Int32Array(1000)
var globals = Array(1000)
var globalsLen = 0

function intGlobal(nameId, x){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
	i32[o+0] = 10
	i32[o+1] = 2
	i32[o+2] = nameId
	i32[o+3] = x
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 10
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	globalsLen += 5
}

function mat4Global(nameId, m){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
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
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 15
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	globalsLen += 5
}

//
//
// Framebuffer management
//
//

userfn.newFramebuffer = function(msg){
	if(!msg.attach){ // main framebuffer
		mainFramebuffer = framebufferIds[msg.fbId] = {
			todo:undefined
		}
	}
	else{
		// lets resolve all textures and store it
		var attach = {}
		for(var key in msg.attach){
			attach[key] = textureIds[msg.attach[key]]
		}
		// store it
		framebufferIds[msg.fbId] = {
			todo:undefined,
			attach:attach
		}
	}
}

userfn.attachFramebufferTodo = function(msg){
	// we are attaching a todo to a framebuffer.
	var framebuffer = framebufferIds[msg.fbId]
	framebuffer.todo = todoIds[msg.todoId]

	// if we attached to the main framebuffer, repaint
	if(framebuffer === mainFramebuffer){
		requestRepaint()
	}
}

todofn[40] = function clear(i32, f32, o){
	var mask = i32[o+2]
	var clr = 0
	if(mask&1){
		if(!pickPass){
			gl.clearColor(f32[o+3],f32[o+4], f32[o+5], f32[o+6])
		} else {
			gl.clearColor(0,0,0,0)
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

todofn[41] = function blending(i32, f32, o){
	gl.enable(gl.BLEND)
	gl.blendEquationSeparate(i32[o+3], i32[o+6])
	gl.blendFuncSeparate(i32[o+2],i32[o+4],i32[o+5],i32[o+7])
	gl.blendColor(f32[o+8], f32[o+9], f32[o+10], f32[o+11])
}

//
//
//	Shader management
//
//

userfn.newShader = function(msg){
	var pixelcode = msg.code.pixel
	var vertexcode = msg.code.vertex
	var shaderid = msg.shaderId

	pixelcode =  "#extension GL_OES_standard_derivatives : enable\n"+
	             pixelcode
	vertexcode = vertexcode

	// compile vertexshader
	var vertexshader = gl.createShader(gl.VERTEX_SHADER)
	gl.shaderSource(vertexshader, vertexcode)
	gl.compileShader(vertexshader)
	if (!gl.getShaderParameter(vertexshader, gl.COMPILE_STATUS)){
		return console.error(gl.getShaderInfoLog(vertexshader), addLineNumbers(vertexcode))
	}
	
	// compile pixelshader
	var pixelshader = gl.createShader(gl.FRAGMENT_SHADER)
	gl.shaderSource(pixelshader, pixelcode)
	gl.compileShader(pixelshader)
	if (!gl.getShaderParameter(pixelshader, gl.COMPILE_STATUS)){
		return console.error(gl.getShaderInfoLog(pixelshader), addLineNumbers(pixelcode))
	}

	var shader = gl.createProgram()
	gl.attachShader(shader, vertexshader)
	gl.attachShader(shader, pixelshader)
	gl.linkProgram(shader)
	if(!gl.getProgramParameter(shader, gl.LINK_STATUS)){
		return console.error(
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
	var attrlocs = {}
	var maxindex = 0
	for(var name in attrs){
		var nameid = nameIds[name]
		var index = gl.getAttribLocation(shader, name)
		if(index > maxindex) maxindex = index
		attrlocs[nameid] = {
			index: index,
			slots: slotsTable[attrs[name]]
		}
	}
	shader.attrlocs = attrlocs
	shader.maxindex = maxindex

	var uniLocs = {}
	for(var name in uniforms){
		var nameid = nameIds[name]
		var index = gl.getUniformLocation(shader, name)
		uniLocs[nameid] = index
	}
	shader.uniLocs = uniLocs
	// store it
	shaderIds[shaderid] = shader

}

todofn[2] = function useShader(i32, f32, o){
	var shaderid = i32[o+2]
	var shader = shaderIds[shaderid]
	// check last maxindex

	var prevmax = -1
	if(currentShader){
		prevmax = currentShader.maxindex
	}

	if(prevmax > shader.maxindex){
		for(var i = shader.maxindex+1; i <= prevmax; i++){
			gl.disableVertexAttribArray(i)
		}
	}
	else if(prevmax < shader.maxindex){
		for(var i = shader.maxindex; i > prevmax; i--){
			gl.enableVertexAttribArray(i)
		}
	}

	currentShader = shader
	currentUniLocs = shader.uniLocs
	shader.instanced = false
	shader.indexed = false
	shader.samplers = 0
	gl.useProgram(shader)
}

//
//
// Geometry management
//
//

userfn.newMesh = function(msg){
	var glbuffer = gl.createBuffer()
	meshids[msg.meshId] = glbuffer
}

userfn.updateMesh = function(msg){
	var glbuffer = meshids[msg.meshId]
	glbuffer.array = msg.array
	glbuffer.length = msg.length
	gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer)
	gl.bufferData(gl.ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
}


todofn[3] = function attributes(i32, f32, o){
	var startnameid = i32[o+2]
	var range = i32[o+3]
	var meshid = i32[o+4]
	var stride = i32[o+5]
	var offset = i32[o+6]
	var slotoff = 0
	var mesh = meshids[meshid]
	currentShader.attrlength = mesh.length

	gl.bindBuffer(gl.ARRAY_BUFFER, mesh)

	for(var i = 0; i < range; i++){
		var loc = currentShader.attrlocs[startnameid+i]
		gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, stride, offset + slotoff)
		ANGLE_instanced_arrays.vertexAttribDivisorANGLE(loc.index, 0)
		slotoff += loc.slots * 4
	}
}

todofn[4] = function instances(i32, f32, o){
	var startnameid = i32[o+2]
	var range = i32[o+3]
	var meshid = i32[o+4]
	var stride = i32[o+5]
	var offset = i32[o+6]
	var divisor = i32[o+7]
	var slotoff = 0
	var mesh = meshids[meshid]

	currentShader.instlength = mesh.length
	currentShader.instanced = true
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
	for(var i = 0; i < range; i++){
		var loc = currentShader.attrlocs[startnameid+i]
		var index = loc.index
		gl.vertexAttribPointer(index, loc.slots, gl.FLOAT, false, stride, offset + slotoff)
		ANGLE_instanced_arrays.vertexAttribDivisorANGLE(index, divisor)
		slotoff += loc.slots * 4
	}
}

todofn[5] = function indexes(){

}

//
//
// Texture management
//
//

// texture flags
var painter = {}

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
painter.CUBEMAP = 1<<18
painter.LINEAR = 1<<19 // little cheat flag for framebuffer textures

userfn.newTexture = function(msg){
	var tex = textureIds[msg.texId]
	if(!tex){
		tex = textureIds[msg.texId] = {samplers:{}}
		tex.flags = msg.flags
	}
	tex.w = msg.w
	tex.h = msg.h
	tex.array = msg.array
	tex.updateId = frameId
	var flags = tex.flags 
}

function bufTypeFromFlags(flags){
	if(flags & painter.RGBA === painter.RGBA){
		return gl.RGBA
	}
	if(flags & painter.ALPHA){
		if(flags & painter.LUMINANCE) return gl.LUMINANCE_ALPHA
		return gl.ALPHA
	}
	if(flags & painter.LUMINANCE) return gl.LUMINANCE
	if(flags & painter.RGB){
		return gl.RGB
	}
}

function dataTypeFromFlags(flags){
	if(flags & painter.FLOAT){
		return OES_texture_float && gl.FLOAT
	}
	if(flags & painter.HALF_FLOAT){
		return OES_texture_half_float.HALF_FLOAT_OES
	}
	if(flags &painter.FLOAT_LINEAR){
		return OES_texture_float_linear.FLOAT_LINEAR_OES
	}
	if(flags & painter.HALF_FLOAT_LINEAR){
		return OES_texture_half_float_linear.HALF_FLOAT_LINEAR_OES
	}
	return gl.UNSIGNED_BYTE
}

// sampler props
var samplerProps = {
	1: gl.NEAREST,
	2: gl.LINEAR,
	3: gl.NEAREST_MIPMAP_NEAREST,
	4: gl.LINEAR_MIPMAP_NEAREST,
	5: gl.NEAREST_MIPMAP_LINEAR,
	6: gl.LINEAR_MIPMAP_LINEAR,
	10: gl.REPEAT,
	11: gl.CLAMP_TO_EDGE,
	12: gl.MIRRORED_REPEAT
}

todofn[8] = function sampler(i32, f32, o){
	// this thing lazily creates textures and samplers
	var nameid = i32[o+2]
	var isfb = i32[o+3]

	var tex = textureIds[i32[o+4]]

	var samplerType = i32[o+5]
	var sam = tex.samplers[samplerType] || (tex.samplers[samplerType] = {})

	var texid = currentShader.samplers++

	if(sam.updateId !== tex.updateId){
		if(sam.gltex) gl.deleteTexture(sam.gltex)

		sam.gltex = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, sam.gltex)

		// lets set the flipy/premul
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tex.flags & painter.FLIP_Y?gl.TRUE:gl.FALSE)
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, tex.flags & painter.PREMULTIPLY_ALPHA?gl.TRUE:gl.FALSE)

		// lets figure out the flags
		var bufType = bufTypeFromFlags(tex.flags)
		var dataType = dataTypeFromFlags(tex.flags)
		// upload array
		gl.texImage2D(gl.TEXTURE_2D, 0, bufType, tex.w, tex.h, 0, bufType, dataType, new Uint8Array(tex.array))

		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplerProps[(samplerType>>0)&0xf])
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplerProps[(samplerType>>4)&0xf])

		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplerProps[(samplerType>>8)&0xf])
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplerProps[(samplerType>>12)&0xf])
	}
	
	// bind texture sampler slot?
}

//
//
// Uniforms
//
//

todofn[10] = function int(i32, f32, o){
	gl.uniform1i(currentUniLocs[i32[o+2]], i32[o+3])
}

todofn[11] = function float(i32, f32, o){
	gl.uniform1f(currentUniLocs[i32[o+2]], f32[o+3])
}

todofn[12] = function vec2(i32, f32, o){
	gl.uniform2f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4])
}

todofn[13] = function vec3(i32, f32, o){
	gl.uniform3f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5])
}

todofn[14] = function vec4(i32, f32, o){
	gl.uniform4f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5], f32[o+6])
}

var tmtx = new Float32Array(16)
todofn[15] = function mat4(i32, f32, o){
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
	gl.uniformMatrix4fv(currentUniLocs[i32[o+2]], 0, tmtx)
}

todofn[20] = 
todofn[21] = 
todofn[22] = 
todofn[23] = 
todofn[24] = 
todofn[25] = function globalValue(i32, f32, o){
	for(var nameid = i32[o+2], i = 0; i < globalsLen; i+=5) if(globals[i] === nameid) break
	globals[i] = nameid
	globals[i+1] = i32[o] - 10
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	if(i >= globalsLen) globalsLen = i+5
}

//
//
// Drawing
//
//


todofn[30] = function drawTriangles(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	if(currentShader.instanced){
		var start = i32[o+2]
		var end =  i32[o+3]
		var inst = i32[o+4]
		if(start < 0){
			start = 0
			end = currentShader.attrlength
			inst = currentShader.instlength
		}
		ANGLE_instanced_arrays.drawArraysInstancedANGLE(gl.TRIANGLES, start, end, inst)
	}
	else{
		var start = i32[o+2]
		var end =  i32[o+3]
		if(start < 0){
			start = 0
			end = currentShader.attrlength
		}
		gl.drawArrays(gl.TRIANGLES, start, end)
	}
}

todofn[31] = function drawLines(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINES, i32[o+2], i32[o+3])
}

todofn[32] = function drawLineLoop(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINE_LOOP, i32[o+2], i32[o+3])
}

todofn[33] = function drawLineStrip(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINE_STRIP, i32[o+2], i32[o+3])
}

todofn[34] = function drawTriangleStrip(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.TRIANGLE_STRIP, i32[o+2], i32[o+3])
}

todofn[35] = function drawTriangleFan(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.TRIANGLE_FAN, i32[o+2], i32[o+3])
}

//
//
// Misc
//
//

userfn.newName = function(msg){
	nameIds[msg.name] = msg.nameId
}

userfn.newTarget = function(msg){
	
}


//
//
// Todo management
//
//

userfn.newTodo = function(msg){
	todoIds[msg.todoId] = {f32:undefined, i32:undefined, length:0}
}

userfn.updateTodo = function(msg){
	var todo = todoIds[msg.todoId]
	todo.f32 = new Float32Array(msg.buffer)
	todo.i32 = new Int32Array(msg.buffer)
	todo.length = msg.length
}

todofn[50] = function addTodo(i32, f32, o){
}

