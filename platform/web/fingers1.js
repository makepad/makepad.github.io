

module.exports = class extends require('/platform/service'){
	constructor(...args){
		super(...args)
		this.name = 'fingers1'
		
		this.TAP_TIME = 350
		this.TAP_DIST_TOUCH = 50
		this.TAP_DIST_MOUSE = 5

		if(this.parent){
			return
		}
		// 	this.parentFingers = this.parent.services[this.name]
		// 	//return this.parentFingers.addChild(this)
		// }
		this.children = {}
		this.fingerMap = {}
		this.dragMap = {}
		this.hoverMap = {}
		this.tapMap = {}
		this.fingerMapAlloc = 1
		this.onForceInterval = this.onForceInterval.bind(this)
		this.mouseIsDown = false

		var canvas = this.platform.canvas

		canvas.addEventListener('mousedown',this.onMouseDown.bind(this))
		window.addEventListener('mouseup',this.onMouseUp.bind(this))
		window.addEventListener('mousemove',this.onMouseMove.bind(this))
		window.addEventListener('mouseout',this.onMouseMove.bind(this))
		canvas.addEventListener('contextmenu',function(e){
			e.preventDefault()
			return false
		})
		window.addEventListener('touchstart', this.onTouchStart.bind(this))
		//canvas.addEventListener('touchstart', onTouchStart)
		window.addEventListener('touchmove',this.onTouchMove.bind(this))
		window.addEventListener('touchend', this.onTouchEnd.bind(this), false)
		canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this))
		canvas.addEventListener('touchleave', this.onTouchEnd.bind(this))
		canvas.addEventListener('wheel', this.onWheel.bind(this))

		window.addEventListener('webkitmouseforcewillbegin', this.onCheckMacForce.bind(this), false)
		window.addEventListener('webkitmouseforcechanged', this.onCheckMacForce.bind(this), false)
	}

	// addChild(child){
	// 	if(this.parent){
	// 		return this.parentFingers.addChild(this)
	// 	}
	// 	this.children[child.worker.workerId] = child
	// }

	batchMessage(msg){
		// allright so we have a message.
		// it has a workerId.
		// we need to send the message to the entire worker chain
		// lets find the worker object
		if(msg.workerId){
			var afterEntryCbs = this.worker.afterEntryCallbacks
			var worker = this.root.workerIds[msg.workerId]
			// ok now, lets batchmessage for workers all the way up to the root
			var lastLocalId = 0
			while(worker){
				var after = worker.onAfterEntry
				if(afterEntryCbs.indexOf(after) === -1){
					afterEntryCbs.push(after)
				}
				worker.batchMessages.push({
					$:'fingers1', 
					msg:{
						localId:lastLocalId,
						body:msg
					}
				})
				lastLocalId = worker.localId
				worker = worker.parent
			}
		}
		/*		
		if(msg.workerId === this.worker.workerId){
			return super.batchMessage(msg)
		}
		// otherwise post to a child
		var child = this.children[msg.workerId]
		if(child){
			var after = child.worker.onAfterEntry
			if(this.worker.afterEntryCallbacks.indexOf(after) === -1){
				this.worker.afterEntryCallbacks.push(after)
			}
			child.batchMessage(msg)
		}*/
		//else console.log('fingers1 invalid worker ID', msg)
	}
	/*
	postMessage(msg){
		if(!msg.workerId){
			super.postMessage(msg)
			for(let key in this.children) this.children[key].postMessage(msg)
			return
		}

		if(msg.workerId === this.worker.workerId){
			return super.postMessage(msg)
		}
		// otherwise post to a child
		var child = this.children[msg.workerId]
		if(child) child.postMessage(msg)
		else console.log('fingers1 invalid worker ID', msg)
	}*/

	user_setCursor(msg){
		if(!cursors[msg.cursor]) return
		// use the body as the cursor container
		document.body.style.cursor = msg.cursor
	}

	user_startFingerDrag(msg){
		this.dragMap[msg.digit] = 1
	}

	// 
	// 
	// Finger map query
	// 
	// 

	nearestFinger(x, y){
		var near_dist = Infinity, near_digit = -1
		for(let digit in this.fingerMap){
			var f = this.fingerMap[digit]
			if(!f) continue
			var dx = x - f.x, dy = y - f.y
			var len = Math.sqrt(dx*dx+dy*dy)
			if(len < near_dist) near_dist = len, near_digit = digit
		}
		return this.fingerMap[near_digit]
	}

	storeNewFinger(f){
		// find the hole in fingers
		for(var digit in this.fingerMap){
			if(!this.fingerMap[digit]) break
		}
		// we need to alloc a new one
		if(!digit || this.fingerMap[digit]) this.fingerMap[digit = this.fingerMapAlloc++] = f
		else this.fingerMap[digit] = f
		f.digit = parseInt(digit)
	}

	// 
	// 
	// Finger listeners (called by direct listeners)
	// 
	// 

	messageFinger(f, fn, pick){
		let fm = {}
		for(let key in f) fm[key] = f[key]
		fm.fn = fn
		fm.pileupTime = Date.now()
		if(pick){
			fm.pickId = pick.pickId
			fm.todoId = pick.todoId
			fm.workerId = pick.workerId
		}
		return fm
	}

	onFingerDown(fingers){
		if(!this.worker.services.painter1) return
		// pick all fingers in set
		// send 
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.storeNewFinger(f)

			// post it twice, first is the immediate message
			let fm = this.messageFinger(f, 'onFingerDownNow')
			this.batchMessage(fm)

			this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, fingers.length === 1,function(f, pick){
				if(!pick) return
				

				f.dx = 0
				f.dy = 0
				f.move = 0
				f.pickId = pick.pickId
				f.todoId = pick.todoId
				f.workerId = pick.workerId
				f.xDown = f.x
				f.yDown = f.y
				// compute tapcount
				var oldf = this.tapMap[f.digit]
				if(oldf){
					var dx = f.x - oldf.x, dy = f.y - oldf.y
					var isTap = f.time - oldf.time < this.TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?this.TAP_DIST_TOUCH:this.TAP_DIST_MOUSE)
					if(isTap) f.tapCount = oldf.tapCount
					else f.tapCount = 0
				}
				else f.tapCount = 0

				let fm = this.messageFinger(f, 'onFingerDown')
				this.worker.services.painter1.onFingerDown(fm)
				// post the message
				this.batchMessage(fm)
			}.bind(this, f))
		}
	}

	onFingerMove(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]
			
			var oldf = this.nearestFinger(f.x, f.y)
			// copy over the startx/y
			if(!oldf){
				console.log('Move finger without matching finger', f)
				continue
			}

			// keep track on stored finger
			oldf.dx = f.dx = isNaN(oldf.xLast)?0:oldf.xLast - f.x
			oldf.dy = f.dy = isNaN(oldf.yLast)?0:oldf.yLast - f.y
			oldf.move++
			oldf.xLast = f.x
			oldf.yLast = f.y

			// write to f
			f.xDown = oldf.xDown
			f.yDown = oldf.yDown
			f.digit = oldf.digit
			f.tapCount = oldf.tapCount

			var fm = this.messageFinger(f, 'onFingerMove', oldf)
			this.worker.services.painter1.onFingerMove(fm)

			if(!this.dragMap[f.digit]){
				this.batchMessage(fm)
			}
			else{
				this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, false, function(f, pick){
					if(!pick) return
					this.batchMessage(this.messageFinger(f, 'onFingerMove'))
					this.batchMessage(this.messageFinger(f, 'onFingerDrag', pick))
				}.bind(this,f))
			}
		}
		this.worker.onAfterEntry()
	}

	onFingerUp(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			var oldf = this.nearestFinger(f.x, f.y)

			// copy over the startx/y
			if(!oldf){
				continue
			}

			f.xDown = oldf.xDown
			f.yDown = oldf.yDown
			f.digit = oldf.digit
			f.dx = oldf.dx
			f.dy = oldf.dy
			f.pickId = oldf.pickId
			f.todoId = oldf.todoId
			f.workerId = oldf.workerId
			var dx = f.xDown - f.x
			var dy = f.yDown - f.y
			var isTap = f.time - oldf.time < this.TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?this.TAP_DIST_TOUCH:this.TAP_DIST_MOUSE)
			if(isTap) f.tapCount = oldf.tapCount + 1
			else f.tapCount = 0

			if(oldf.move === 1){ // fix the flick scroll
				if(!f.dx) f.dx = (f.xDown - f.x)/3
				if(!f.dy) f.dy = (f.yDown - f.y)/3
			}

			var fm = this.messageFinger(f, 'onFingerUpNow', oldf)
			this.batchMessage(fm)

			// remove mappings
			this.fingerMap[oldf.digit] = undefined
			this.dragMap[oldf.digit] = undefined
			// store it for tap counting
			this.tapMap[oldf.digit] = f
			
			this.worker.services.painter1.onFingerUp(fm)
			this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, false, function(f, pick){
				if(pick && f.workerId === pick.workerId &&
					f.pickId === pick.pickId &&
					f.todoId === pick.todoId){
					f.samePick = true
				}
				else f.samePick = false
				this.batchMessage(this.messageFinger(f, 'onFingerUp', pick))
			}.bind(this, f))
		
			return f.tapCount
		}
	}


	onFingerHover(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.worker.services.painter1.pickFinger(0, f.x, f.y, false, function(f, pick){
				if(!pick) return
				f.pileupTime = Date.now()
				var last = this.hoverMap[f.digit]
				if(!last || last.pickId !== pick.pickId || last.todoId !== pick.todoId || last.workerId !== pick.workerId){
					if(last){
						this.batchMessage(this.messageFinger(f,'onFingerOut',last))
					}
					this.batchMessage(this.messageFinger(f,'onFingerOver',pick))
				}
				this.hoverMap[f.digit] = pick

				var fm = this.messageFinger(f, 'onFingerHover', pick)
				this.worker.services.painter1.onFingerHover(fm)
				this.batchMessage(fm)

				//this.worker.onAfterEntry()
			}.bind(this, f))
		}
	}

	onFingerForce(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]
			var oldf = this.nearestFinger(f.x, f.y)
			f.digit = oldf.digit
			this.batchMessage(this.messageFinger(f,'onFingerForce',oldf))
		}
	}

	onFingerWheel(fingers){
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.worker.services.painter1.pickFinger(0, f.x, f.y, false, function(f, pick){
				if(!pick) return
				var fm = this.messageFinger(f, 'onFingerWheel', pick)
				this.worker.services.painter1.onFingerWheel(fm)
				this.batchMessage(fm)
			}.bind(this, f))
		}
	}

	onMouseDown(e){
		e.preventDefault()
		if(this.worker.services.keyboard1.onMouseDown(e))return
		this.mouseIsDown = true
		this.onFingerDown(mouseToFinger(e))
		this.worker.onAfterEntry()
	}

	onMouseUp(e){
		this.mouseIsDown = false
		e.preventDefault()
		if(this.worker.services.keyboard1.onMouseUp(e)) return
		this.onFingerUp(mouseToFinger(e))
		this.worker.onAfterEntry()
	}

	onMouseMove(e){
		if(this.mouseIsDown){
			this.onFingerMove(mouseToFinger(e))
		}
		else{
			this.onFingerHover(mouseToFinger(e))
		}
		this.worker.onAfterEntry()
	}

	onForceInterval(){
		this.onFingerForce(touchToFinger(this.touchPollEvent))
		this.worker.onAfterEntry()
	}

	onCheckMacForce(e){
		// lets reuse our mouse
		var fingers = touchToFinger(touchPollEvent)
		for(let i = 0; i < fingers.length; i++){
			fingers[i].force = e.webkitForce / 3.0
		}
		this.onFingerForce(fingers)
		this.worker.onAfterEntry()
	}

	onTouchStart(e){
		e.preventDefault()
		if(e.changedTouches[0].force !== undefined){
			this.touchPollEvent = e

			if(!(this.touchPollRefs||0)){
				this.touchPollRefs = (this.touchPollRefs || 0) + 1
				this.touchPollItv = setInterval(this.onForceInterval,16)
			}
		}
		this.worker.services.keyboard1.onTouchStart(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
		this.onFingerDown(touchToFinger(e))
		this.worker.onAfterEntry()
	}

	onTouchMove(e){
		this.onFingerMove(touchToFinger(e))
		this.worker.onAfterEntry()
	}

	onTouchEnd(e){
		if(this.worker.services.audio1) this.worker.services.audio1.onTouchEnd()
		if(this.touchPollRefs){
			if(!--this.touchPollRefs){
				clearInterval(this.touchPollItv)
			}
		}
		e.preventDefault()
		var tapCount = this.onFingerUp(touchToFinger(e))
		this.worker.services.keyboard1.onTouchEnd(e.changedTouches[0].pageX, e.changedTouches[0].pageY, tapCount)
		this.worker.onAfterEntry()
	}

	onWheel(e){
		if(this.worker.services.keyboard1.onMouseWheel(e)) return
		var f = mouseToFinger(e)
		e.preventDefault()
		var fac = 1
		if(e.deltaMode === 1) fac = 40
		else if(e.deltaMode === 2) fac = window.offsetHeight

		f[0].xWheel = e.deltaX * fac
		f[0].yWheel = e.deltaY * fac
		this.onFingerWheel(f)
		this.worker.onAfterEntry()
	}
}

