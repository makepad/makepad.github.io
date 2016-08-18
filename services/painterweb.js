var canvas = service.canvas
var args = service.args
var bus = service.bus
var services = service.others

args.timeBoot = Date.now()

//
//
//  GL Context initialization
//
//

function initializeGLContext(canvas){
	var options = {
		alpha: canvas.getAttribute("alpha")?true:false,
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

	function resize(dy){
		var pixelRatio = window.devicePixelRatio
		var w, h
		// if a canvas is fullscreen we should size it to fullscreen
		if(canvas.getAttribute("fullpage")){
			w = document.body.offsetWidth 
			h = document.body.offsetHeight- (dy || 0)
		}
		else{
			w = canvas.offsetWidth
			h = canvas.offsetHeight
		}

		var sw = canvas.width = w * pixelRatio
		var sh = canvas.height = h * pixelRatio

		// lets delay this to repaint?
		canvas.style.width = w + 'px'
		canvas.style.height = h + 'px'

		gl.viewport(0,0,sw,sh)

		if(args.pixelRatio){
			bus.postMessage({fn:'onResize', pixelRatio:pixelRatio, w:w, h:h})
		}
		args.pixelRatio = window.devicePixelRatio
		args.w = canvas.offsetWidth
		args.h = canvas.offsetHeight

		requestRepaint()
	}

	window.addEventListener('resize', function(){
		resize()
		service.others.keyboard.onWindowResize()
	})

	exports.resizeCanvas = function(dy){
		resize(dy)
	}

	//
	//
	// Bootcache
	//
	//

	gl.shaderCache = {}

	function bootCache(){
		// now we have to bind the textures
		var mesh = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(16), gl.STATIC_DRAW)
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 4*4, 0)
		gl.enableVertexAttribArray(0)
		var gltex = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, gltex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

		for ( var i = 0, len = localStorage.length; i < len; ++i ) {

			var cacheid = localStorage.key(i)
			if(typeof cacheid !== 'string' || cacheid.indexOf('@@@@') === -1) continue

			var shadercode = cacheid.split('@@@@')

			var shader = gl.shaderCache[cacheid] = compileShader(shadercode[0], shadercode[1])
			// delete it
			localStorage.removeItem(cacheid)
			--i

			gl.useProgram(shader)
			// set up some fake textures
			for(var t = 0; t< 8; t++){
				gl.activeTexture(gl.TEXTURE0 + t)
				gl.bindTexture(gl.TEXTURE_2D, gltex)
			}
			gl.drawArrays(gl.TRIANGLES,0,1)
		}
	}
	// wait a bit and fire it up
	setTimeout(bootCache, 10)

	gl.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives')
	gl.ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays')
	gl.EXT_blend_minmax = gl.getExtension('EXT_blend_minmax')
	gl.OES_texture_half_float_linear = gl.getExtension('OES_texture_half_float_linear')
	gl.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear')
	gl.OES_texture_half_float = gl.getExtension('OES_texture_half_float')
	gl.OES_texture_float = gl.getExtension('OES_texture_float')
	gl.WEBGL_depth_texture = gl.getExtension("WEBGL_depth_texture") || gl.getExtension("WEBKIT_WEBGL_depth_texture")
	return gl
}

var childPainters = []
exports.addChild = function(child, fbId){
	var fb = framebufferIds[fbId]
	fb.child = child

	// send the framebuffer to make the main to the child
	return {
		requestRepaint: requestRepaint,
		painterWorkerId:childPainters.push(child),
		gl:gl,
		attach:fb.attach,
		glfb:fb.glfb,
		glpfb: fb.glpfb,
		todoId:undefined
	}
}
// ok someone wants to hot reload
exports.onHotReload = function(){
}

exports.onChildResize = function(attach, glfb, glpfb){
	mainFramebuffer.attach = attach
	mainFramebuffer.glfb = glfb
	mainFramebuffer.glpfb = glpfb
	args.w = attach.color0.w
	args.h = attach.color0.h
	args.pixelRatio = attach.color0.pixelRatio
}

var gl

var ownerServices = service.ownerServices
var parentFramebuffer

if(ownerServices && ownerServices.painter){
	var workerArgs = service.workerArgs	
	parentFramebuffer = ownerServices.painter.addChild(exports, service.workerArgs.fbId)
	gl = parentFramebuffer.gl
	painterWorkerId = parentFramebuffer.painterWorkerId
	var attach = parentFramebuffer.attach
	args.w = attach.color0.w
	args.h = attach.color0.h
	args.pixelRatio = attach.color0.pixelRatio
}
else{
	gl = initializeGLContext(canvas)
	exports.resizeCanvas(0)
	painterWorkerId = 1
}

