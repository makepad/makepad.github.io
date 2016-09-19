module.exports = require('/platform/service').extend(function painter1(proto){

	require('/platform/painteruser')(proto)
	require('/platform/paintertodo')(proto)
	require('/platform/painterscroll')(proto)
	require('/platform/painterubos')(proto)
	require('/platform/painterpaint')(proto)
	
	//proto.debug = 1

	proto.onConstruct = function(){

		if(!this.parent){

			this.args.timeBoot = Date.now()

			this.createGLCanvas()

			this.args.x = 0
			this.args.y = 0
			this.onRepaint = this.onRepaint.bind(this)
		
			this.onScreenResize()
			this.runBootCache()
		}
		else{
			// ok we have a parent.
			// lets connect to it
			this.parentPainter = this.parent.services[this.name]
			this.parentPainter.addChild(this, this.platform.parentFbId)
		}

		this.onConstructPainterUser()
		this.onConstructPainterTodo()
		this.onConstructPainterScroll()
		this.onConstructPainterUbos()
		this.onConstructPainterPaint()
	}

	proto.createGLCanvas = function(){
		window.addEventListener('resize', function(){
			this.onScreenResize()
			this.worker.services.keyboard1.onWindowResize()
		}.bind(this))

		var canvas = this.platform.canvas

		var options = {
			alpha: canvas.getAttribute("alpha")?true:false,
			depth: canvas.getAttribute("nodepth")?false:true,
			stencil: canvas.getAttribute("nostencil")?false:true,
			antialias: canvas.getAttribute("antialias")?true:false,
			premultipliedAlpha: canvas.getAttribute("premultipliedAlpha")?true:false,
			preserveDrawingBuffer: canvas.getAttribute("preserveDrawingBuffer")?true:false,
			preferLowPowerToHighPerformance: true//canvas.getAttribute("preferLowPowerToHighPerformance")?true:false,
		}

		var gl = this.gl = canvas.getContext('webgl', options) ||
		         canvas.getContext('webgl-experimental', options) ||
		         canvas.getContext('experimental-webgl', options)

		gl.globalShaderCache = {}

		gl.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives')
		gl.ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays')
		gl.EXT_blend_minmax = gl.getExtension('EXT_blend_minmax')
		gl.OES_texture_half_float_linear = gl.getExtension('OES_texture_half_float_linear')
		gl.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear')
		gl.OES_texture_half_float = gl.getExtension('OES_texture_half_float')
		gl.OES_texture_float = gl.getExtension('OES_texture_float')
		gl.WEBGL_depth_texture = gl.getExtension("WEBGL_depth_texture") || gl.getExtension("WEBKIT_WEBGL_depth_texture")
	}

	proto.onScreenResize = function(dy){
		var pixelRatio = window.devicePixelRatio
		var w, h
		// if a canvas is fullscreen we should size it to fullscreen

		var canvas = this.platform.canvas

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

		this.gl.viewport(0,0,sw,sh)

		if(this.args.pixelRatio){
			this.postMessage({fn:'onResize', pixelRatio:pixelRatio, x:0,y:0,w:w, h:h})
		}
		this.args.pixelRatio = window.devicePixelRatio
		this.args.w = canvas.offsetWidth
		this.args.h = canvas.offsetHeight

		this.requestRepaint()
	}

	proto.requestRepaint = function(){
		if(this.parentPainter){
			return this.parentPainter.requestRepaint()
		}
		if(!this.repaintPending){
			this.repaintPending = true
			window.requestAnimationFrame(this.onRepaint)
		}
	}
	
	proto.runBootCache = function(){
		// bootcache errors on windows.
		//this.bootCacheTimeout = setTimeout(this.bootCache.bind(this), 0)
	}

	proto.stopBootCache = function(){
		if(this.bootCacheTimeout) clearTimeout(this.bootCacheTimeout)
	}

	proto.writeBootCache = function(cacheid){
		if(this.parent) return
		localStorage.setItem(cacheid, 1)
	}
	
	proto.bootCache = function(){
		this.bootCacheTimeout = undefined
		var gl = this.gl
		// now we have to bind the textures
		var mesh = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(16), gl.STATIC_DRAW)
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 4*4, 0)
		gl.enableVertexAttribArray(0)

		var gltex = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, gltex)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

		var dt = Date.now()
		for ( var i = 0, len = localStorage.length; i < len; ++i ) {

			var cacheid = localStorage.key(i)
			if(typeof cacheid !== 'string' || cacheid.indexOf('@@@@') === -1) continue

			var shadercode = cacheid.split('@@@@')

			var shader = gl.globalShaderCache[cacheid] = this.compileShader(shadercode[0], shadercode[1])
			// delete it
			localStorage.removeItem(cacheid)
			--i
			if(shader){
				gl.useProgram(shader.program)
				for(var t = 0; t< 8; t++){
					gl.activeTexture(gl.TEXTURE0 + t)
					gl.bindTexture(gl.TEXTURE_2D, gltex)
				}
				gl.drawArrays(gl.TRIANGLES,0,1)
			}
			// dont take too long
			if(Date.now() - dt > 100){
				this.runBootCache()
				break
			}
		}
	}
	/*
	// wait a bit and fire it up
	//

	var subWorkers = {}

	exports.regSubWorker = function(subWorker, workerId){
		if(ownerServices){
			return ownerServices.painter1.regSubWorker(subWorker, workerId)
		}
		subWorkers[workerId] = subWorker
	}

	exports.connectWorkerToFramebuffer = function(subWorker, fbId){
		var fb = framebufferIds[fbId]
		fb.subWorker = subWorker
		// send the framebuffer to make the main to the child
		return {
			requestRepaint: requestRepaint,
			gl:gl,
			attach:fb.attach,
			glfb:fb.glfb,
			glpfb: fb.glpfb,
			timeBoot: args.timeBoot,
			todoId:undefined,
			xStart:fb.xStart,
			yStart:fb.yStart
		}
	}
	// ok someone wants to hot reload
	exports.onHotReload = function(){
	}

	exports.onFbResize = function(attach, glfb, glpfb, xStart, yStart){
		if(!mainFramebuffer) return
		mainFramebuffer.attach = attach
		mainFramebuffer.glfb = glfb
		mainFramebuffer.glpfb = glpfb
		args.pixelRatio = attach.color0.pixelRatio
		args.x = xStart
		args.y = yStart
		args.w = attach.color0.w / args.pixelRatio
		args.h = attach.color0.h / args.pixelRatio
		bus.postMessage({
			fn:'onResize', 
			pixelRatio:args.pixelRatio,
			x:args.x,
			y:args.y,
			w:args.w,
			h:args.h
		})
	}

	var gl

	var ownerServices = service.ownerServices
	var painterWorkerId = service.workerId
	var parentFramebuffer

	if(ownerServices && ownerServices.painter1){
		var workerArgs = service.workerArgs	
		var ownerPainter = ownerServices.painter1
		ownerPainter.regSubWorker(exports, service.workerId)
		parentFramebuffer = ownerPainter.connectWorkerToFramebuffer(exports, service.workerArgs.fbId)
		gl = parentFramebuffer.gl
		var attach = parentFramebuffer.attach
		args.pixelRatio = attach.color0.pixelRatio
		args.w = attach.color0.w / args.pixelRatio
		args.h = attach.color0.h / args.pixelRatio
		args.x = parentFramebuffer.xStart
		args.y = parentFramebuffer.yStart
		args.timeBoot = parentFramebuffer.timeBoot
		args.isSub = true
	}
	else{
		args.x = 0
		args.y = 0
		args.timeBoot = Date.now()
		gl = initializeGLContext(canvas)
		exports.resizeCanvas(0)
	}
	*/
})


