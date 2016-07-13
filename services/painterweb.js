var canvas = service.canvas
var args = service.args
var bus = service.bus

function addLineNumbers(code){
	var lines = code.split('\n')
	var out = ''
	for(var i = 0; i < lines.length; i++){
		out += (i+1)+': '+lines[i]+'\n'
	}
	return out	
}

// resources
var shaderids = {}
var nameids = {}
var meshids = {}
var todoids = {}

var slotstable = {
	'float':1,
	'vec2':2,
	'vec3':3,
	'vec4':4,
}

var userMessage = {
	newTarget: function(msg){
		
	},
	newShader: function(msg){

		var pixelcode = msg.code.pixel
		var vertexcode = msg.code.vertex
		var shaderid = msg.shaderid

		pixelcode =  "#extension GL_OES_standard_derivatives : enable\n"+
		             "precision highp float;\n"+pixelcode
		vertexcode = "precision highp float;\n"+vertexcode

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
			console.log(
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
		for(var name in attrs){
			var nameid = nameids[name]
			var index = gl.getAttribLocation(shader, name)
			attrlocs[nameid] = {
				index: index,
				slots: slotstable[attrs[name]]
			}
		}
		shader.attrlocs = attrlocs

		var unilocs = {}
		for(var name in uniforms){
			var nameid = nameids[name]
			var index = gl.getUniformLocation(shader, name)
			unilocs[nameid] = index
		}
		shader.unilocs = unilocs
		// store it
		shaderids[shaderid] = shader

	},
	newMesh: function(msg){
		var buffer = gl.createBuffer()
		meshids[msg.meshid] = buffer
	},
	newName: function(msg){
		nameids[msg.name] = msg.nameid
	},
	newTodo: function(msg){
		todoids[msg.todoid] = {f32:undefined, i32:undefined, length:0}
	},
	updateTodo: function(msg){
		var todo = todoids[msg.todoid]
		todo.f32 = new Float32Array(msg.buffer)
		todo.i32 = new Int32Array(msg.buffer)
		todo.length = msg.length
	},
	updateMesh: function(msg){
		var buffer = meshids[msg.meshid]
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
	},
	syncDraw: function(msg){
		
	}
}

exports.pick = function(x, y){
	return {
		high:0,
		low:0
	}
}

var options = {
	alpha: canvas.getAttribute("noalpha")?false:true,
	depth: canvas.getAttribute("nodepth")?false:true,
	stencil: canvas.getAttribute("nostencil")?false:true,
	antialias: canvas.getAttribute("noantialias")?false:true,
	premultipliedAlpha: canvas.getAttribute("premultipliedAlpha")?true:false,
	preserveDrawingBuffer: canvas.getAttribute("preserveDrawingBuffer")?true:false,
	preferLowPowerToHighPerformance: canvas.getAttribute("preferLowPowerToHighPerformance")?true:false,
}

var gl = canvas.getContext('webgl', options) ||
         canvas.getContext('webgl-experimental', options) ||
         canvas.getContext('experimental-webgl', options)

function resize(){
	var pixelratio = window.devicePixelRatio
	var w = canvas.offsetWidth
	var h = canvas.offsetHeight
	var sw = canvas.width = w * pixelratio
	var sh = canvas.height = h * pixelratio
	canvas.style.width = w + 'px'
	canvas.style.height = h + 'px'

	gl.viewport(0,0,sw,sh)

	if(args.pixelratio){
		bus.postMessage({fn:'onresize', pixelratio:pixelratio, w:w, h:h})
	}
}

window.addEventListener('resize', resize)
resize()
// set the right width / height

args.pixelratio = window.devicePixelRatio
args.w = canvas.offsetWidth
args.h = canvas.offsetHeight

var OES_standard_derivatives = gl.getExtension('OES_standard_derivatives')
var ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays')

var current_program
var current_unilocs

var globals = Array(100)
var globallen = 0
var todofn = Array(100)

todofn[1] = function clear(i32, f32, o){
	var mask = i32[o+2]
	var clr = 0
	if(mask&1){
		gl.clearColor(f32[o+3],f32[o+4], f32[o+5], f32[o+6])
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

todofn[2] = function use(i32, f32, o){
	var shaderid = i32[o+2]
	var shader = shaderids[shaderid]
	current_program = shader
	current_unilocs = shader.unilocs
	gl.useProgram(shader)
}

todofn[3] = function attribute(i32, f32, o){
	var nameid = i32[o+2]
	var meshid = i32[o+3]
	var stride = i32[o+4]
	var offset = i32[o+5]
	var loc = current_program.attrlocs[nameid]
	var mesh = meshids[meshid]

	gl.enableVertexAttribArray(loc.index)
	gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, stride, offset)
}

todofn[4] = function attributes(i32, f32, o){
	var startnameid = i32[o+2]
	var range = i32[o+3]
	var meshid = i32[o+4]
	var stride = i32[o+5]
	var offset = i32[o+6]
	var slotoff = 0
	for(var i = 0; i < range; i++){
		var loc = current_program.attrlocs[startnameid+i]
		var mesh = meshids[meshid]
		gl.enableVertexAttribArray(loc.index)
		gl.vertexAttribPointer(loc.index, loc.slots, gl.FLOAT, false, stride, offset + slotoff)
		slotoff += loc.slots
	}
}

todofn[10] = function uniformInt(i32, f32, o){
	gl.uniform1i(current_unilocs[i32[o+2]], i32[o+3])
}

todofn[11] = function uniformFloat(i32, f32, o){
	gl.uniform1f(current_unilocs[i32[o+2]], f32[o+3])
}

todofn[12] = function uniformVec2(i32, f32, o){
	gl.uniform2f(current_unilocs[i32[o+2]], f32[o+3], f32[o+4])
}

todofn[13] = function uniformVec3(i32, f32, o){
	gl.uniform2f(current_unilocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5])
}

todofn[14] = function uniformVec4(i32, f32, o){
	gl.uniform2f(current_unilocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5], f32[o+6])
}