//
//
//  Todo execution
//
//

var todofn = Array(100)
var userfn = {}
var currentTodo 

function runTodo(todo){
	//console.log("Running todo "+todo.name)
	if(!todo) return false

	var lastTodo = currentTodo
	currentTodo = todo
	// set todoId
	floatGlobal(nameIds.this_DOT_todoId, todo.todoId)
	vec2fGlobal(nameIds.this_DOT_viewScroll, todo.xScroll, todo.yScroll)
	vec4fGlobal(nameIds.this_DOT_viewSpace, todo.xView, todo.yView, todo.xTotal, todo.yTotal)
	var f32 = todo.f32
	var i32 = todo.i32
	var len = todo.length
	var last = 0
	var repaint = false
	for(var o = 0; o < len; o += argc + 2){
		var fnid = i32[o]
		var argc = i32[o + 1]
		var fn = todofn[fnid]
		if(!fn) console.error('cant find '+fnid+ ' last was ' + last)
		last = fnid
		var ret = fn(i32, f32, o)
		if(ret) repaint = true
	}
	currentTodo = lastTodo
	if(!pickPass && processScrollState(todo))return true

	if(repaint || todo.animLoop || todo.timeMax > repaintTime)return true
}

//
//
//  Screen picking
//
//

var pickWindows = {}

function newPickWindow(width, height){
	var pick = {}
	pick.buf = new Uint8Array(4)
	pick.mat = [
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1
	]
	pick.framebuffer = gl.createFramebuffer()
	pick.texture = gl.createTexture()
	pick.depth = gl.createRenderbuffer()
	gl.bindTexture(gl.TEXTURE_2D, pick.texture)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
	gl.bindFramebuffer(gl.FRAMEBUFFER, pick.framebuffer)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pick.texture, 0)
	gl.bindRenderbuffer(gl.RENDERBUFFER, pick.depth)
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pick.depth)
	gl.bindRenderbuffer(gl.RENDERBUFFER, null)
	return pick
}
var pickPass = false
var pickPromises = {}

// pick the screen for digit , at x and y
exports.pickFinger = function pick(digit, x, y, immediate){
	var pick = {}

	pick.promise = new Promise(function(res, rej){pick.resolve = res, pick.reject = rej})
	pick.x = x
	pick.y = y

	if(pickPromises[digit]) pickPromises[digit].resolve()
	
	if(immediate){
		pick.resolve(renderPickWindow(digit, pick.x, pick.y))
	}
	else{
		pickPromises[digit] = pick
	}

	// mouse picks are done in request animation frame
	requestRepaint()
	return pick.promise
}

function renderPickDep(framebuffer){
	var todo = todoIds[framebuffer.todoId]
	//console.log('RENDER PICKDEP')
	for(var deps = todo.deps, i = 0; i < deps.length; i++){
		var depId = deps[i]
		var fb = framebufferIds[depId]
		if(fb === framebuffer) return console.error("INFINITE LOOP")
		renderPickDep(fb)
	}

	// lets set some globals
	globalsLen = 0
	pickPass = true
	mat4Global(nameIds.this_DOT_fingerInfo, fingerInfo)
	floatGlobal(nameIds.this_DOT_time, repaintTime)
	floatGlobal(nameIds.this_DOT_pixelRatio, args.pixelRatio)
	floatGlobal(nameIds.this_DOT_workerId, -painterWorkerId)
	mat4Global(nameIds.this_DOT_vertexPostMatrix, identityMat)
	// alright lets bind the pick framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.glpfb)
	var pick = framebuffer.attach.pick
	gl.viewport(0, 0, pick.w, pick.h)
	// and draw it
	pickPass = true
	runTodo(todo)
}

