module.exports = class painter1 extends require('/platform/service'){

	//proto.debug = 1

	constructor(...args){
		super(...args)
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
			this.parentPainter = this.parent.services[this.constructor.name]
			this.parentPainter.addChild(this, this.platform.parentFbId)
		}

		this.onConstructPainterUser()
		this.onConstructPainterTodo()
		this.onConstructPainterScroll()
		this.onConstructPainterUbos()
		this.onConstructPainterPaint()
	}

	createGLCanvas(){
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

		if(!gl){
			var span = document.createElement('span')
			span.style.color = 'white'
			canvas.parentNode.replaceChild(span, canvas)
			span.innerHTML = "Sorry, makepad needs browser support for WebGL to run<br/>Please update your browser to a more modern one<br/>Update to atleast iOS 10, Safari 10, latest Chrome, Edge or Firefox<br/>Go and update and come back, your browser will be better, faster and more secure!"
			return
		}

		gl.globalShaderCache = {}

		gl.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives')
		gl.OES_vertex_array_object = gl.getExtension('OES_vertex_array_object')
		gl.OES_element_index_uint = gl.getExtension("OES_element_index_uint")
		gl.ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays')
		gl.EXT_blend_minmax = gl.getExtension('EXT_blend_minmax')
		gl.OES_texture_half_float_linear = gl.getExtension('OES_texture_half_float_linear')
		gl.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear')
		gl.OES_texture_half_float = gl.getExtension('OES_texture_half_float')
		gl.OES_texture_float = gl.getExtension('OES_texture_float')
		gl.WEBGL_depth_texture = gl.getExtension("WEBGL_depth_texture") || gl.getExtension("WEBKIT_WEBGL_depth_texture")
	}

	onScreenResize(dy){
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
			this.postMessage({fn:'onResize', pileupTime:Date.now(), pixelRatio:pixelRatio, x:0,y:0,w:w, h:h})
		}
		this.args.pixelRatio = window.devicePixelRatio
		this.args.w = canvas.offsetWidth
		this.args.h = canvas.offsetHeight

		this.requestRepaint()
	}

	requestRepaint(){
		if(this.parentPainter){
			return this.parentPainter.requestRepaint()
		}
		if(!this.repaintPending){
			this.repaintPending = true
			window.requestAnimationFrame(this.onRepaint)
		}
	}
	
	runBootCache(){
		// bootcache errors on windows.
		if(!this.root.isWindows){
			this.bootCacheTimeout = setTimeout(this.bootCache.bind(this), 0)
		}
	}

	stopBootCache(){
		if(this.bootCacheTimeout) clearTimeout(this.bootCacheTimeout)
	}

	writeBootCache(cacheid){
		if(this.parent) return
		localStorage.setItem(cacheid, 1)
	}
	
	bootCache(){
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
				for(let t = 0; t< 8; t++){
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
}

require('/platform/painteruser')(module.exports.prototype)
require('/platform/paintertodo')(module.exports.prototype)
require('/platform/painterscroll')(module.exports.prototype)
require('/platform/painterubos')(module.exports.prototype)
require('/platform/painterpaint')(module.exports.prototype)