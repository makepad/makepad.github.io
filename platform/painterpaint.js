"use strict"
module.exports = function painterPaint(proto){

	proto.onConstructPainterPaint = function(){
		this.mainFramebuffer = undefined
		this.frameId = 0
		this.repaintTime = 0
		this.pickWindows = {}
		this.inPickPass = false
		this.pickPromises = {}
		this.repaintPending = false
		this.lagCompMat = [
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1
		]
		this.children = {}
		//this.frameSyncPromise = {}
	}

	proto.addChild = function(child, fbId){
		this.children[child.worker.workerId] = child
		child.gl = this.gl
		var fb = this.framebufferIds[fbId]
		child.parentFramebuffer = {
			attach:fb.attach,
			glfb:fb.glfb,
			glpfb:fb.glpfb,
		}
		var ca = child.args
		ca.timeBoot = this.args.timeBoot
		ca.pixelRatio = this.args.pixelRatio
		ca.x = fb.xStart
		ca.y = fb.yStart
		ca.w = fb.attach.color0.w / ca.pixelRatio
		ca.h = fb.attach.color0.h / ca.pixelRatio 
		fb.child = child
	}

	proto.moveChild = function(child, fbId){
		var fb = this.framebufferIds[fbId]
		var cfb = child.parentFramebuffer
		var ca = child.args
		ca.x = fb.xStart
		ca.y = fb.yStart
		
		child.postMessage({
			fn:'onMove', 
			pileupTime:Date.now(), 
			x:ca.x,
			y:ca.y
		})	
	}

	proto.resizeChild = function(child, fbId){
		var fb = this.framebufferIds[fbId]
		var cfb = child.parentFramebuffer
		cfb.attach = fb.attach
		cfb.glfb = fb.glfb
		cfb.glpfb = fb.glpfb
		var ca = child.args
		ca.pixelRatio = this.args.pixelRatio
		ca.w = fb.attach.color0.w / ca.pixelRatio
		ca.h = fb.attach.color0.h / ca.pixelRatio 
		child.postMessage({
			fn:'onResize', 
			pileupTime:Date.now(), 
			pixelRatio:ca.pixelRatio, 
			w:ca.w, 
			h:ca.h
		})	
	}

	proto.renderChildColor = function(time, fid, paintIds){
		this.repaintTime = time
		this.frameId = fid
		this.paintIds = paintIds
		if(!this.mainFramebuffer || !this.mainFramebuffer.todoId) return
		// render the main scene
		return this.renderColor(this.mainFramebuffer)
	}

	proto.renderChildPick = function(time, fid, paintIds){
		this.repaintTime = time
		this.frameId = fid
		this.paintIds = paintIds
		if(!this.mainFramebuffer || !this.mainFramebuffer.todoId) return
		// render the main scene
		var start = paintIds.id
		var space = (256-paintIds.id)>>1
		var ret = this.renderPickDep(this.mainFramebuffer)
		// clamp it!
		if(paintIds.id>start+space){
			console.log("PAINT ID CLAMPING FOR CHILD")
			paintIds.id = start+space
		}
		return ret
	}

	proto.onRepaint = function(){
		//for(let digit in this.frameSyncPromise){
		//	this.frameSyncPromise[digit].resolve(true)
		//}
		//this.frameSyncPromise = {}
		// flush any batched messages
		this.worker.onAfterEntry()

		this.repaintTime = (Date.now() - this.args.timeBoot) / 1000
		this.frameId++
		this.repaintPending = false

		this.postMessage({fn:'onSync', pileupTime:Date.now(),  time:this.repaintTime, frameId:this.frameId})

		if(!this.mainFramebuffer || !this.mainFramebuffer.todoId) return

		// lets resolve pending mousepicks slash create digit windows	
		for(let digit in this.pickPromises){
			var pick = this.pickPromises[digit]
			if(!pick) continue
			this.paintIds = {id:1}
			var res = this.renderPickWindow(digit, pick.x, pick.y)
			pick.callback(res)
		}
		// clear the pickPromises for next frame
		this.pickPromises = {}
		// flush any batched messages

		this.worker.onAfterEntry()

		// render the main scene
		this.paintIds = {id:1}
		if(this.renderColor(this.mainFramebuffer)){
			this.requestRepaint()
		}
	}

	var identityMat = [
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1
	]

	proto.findDeps = function(todo, deps){
		if(!todo) return
		if(todo.deps && todo.deps.length){
			deps.push.apply(deps, todo.deps)
		}
		var children = todo.children
		if(children) for(let i = 0; i < children.length; i++){
			this.findDeps(this.todoIds[children[i]], deps)
		}
	}

	proto.renderColor = function(framebuffer){
		var gl = this.gl
		var todo = this.todoIds[framebuffer.todoId]
		if(!todo) return
		var repaint = false

		// we have to find all our deps
		var deps = []
		this.findDeps(todo, deps)
		for(let i = 0; i < deps.length; i++){

			var fb = this.framebufferIds[deps[i]]
			var ret
			if(fb.child){
				ret = fb.child.renderChildColor(this.repaintTime, this.frameId, this.paintIds)
			}
			else ret = this.renderColor(fb)
			if(ret) repaint = true
		}

		// lets set some globals
		var nameIds = this.nameIds
		var painterUbo = this.setPainterUbo(framebuffer, false)
		
		// compensation matrix for viewport size lag main thread vs user thread
		var args = this.args
		if(framebuffer === this.mainFramebuffer){
			var lagCompMat = this.lagCompMat
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

			this.mat4Ubo(painterUbo, this.nameIds.thisDOTvertexPostMatrix, lagCompMat)
		}
		else{
			this.mat4Ubo(painterUbo, this.nameIds.thisDOTvertexPostMatrix, identityMat)
			// alright lets 
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.glfb)
			var color0 = framebuffer.attach.color0
			gl.viewport(0, 0, color0.w, color0.h)	
		}

		this.inPickPass = false
			// lets check our maxDuration
		if(this.runTodo(todo)) return true

		return repaint
	}

	proto.newPickWindow = function(width, height){
		var gl = this.gl
		var pick = {
			buf:new Uint8Array(4),
			mat: [
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1
			],
			framebuffer: gl.createFramebuffer(),
			texture: gl.createTexture(),
			depth: gl.createRenderbuffer()
		}
		gl.bindTexture(gl.TEXTURE_2D, pick.texture)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, pick.framebuffer)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pick.texture, 0)
		gl.bindRenderbuffer(gl.RENDERBUFFER, pick.depth)
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pick.depth)
		gl.bindRenderbuffer(gl.RENDERBUFFER, null)
		return pick
	}