function renderPickWindow(digit, x, y, force){

	if(!mainFramebuffer || !mainFramebuffer.todoId){
		return console.error("No Main framebuffer or attached todo found")
	}
	// find a pick window
	var pick = pickWindows[digit]

	// use 100x100 pickwindow
	var pickw = 100, pickh = 100 
	if(!mainFramebuffer) return {}
	if(!pick) pickWindows[digit] = pick = newPickWindow(pickh,pickw), force = true

	// if our window is older than a frame, force it
	if(pick.frameId !== frameId - 1) force = true

	pick.frameId = frameId

	// the original mapping
	var w = args.w *  0.5 * args.pixelRatio
	var h = args.h *  0.5 * args.pixelRatio
	// map to the pick window
	var facx = w / pickw
	var facy = h / pickh
	var pickMat = pick.mat
	pickMat[0] = facx 
	pickMat[5] = facy
	pickMat[3] = -((x*args.pixelRatio - pickw)/w)*facx + (facx-1.)// + 0.5 * facx
	pickMat[7] = ((y*args.pixelRatio - pickh)/h)*facy - (facy-1.)// - 0.5 * facy

	var todo = todoIds[mainFramebuffer.todoId]

	if(force){ // render deps before framebuffer
		for(var deps = todo.deps, i = 0; i < deps.length; i++){
			renderPickDep(framebufferIds[deps[i]])
		}
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, pick.framebuffer)
	gl.viewport(0, 0, pickw, pickh)//pickw*args.pixelratio, pickh*args.pixelratio)//args.w*args.pixelratio, args.h*args.pixelratio)//pickw, pickh)

	// read the last pixel 
	var px = x - pick.xlast 
	var py = y - pick.ylast
	// check if we are still in the window
	if(Math.abs(px) >= 0.5*pickw || Math.abs(py) >= 0.5*pickh) force = true

	if(!force){

		gl.readPixels(0.5*pickw+px,0.5*pickh-py, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pick.buf)

		// render deps after framebuffer pick
		for(var deps = todo.deps, i = 0; i < deps.length; i++){
			renderPickDep(framebufferIds[deps[i]])
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, pick.framebuffer)
		gl.viewport(0, 0, pickw, pickh)//pickw*args.pixelratio, pickh*args.pixelratio)//args.w*args.pixelratio, args.h*args.pixelratio)//pickw, pickh)		
	}


	// set up global uniforms
	globalsLen = 0
	mat4Global(nameIds.this_DOT_fingerInfo, fingerInfo)
	floatGlobal(nameIds.this_DOT_time, repaintTime)
	floatGlobal(nameIds.this_DOT_pixelRatio, args.pixelRatio)
	mat4Global(nameIds.this_DOT_vertexPostMatrix, pickMat)
	floatGlobal(nameIds.this_DOT_workerId, -painterWorkerId)
	pickPass = true
	//console.log('RENDER PICKMAIN')

	runTodo(todo)

	// force a sync readpixel, could also choose to delay a frame?
	if(force){
		gl.readPixels(0.5*pickw,0.5*pickh, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pick.buf)
	}

	// store last xy
	pick.xlast = x
	pick.ylast = y

	return {
		todoId:pick.buf[0],
		pickId:(pick.buf[1]<<8) | pick.buf[2],
		workerId:pick.buf[3]
	}
}

//
//
//  Color buffer rendering
//
//

var lagCompMat = [
	1,0,0,0,
	0,1,0,0,
	0,0,1,0,
	0,0,0,1
]

var identityMat = [
	1,0,0,0,
	0,1,0,0,
	0,0,1,0,
	0,0,0,1
]

function renderColor(framebuffer, todoId){
	var todo = todoIds[framebuffer.todoId]

	var repaint = false
	for(var deps = todo.deps, i = 0; i < deps.length; i++){
		var fb = framebufferIds[deps[i]]
		var ret
		if(fb.child){
			// repaint the child
			ret = fb.child.renderChildColor(repaintTime, frameId)
		}
		else ret = renderColor(fb)
		if(ret) repaint = true
	}

	// lets set some globals
	globalsLen = 0
	mat4Global(nameIds.this_DOT_fingerInfo, fingerInfo)
	floatGlobal(nameIds.this_DOT_time, repaintTime)
	floatGlobal(nameIds.this_DOT_pixelRatio, args.pixelRatio)
	floatGlobal(nameIds.this_DOT_workerId, painterWorkerId)
	// compensation matrix for viewport size lag main thread vs user thread
	if(framebuffer === mainFramebuffer){
		lagCompMat[0] = todo.wPainter / args.w 
		lagCompMat[5] = todo.hPainter / args.h
		lagCompMat[3] = -(args.w - todo.wPainter) / args.w
		lagCompMat[7] = (args.h - todo.hPainter) / args.h
		// alright lets 
		if(!framebuffer.glfb){
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			gl.viewport(0, 0, args.w * args.pixelRatio, args.h * args.pixelRatio)
		}
		else{
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.glfb)
			var color0 = framebuffer.attach.color0
			gl.viewport(0, 0, color0.w, color0.h)
		}
		mat4Global(nameIds.this_DOT_vertexPostMatrix, lagCompMat)
	}
	else{
		mat4Global(nameIds.this_DOT_vertexPostMatrix, identityMat)
		// alright lets 
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.glfb)
		var color0 = framebuffer.attach.color0
		gl.viewport(0, 0, color0.w, color0.h)
	}

	pickPass = false
		// lets check our maxDuration
	if(runTodo(todo)) return true
	return repaint
}