todofn[15] = function uniformMat4(i32, f32, o){
	gl.uniform2f(current_unilocs[i32[o+2]], f32[o+3], f32[o+4])
}

todofn[20] = 
todofn[21] = 
todofn[22] = 
todofn[23] = 
todofn[24] = 
todofn[25] = function globalValue(i32, f32, o){
	for(var nameid = i32[o+2], i = 0; i < globallen; i+=5) if(globals[i] === nameid) break
	globals[i] = nameid
	globals[i+1] = i32[o] - 10
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	if(i >= globallen) globallen = i+5
}

todofn[30] = function drawTriangles(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.TRIANGLES, i32[o+2], i32[o+3])
}

todofn[31] = function drawLines(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINES, i32[o+2], i32[o+3])
}

todofn[32] = function drawLineLoop(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINE_LOOP, i32[o+2], i32[o+3])
}

todofn[33] = function drawLineStrip(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.LINE_STRIP, i32[o+2], i32[o+3])
}

todofn[34] = function drawTriangleStrip(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.TRIANGLE_STRIP, i32[o+2], i32[o+3])
}

todofn[35] = function drawTriangleFan(i32, f32, o){
	// set the global uniforms
	for(var i = 0; i < globallen; i+=5){
		if(current_unilocs[globals[i]] !== undefined) todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
	}
	gl.drawArrays(gl.TRIANGLE_FAN, i32[o+2], i32[o+3])
}

bus.onmessage = function(msg){
	if(msg.fn !== 'runTodo'){
		userMessage[msg.fn](msg)
		return
	}

	// run todo
	var todo = todoids[msg.todoid]
	var f32 = todo.f32
	var i32 = todo.i32
	var len = todo.length
	for(var o = 0; o < len; o += argc + 2){
		var fnid = i32[o]
		var argc = i32[o + 1]
		todofn[fnid](i32, f32, o)
	}
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