// 
// 
// Utils
// 
// 
var cursors = {
	'none':1,
	'auto':1,
	'default':1, 
	'contextMenu':1,
	'help':1,
	'alias':1,
	'copy':1,
	'progress':1,
	'wait':1,
	'not-allowed':1,
	'pointer':1,
	'no-drop':1,
	'grab':1,
	'grabbing':1,
	'zoom-in':1,
	'zoom-out':1,
	'move':1,
	'all-scroll':1,
	'text':1,
	'vertical-text':1,
	'cell':1,
	'crosshair':1,
	'col-resize':1,
	'row-resize':1,
	'n-resize':1,
	'e-resize':1,
	's-resize':1,
	'w-resize':1,
	'ne-resize':1,
	'nw-resize':1,
	'se-resize':1,
	'sw-resize':1,
	'ew-resize':1,
	'ns-resize':1,
	'nesw-resize':1,
	'nwse-resize':1,
}

function mouseToFinger(e){
	return [{
		x:e.pageX,
		y:e.pageY,
		button: e.button === 0? 1: e.button===1? 3: 2,
		touch: false,
		time:Date.now(),
		digit:1,
		ctrl:e.ctrlKey,
		alt:e.altKey,
		shift:e.shiftKey,
		meta:e.metaKey
	}]
}

function touchToFinger(e){
	var f = []
	for(let i = 0; i < e.changedTouches.length; i++){
		var t = e.changedTouches[i]
		f.push({
			x:t.pageX,
			y:t.pageY,
			force:t.force,
			button:1,
			touch: true,
			time:Date.now()
		})
	}
	return f
}