exports.renderChildColor = function(time, fid){
	repaintTime = time
	frameId = fid

	if(!mainFramebuffer || !mainFramebuffer.todoId) return
	// render the main scene
	return renderColor(mainFramebuffer)
}

var repaintPending = false
function repaint(time){
	repaintTime = (Date.now() - args.timeBoot) / 1000

	repaintPending = false

	bus.postMessage({fn:'onSync', time:repaintTime, frameId:frameId++})

	if(!mainFramebuffer || !mainFramebuffer.todoId) return

	// lets resolve pending mousepicks slash create digit windows	
	for(var digit in pickPromises){
		var pick = pickPromises[digit]
		var res = renderPickWindow(digit, pick.x, pick.y)
		pick.resolve(res)
		// ok so. what do we do. we run render for each x/y coordinate
		// if its not in the window the renderer will force re-render and pick
	}
	// clear the pickPromises for next frame
	pickPromises = {}

	// render the main scene
	if(renderColor(mainFramebuffer)){
		requestRepaint()
	}
}

function requestRepaint(){
	if(parentFramebuffer){
		return parentFramebuffer.requestRepaint()
	}
	if(!repaintPending){
		repaintPending = true
		window.requestAnimationFrame(repaint)
	}
}

//
//
//  Direct scrolling interface
//
//

// we support 4 fingers via uniform into the shader
var fingerInfo = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
function doScroll(todo, sx, sy){

	var xScroll = Math.min(Math.max(sx, 0), Math.max(0,todo.xTotal - todo.xView))
	var yScroll = Math.min(Math.max(sy, 0), Math.max(0,todo.yTotal - todo.yView))

	if(yScroll === -Infinity || xScroll === -Infinity) return
	if(xScroll !== todo.xScroll || yScroll !== todo.yScroll){
		todo.xScroll = xScroll
		todo.yScroll = yScroll
		bus.postMessage({
			fn:'onScrollTodo',
			todoId:todo.todoId,
			x:xScroll,
			y:yScroll
		})
		requestRepaint()
		return true
	}
}

function processScrollState(todo){
	if(todo.yScrollTo !== undefined || todo.xScrollTo !== undefined){
		var ys = todo.yScroll
		if(todo.yScrollTo !== undefined){
			ys = (todo.yScroll*(1.-todo.scrollToSpeed) + todo.yScrollTo*todo.scrollToSpeed)
			if(Math.abs(todo.yScroll - todo.yScrollTo) < 1){
				todo.yScrollTo = undefined
			}
		}
		var xs = todo.xScroll
		if(todo.xScrollTo !== undefined){
			xs = (todo.xScroll*(1.-todo.scrollToSpeed) + todo.xScrollTo*todo.scrollToSpeed)
			if(Math.abs(todo.xScroll - todo.xScrollTo) < 1){
				todo.xScrollTo = undefined
			}
		}
		doScroll(todo, xs, ys)

		return true
	}

	if(todo.xScrollFlick !== 0 || todo.yScrollFlick !== 0){
		if(doScroll(todo, todo.xScroll + todo.xScrollFlick, todo.yScroll + todo.yScrollFlick)){
			if(Math.abs(todo.xScrollFlick) < 1) todo.xScrollFlick = 0
			if(Math.abs(todo.yScrollFlick) < 1) todo.yScrollFlick = 0
			todo.xScrollFlick *= todo.scrollMomentum
			todo.yScrollFlick *= todo.scrollMomentum
			return true
		}
		else{
			todo.xScrollFlick = 0
			todo.yScrollFlick = 0
		}
	}
}