/*
	proto.frameSyncFinger = function(digit){
		var oldSync = this.frameSyncPromise[digit]
		if(oldSync) oldSync.resolve(false)
		var sync = this.frameSyncPromise[digit] = {}
		sync.promise = new Promise(function(res, rej){sync.resolve = res, sync.reject = rej}, true)
		this.requestRepaint()
		return sync.promise
	}
*/
	proto.pickFinger = function(digit, x, y, immediate, callback){
		var pick = {}

		pick.callback = callback//new Promise(function(res, rej){pick.resolve = res, pick.reject = rej}, true)
		pick.x = x
		pick.y = y

		if(this.pickPromises[digit]) this.pickPromises[digit].callback()
		this.pickPromises[digit] = undefined

		if(immediate){
			this.paintIds = {id:1}
			pick.callback(this.renderPickWindow(digit, pick.x, pick.y))
		}
		else{
			this.pickPromises[digit] = pick
		}

		// mouse picks are done in request animation frame
		this.requestRepaint()
		//return pick.promise
	}

	proto.renderPickDep = function(framebuffer){
		if(!framebuffer) return
		var gl = this.gl
		var todo = this.todoIds[framebuffer.todoId]
		//console.log('RENDER PICKDEP')
		var deps = []
		this.findDeps(todo, deps)
		for(let i = 0; i < deps.length; i++){
			var depId = deps[i]
			var fb = this.framebufferIds[depId]
			if(fb === framebuffer) return console.error("INFINITE LOOP")
			if(fb.child){
				fb.child.renderChildPick(this.repaintTime, this.frameId)
			}
			else this.renderPickDep(fb)
		}

		// lets set some globals
		var nameIds = this.nameIds
		var painterUbo = this.setPainterUbo(framebuffer, true)
		this.mat4Ubo(painterUbo, nameIds.thisDOTvertexPostMatrix, identityMat)
		// alright lets bind the pick framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.glpfb)
		var pick = framebuffer.attach.pick
		gl.viewport(0, 0, pick.w, pick.h)
		// and draw it
		this.inPickPass = true
		this.paintId = 1
		this.paintIds = {}
		this.runTodo(todo)
	}

	proto.renderPickWindow = function(digit, x, y, force){
		var gl = this.gl
		if(!this.mainFramebuffer || !this.mainFramebuffer.todoId){
			return console.error("No Main framebuffer or attached todo found")
		}
		// find a pick window
		var pick = this.pickWindows[digit]

		// use 100x100 pickwindow
		var pickw = 100, pickh = 100 
		if(!pick) this.pickWindows[digit] = pick = this.newPickWindow(pickh,pickw), force = true

		// if our window is older than a frame, force it
		if(pick.frameId !== this.frameId - 1) force = true

		pick.frameId = this.frameId

		// the original mapping
		var args = this.args
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

		var todo = this.todoIds[this.mainFramebuffer.todoId]

		var deps = []
		this.findDeps(todo, deps)

		if(force){ // render deps before framebuffer
			for(let i = 0; i < deps.length; i++){
				var fb = this.framebufferIds[deps[i]]
				if(fb.child){
					fb.child.renderChildPick(this.repaintTime, this.frameId, this.paintIds)
				}
				else this.renderPickDep()
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
			for(let i = 0; i < deps.length; i++){
				var fb = this.framebufferIds[deps[i]]
				if(fb.child){
					fb.child.renderChildPick(this.repaintTime, this.frameId, this.paintIds)
				}
				else this.renderPickDep()
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, pick.framebuffer)
			gl.viewport(0, 0, pickw, pickh)//pickw*args.pixelratio, pickh*args.pixelratio)//args.w*args.pixelratio, args.h*args.pixelratio)//pickw, pickh)		
		}


		// set up global uniforms
		var painterUbo = this.setPainterUbo(this.mainFramebuffer, true)
		this.mat4Ubo(painterUbo, this.nameIds.thisDOTvertexPostMatrix, pickMat)
		this.inPickPass = true
		this.runTodo(todo)

		// force a sync readpixel, could also choose to delay a frame?
		if(force){
			gl.readPixels(0.5*pickw,0.5*pickh, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pick.buf)
		}

		// store last xy
		pick.xlast = x
		pick.ylast = y
		var todo = this.paintIds[pick.buf[0]]
		return {
			todoId:todo && todo.todoId || 0,
			workerId:todo && todo.workerId || 0,
			paintId:pick.buf[0],
			pickId:(pick.buf[1]<<16) |(pick.buf[2]<<8) | pick.buf[3],
		}
	}
}