var isScrollBarMove = 0
var scrollDelta
exports.onFingerDown = function(f){
	var o = (f.digit-1) * 4
	fingerInfo[o+0] = f.x
	fingerInfo[o+1] = f.y
	fingerInfo[o+2] = f.workerId*256 + f.todoId
	fingerInfo[o+3] = f.pickId
	// check if we are down on a scrollbar
	var todo = todoIds[f.todoId]
	if(!todo) return
	// mousedown on a scrollbar
	if(f.pickId === todo.yScrollId){
		// the position of the scrollbar
		var ysize = todo.yView
		var delta = ((f.y - todo.ysScroll) / todo.yView) * todo.yTotal - (todo.ysScroll + todo.yScroll)
		if(delta < 0){
			todo.yScrollTo = Math.max(0,todo.yScroll - todo.yView)
			isScrollBarMove = 0
		}
		else if(delta > ysize){
			todo.yScrollTo = Math.min(Math.max(0.,todo.yTotal - todo.yView),todo.yScroll + todo.yView)
			isScrollBarMove = 0
		}
		else isScrollBarMove = 1
		scrollDelta = delta
	}
	else if(f.pickId === todo.xScrollId){
		// the position of the scrollbar
		var ysize = todo.xView
		var delta = ((f.x - todo.xsScroll) / todo.xView) * todo.xTotal - (todo.xsScroll + todo.xScroll)
		if(delta < 0){
			todo.yScrollTo = Math.max(0,todo.xScroll - todo.xView)
			isScrollBarMove = 0
		}
		else if(delta > ysize){
			todo.yScrollTo = Math.min(Math.max(0.,todo.xTotal - todo.xView),todo.xScroll + todo.xView)
			isScrollBarMove = 0
		}
		else isScrollBarMove = 2
		scrollDelta = delta
	}
	else isScrollBarMove = 0

	requestRepaint()
}

exports.onFingerMove = function(f){

	// store finger pos
	var o = (f.digit-1) * 4
	fingerInfo[o+0] = f.x
	fingerInfo[o+1] = f.y

	if(f.tapCount > 0) return
	var todo = todoIds[f.todoId]
	if(!todo) return

	if(isScrollBarMove === 1){
		doScroll(todo, todo.xScroll, ((f.y - todo.ysScroll) / todo.yView)*todo.yTotal - scrollDelta)
		return
	}
	if(isScrollBarMove === 2){
		var xs =  ((f.x - todo.xsScroll) / todo.xView)*todo.xTotal - scrollDelta
		doScroll(todo,xs, todo.yScroll)
		return
	}

	// dont scroll
	if(!f.touch || f.pickId === todo.yScrollId || f.pickId === todo.xScrollId) return	
	if(todo.scrollMask >= 0 && f.pickId !== todo.scrollMask) return
	
	doScroll(todo, todo.xScroll + f.dx, todo.yScroll + f.dy)
}

exports.onFingerUp = function(f){
	requestRepaint()

	var o = (f.digit-1) * 4
	fingerInfo[o+0] = f.x
	fingerInfo[o+1] = f.y
	fingerInfo[o+2] = -(f.workerId*256 + f.todoId)
	fingerInfo[o+3] = f.pickId

	var todo = todoIds[f.todoId]
	if(!todo) return

	if(!f.touch || f.pickId === todo.yScrollId || f.pickId === todo.xScrollId) return
	// do a flick?
	todo.xScrollFlick = f.dx
	todo.yScrollFlick = f.dy
}

exports.onFingerHover = function(f){
	var o = (f.digit-1) * 4
	fingerInfo[o+0] = f.x
	fingerInfo[o+1] = f.y
	fingerInfo[o+2] = -(f.workerId*256 + f.todoId)
	fingerInfo[o+3] = f.pickId
	requestRepaint()
}

exports.onFingerWheel = function(f){
	var todo = todoIds[f.todoId]
	if(!todo) return
	doScroll(todo, todo.xScroll + f.xWheel, todo.yScroll + f.yWheel)
}

bus.onMessage = function(msg){
	if(msg) userfn[msg.fn](msg)
}


//
//
// Resources
//
//

var shaderIds = {}
var nameIds = {}
var meshIds = {}
var todoIds = {}
var textureIds = {}
var framebufferIds = {}
var mainFramebuffer
var frameId = 0

var currentShader
var currentUniLocs



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

var globalF32 = new Float32Array(2000)
var globalI32 = new Int32Array(2000)
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

function floatGlobal(nameId, x){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
	i32[o+0] = 11
	i32[o+1] = 2
	i32[o+2] = nameId
	f32[o+3] = x
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 11
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	globalsLen += 5
}

function vec2fGlobal(nameId, x, y){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
	i32[o+0] = 12
	i32[o+1] = 3
	i32[o+2] = nameId
	f32[o+3] = x
	f32[o+4] = y
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 12
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	globalsLen += 5
}

function vec4Global(nameId, x){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
	i32[o+0] = 14
	i32[o+1] = 5
	i32[o+2] = nameId
	f32[o+3] = x[0]
	f32[o+4] = x[1]
	f32[o+5] = x[2]
	f32[o+6] = x[3]
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 14
	globals[i+2] = i32
	globals[i+3] = f32
	globals[i+4] = o
	globalsLen += 5
}


function vec4fGlobal(nameId, x, y, z, w){
	var i32 = globalI32//[nameid*10]
	var f32 = globalF32//[nameid*10]
	var o = nameId * 20
	i32[o+0] = 14
	i32[o+1] = 5
	i32[o+2] = nameId
	f32[o+3] = x
	f32[o+4] = y
	f32[o+5] = z
	f32[o+6] = w
	var i = globalsLen
	globals[i] = nameId
	globals[i+1] = 14
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


todofn[40] = function clear(i32, f32, o){
	var mask = i32[o+2]
	var clr = 0
	if(mask&1){
		if(!pickPass){
			gl.clearColor(f32[o+3],f32[o+4], f32[o+5], f32[o+6])
		} else {
			gl.clearColor(currentTodo.todoId/255,0,0,0)
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

var blendFn = [
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
var blendEq = [
	0x800a,//painter.FUNC_SUBTRACT = 0
	0x800b,//painter.FUNC_REVERSE_SUBTRACT = 1
	0x8006,//painter.FUNC_ADD = 2
	0x8007,//painter.MIN = 3
	0x8008//painter.MAX = 4
]

todofn[41] = function blending(i32, f32, o){
	if(pickPass){
		gl.disable(gl.BLEND)
		return
	}
	gl.enable(gl.BLEND)
	gl.blendEquationSeparate(blendEq[i32[o+3]], blendEq[i32[o+6]])
	gl.blendFuncSeparate(blendFn[i32[o+2]],blendFn[i32[o+4]],blendFn[i32[o+5]],blendFn[i32[o+7]])
	gl.blendColor(f32[o+8], f32[o+9], f32[o+10], f32[o+11])
}

//
//
//	Shader management
//
//

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

function compileShader(vertexcode, pixelcode){
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

	return shader
}

function mapShaderIO(shader, vertexcode, pixelcode){
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
		var index = gl.getAttribLocation(shader, name)

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
		var index = gl.getUniformLocation(shader, name)
		uniLocs[nameid] = index
	}
	shader.uniLocs = uniLocs
}

userfn.newShader = function(msg){
	var pixelcode = msg.code.pixel
	var vertexcode = msg.code.vertex
	var shaderid = msg.shaderId
	
	pixelcode =  "#extension GL_OES_standard_derivatives : enable\n"+
				 "precision highp float;\nprecision highp int;\n"+
	             pixelcode
	vertexcode = "precision highp float;\nprecision highp int;\n"+
				 vertexcode

	var cacheid = vertexcode + '@@@@' + pixelcode

	localStorage.setItem(cacheid, 1)
	var shader = gl.shaderCache[cacheid]
	if(shader){
		if(!shader.attrlocs) mapShaderIO(shader, vertexcode, pixelcode)
		shader.refCount++
		shaderIds[shaderid] = shader
		return
	}
	
	shader = shaderIds[shaderid] = gl.shaderCache[cacheid] = compileShader(vertexcode, pixelcode)
	if(shader){
		mapShaderIO(shader, vertexcode, pixelcode)
		shader.name = msg.name
	}
}

todofn[2] = function useShader(i32, f32, o){
	var shaderid = i32[o+2]
	var shader = shaderIds[shaderid]
	// check last maxindex

	var prevAttrMax = -1
	if(gl.currentShader){
		prevAttrMax = gl.currentShader.maxAttrIndex
		//shader.prevMaxTexIndex = currentShader.maxTexIndex || 0
	}
	
	gl.currentShader = 
	currentShader = shader
	
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

		currentUniLocs = shader.uniLocs
		//shader.maxTexIndex = -1
		shader.instanced = false
		shader.indexed = false
		shader.samplers = 0
		shader.fallbackInstancedArrays = false
		gl.useProgram(shader)
	}
}

//
//
// Geometry management
//
//

userfn.newMesh = function(msg){
	var glbuffer = gl.createBuffer()
	meshIds[msg.meshId] = glbuffer
}

userfn.updateMesh = function(msg){
	var glbuffer = meshIds[msg.meshId]

	if(glbuffer.drawDiscard = msg.drawDiscard){
		glbuffer.xOffset = msg.xOffset
		glbuffer.yOffset = msg.yOffset
		glbuffer.wOffset = msg.wOffset
		glbuffer.hOffset = msg.hOffset
	}

	glbuffer.array = msg.array
	glbuffer.length = msg.length
	glbuffer.updateId = frameId
	// check the type

	if(msg.arrayType === 'uint16'){
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glbuffer)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
	}
	else{
		gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer)
		gl.bufferData(gl.ARRAY_BUFFER, msg.array, gl.STATIC_DRAW)
	}
}

todofn[3] = function attributes(i32, f32, o){
	if(!currentShader) return
	var startId = i32[o+2]
	var range = i32[o+3]
	var meshid = i32[o+4]
	var stride = i32[o+5]
	var offset = i32[o+6]
	var slotoff = 0
	var mesh = meshIds[meshid]
	currentShader.attrlength = mesh.length

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
	if(!currentShader) return
	var startId = i32[o+2]
	var range = i32[o+3]
	var meshid = i32[o+4]
	var stride = i32[o+5]
	var offset = i32[o+6]
	var divisor = i32[o+7]
	var slotoff = 0
	var mesh = meshIds[meshid]

	// fast geometry clipping
	var len = mesh.length
	
	if( mesh.yOffset &&  len > 100 && mesh.drawDiscard === 'y'){ // otherwise dont bother
		var array = mesh.array
		var yScroll = currentTodo.yScroll
		var yMax = currentTodo.yView
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
	if(!currentShader) return
	var mesh = meshIds[i32[o+2]]
	currentShader.attrlength = mesh.length
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh)
	currentShader.indexed = true
}

// texture flags
var textureBufTypes = [
	gl.RGBA,
	gl.RGB,
	gl.ALPHA,
	gl.LUMINANCE,
	gl.LUMINANCE_ALPHA,
	gl.DEPTH_COMPONENT16,
	gl.STENCIL_INDEX,
	gl.DEPTH_STENCIL
]

var textureDataTypes = [
	gl.UNSIGNED_BYTE,
	gl.UNSIGNED_SHORT,
	gl.OES_texture_float && gl.FLOAT,
	gl.OES_texture_half_float && gl.OES_texture_half_float.HALF_FLOAT_OES,
	gl.OES_texture_float_linear && gl.OES_texture_float_linear.FLOAT_LINEAR_OES,
	gl.OES_texture_half_float_linear && gl.OES_texture_half_float_linear.HALF_FLOAT_LINEAR_OES
]

// other flags
var textureFlags = {}
textureFlags.FLIP_Y = 1<<0
textureFlags.PREMULTIPLY_ALPHA = 1<<1
textureFlags.CUBEMAP = 1<<2
textureFlags.SAMPLELINEAR = 1<<3 // little cheat flag for framebuffer textures

//
//
// Framebuffer management
//
//

userfn.newFramebuffer = function(msg){
	var prev = framebufferIds[msg.fbId]

	// delete previous if its there
	
	if(prev){
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
		if(mainFramebuffer){
			throw new Error('Dont create a mainframebuffer more than once')
		}
		
		mainFramebuffer =  framebufferIds[msg.fbId] = parentFramebuffer || {
			todo:undefined
		}

		return
	}
	
	// create all attached textures as needed
	var attach = {}
	for(var key in msg.attach){
		var tex = textureIds[msg.attach[key]]
		// we might need to create this texture
		var defsam = (tex.flags&textureFlags.SAMPLELINEAR)?'4352':'4352'
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
		
		var bufType = textureBufTypes[tex.bufType]
		var dataType = textureDataTypes[tex.dataType]

		gl.texImage2D(gl.TEXTURE_2D, 0, bufType, msg.w, msg.h, 0, bufType, dataType, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.glframe_buf)

		tex.w = msg.w
		tex.h = msg.h
		tex.pixelRatio = args.pixelRatio
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
	var fb = framebufferIds[msg.fbId] = {
		glpfb:glpfb,
		glfb:glfb,
		todoId: prev && prev.todoId || undefined,
		attach:attach
	}

	// signal the child their framebuffer has resized
	if(prev && prev.child){
		fb.child = prev.child
		prev.child.onChildResize(attach, glfb, glpfb)
	}
}


userfn.assignTodoToFramebuffer = function(msg){
	// we are attaching a todo to a framebuffer.
	var framebuffer = framebufferIds[msg.fbId]
	framebuffer.todoId = msg.todoId
	// if we attached to the main framebuffer, repaint
	if(framebuffer === mainFramebuffer){
		requestRepaint()
	}
}

//
//
// Texture management
//
//

userfn.newTexture = function(msg){
	var tex = textureIds[msg.texId]
	if(!tex){
		tex = textureIds[msg.texId] = {samplers:{}}
		tex.bufType = msg.bufType
		tex.dataType = msg.dataType
		tex.flags = msg.flags
	}
	tex.w = msg.w
	tex.h = msg.h
	tex.array = msg.array
	tex.updateId = frameId
}

// sampler props
var samplerFilter = [
	gl.NEAREST,
	gl.LINEAR,
	gl.NEAREST_MIPMAP_NEAREST,
	gl.LINEAR_MIPMAP_NEAREST,
	gl.NEAREST_MIPMAP_LINEAR,
	gl.LINEAR_MIPMAP_LINEAR
]

var samplerWrap = [
	gl.REPEAT,
	gl.CLAMP_TO_EDGE,
	gl.MIRRORED_REPEAT
]

todofn[8] = function sampler(i32, f32, o){
	if(!currentShader) return

	// this thing lazily creates textures and samplers
	var nameid = i32[o+2]
	var tex = textureIds[i32[o+3]]
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
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tex.flags & textureFlags.FLIP_Y?gl.TRUE:gl.FALSE)
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, tex.flags & textureFlags.PREMULTIPLY_ALPHA?gl.TRUE:gl.FALSE)

		// lets figure out the flags
		var bufType = textureBufTypes[tex.bufType]
		var dataType = textureDataTypes[tex.dataType]
		// upload array
		gl.texImage2D(gl.TEXTURE_2D, 0, bufType, tex.w, tex.h, 0, bufType, dataType, new Uint8Array(tex.array))

		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplerFilter[(samplerType>>0)&0xf])
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplerFilter[(samplerType>>4)&0xf])
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplerWrap[(samplerType>>8)&0xf])
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplerWrap[(samplerType>>12)&0xf])
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
	if(!currentShader) return
	gl.uniform1i(currentUniLocs[i32[o+2]], i32[o+3])
}

todofn[11] = function floatUniform(i32, f32, o){
	if(!currentShader) return
	gl.uniform1f(currentUniLocs[i32[o+2]], f32[o+3])
}

todofn[12] = function vec2Uniform(i32, f32, o){
	if(!currentShader) return
	gl.uniform2f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4])
}

todofn[13] = function vec3Uniform(i32, f32, o){
	if(!currentShader) return
	gl.uniform3f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5])
}

todofn[14] = function vec4Uniform(i32, f32, o){
	if(!currentShader) return
	gl.uniform4f(currentUniLocs[i32[o+2]], f32[o+3], f32[o+4], f32[o+5], f32[o+6])
}

var tmtx = new Float32Array(16)
todofn[15] = function mat4Uniform(i32, f32, o){
	if(!currentShader) return
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

var drawTypes = [
	gl.TRIANGLES,
	gl.TRIANGLE_STRIP,
	gl.TRIANGLE_FAN,
	gl.LINES,
	gl.LINE_STRIP,
	gl.LINE_LOOP
]
//ANGLE_instanced_arrays = undefined
todofn[30] = function draw(i32, f32, o){
	if(!currentShader) return

	// set the global uniforms
	var type = drawTypes[i32[o+2]]
	for(var i = 0; i < globalsLen; i+=5){
		if(currentUniLocs[globals[i]] !== undefined){
			todofn[globals[i+1]](globals[i+2], globals[i+3], globals[i+4])
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

//
//
// Todo management
//
//
userfn.newTodo = function(msg){
	todoIds[msg.todoId] = {
		todoId:msg.todoId,
		xScroll:0,
		yScroll:0,
		xScrollFlick:0,
		yScrollFlick:0
	}
}

userfn.updateTodo = function(msg){
	// lets just store the todo message as is
	var todo = todoIds[msg.todoId]

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
	if(mainFramebuffer && mainFramebuffer.todoId === todo.todoId){
		requestRepaint()
	}
}

userfn.updateTodoTime = function(msg){
	var todo = todoIds[msg.todoId]
	todo.timeStart = msg.timeStart
	todo.timeMax = msg.timeMax
	requestRepaint()
}

userfn.scrollTo = function(msg){
	var todo = todoIds[msg.todoId]
	todo.xScrollTo = msg.x
	todo.yScrollTo = msg.y
	todo.scrollToSpeed = msg.scrollToSpeed
	requestRepaint()
}

todofn[1] = function addChildTodo(i32, f32, o){
	var todo = todoIds[i32[o+2]]
	return runTodo(todo)
}

//
//
// Misc
//
//

userfn.newName = function(msg){
	nameIds[msg.name] = msg.nameId
}


