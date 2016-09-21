

module.exports = class fingers1 extends require('/platform/service'){
	constructor(...args){
		super(...args)
		
		this.TAP_TIME = 350
		this.TAP_DIST_TOUCH = 50
		this.TAP_DIST_MOUSE = 5

		if(this.parent){
			this.parentFingers = this.parent.services[this.constructor.name]
			return this.parentFingers.addChild(this)
		}
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

	addChild(child){
		if(this.parent){
			return this.parentFingers.addChild(this)
		}
		this.children[child.worker.workerId] = child
	}

	batchMessage(msg){
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
		}
		else console.log('fingers1 invalid worker ID', msg)
	}

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
	}

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

	onFingerDown(fingers){
		if(!this.worker.services.painter1) return
		// pick all fingers in set
		// send 
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.storeNewFinger(f)
			var dt = Date.now()

			// post it twice, first is the immediate message
			f.fn = 'onFingerDownNow'
			this.postMessage(f)

			this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, fingers.length === 1).then(function(f, pick){
				if(!pick) return
				// set the ID
				f.fn = 'onFingerDown'
				// store startx for delta
				f.pickId = pick.pickId
				f.todoId = pick.todoId
				f.workerId = pick.workerId
				f.xDown = f.x
				f.yDown = f.y
				f.dx = 0
				f.dy = 0
				f.move = 0
				var oldf = this.tapMap[f.digit]
				if(oldf){
					var dx = f.x - oldf.x, dy = f.y - oldf.y
					var isTap = f.time - oldf.time < this.TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?this.TAP_DIST_TOUCH:this.TAP_DIST_MOUSE)
					if(isTap) f.tapCount = oldf.tapCount
					else f.tapCount = 0
				}
				else f.tapCount = 0

				this.worker.services.painter1.onFingerDown(f)

				// post the message
				this.postMessage(f)
				if(f.queue){
					for(let i = 0; i < f.queue.length; i++){
						var q = f.queue[i]
						q.pick = pick
						this.postMessage(q)
					}
				}
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
			f.xDown = oldf.xDown
			f.yDown = oldf.yDown
			oldf.dx = f.dx = isNaN(oldf.xLast)?0:oldf.xLast - f.x
			oldf.dy = f.dy = isNaN(oldf.yLast)?0:oldf.yLast - f.y
			oldf.move++
			oldf.xLast = f.x
			oldf.yLast = f.y
			f.fn = 'onFingerMove'
			f.digit = oldf.digit
			f.workerId = oldf.workerId
			f.todoId = oldf.todoId
			f.pickId = oldf.pickId
			f.tapCount = oldf.tapCount

			this.worker.services.painter1.onFingerMove(f)

			if(!oldf.todoId){
				var queue = oldf.queue || (oldf.queue = [])
				queue.push(f)
			}
			else{
				// lets check if we are dragging this digit
				if(this.dragMap[f.digit]){
					this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, false).then(function(f, pick){
						if(!pick) return
						this.postMessage(f)
						f.fn = 'onFingerDrag'
						f.todoId = pick.todoId,
						f.pickId = pick.pickId
						f.workerId = pick.workerId
						f.pileupTime = Date.now()
						this.postMessage(f)
					}.bind(this,f))
				}
				else{
					f.pileupTime = Date.now()
					this.batchMessage(f)
				}
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
				//console.log('End finger without matching finger', p)
				continue
			}

			f.xDown = oldf.xDown
			f.yDown = oldf.yDown
			f.fn = 'onFingerUpNow'
			f.digit = oldf.digit
			f.pickId = oldf.pickId
			f.todoId = oldf.todoId
			f.workerId = oldf.workerId

			f.dx = oldf.dx
			f.dy = oldf.dy
			if(oldf.move === 1){
				if(!f.dx) f.dx = (f.xDown - f.x)/3
				if(!f.dy) f.dy = (f.yDown - f.y)/3
			}

			this.fingerMap[oldf.digit] = undefined
			this.dragMap[oldf.digit] = undefined
			// store it for tap counting
			this.tapMap[oldf.digit] = f
			var dx = f.xDown - f.x
			var dy = f.yDown - f.y
			var isTap = f.time - oldf.time < this.TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?this.TAP_DIST_TOUCH:this.TAP_DIST_MOUSE)

			if(isTap) f.tapCount = oldf.tapCount + 1
			else f.tapCount = 0

			this.worker.services.painter1.onFingerUp(f)

			if(!oldf.todoId){
				var queue = oldf.queue || (oldf.queue = [])
				queue.push(f)
			}
			else{
				this.worker.services.painter1.pickFinger(f.digit, f.x, f.y, false).then(function(f, pick){
					f.fn = 'onFingerUp'

					if(pick && f.workerId === pick.workerId &&
						f.pickId === pick.pickId &&
						f.todoId === pick.todoId){
						f.samePick = true
					}
					else f.samePick = false
					this.postMessage(f)
				}.bind(this, f))
			}

			return f.tapCount
		}
	}

	cloneFinger(f, fn, pick){
		var o = {}
		for(let key in f){
			o[key] = f[key]
		}
		o.fn = fn
		o.pickId = pick.pickId
		o.todoId = pick.todoId
		o.workerId = pick.workerId
		return o
	}

	onFingerHover(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.worker.services.painter1.pickFinger(0, f.x, f.y).then(function(f, pick){
				if(!pick) return
				f.pileupTime = Date.now()
				var last = this.hoverMap[f.digit]
				if(!last || last.pickId !== pick.pickId || last.todoId !== pick.todoId || last.workerId !== pick.workerId){
					if(last){
						this.batchMessage(this.cloneFinger(f,'onFingerOut',last))
					}
					this.batchMessage(this.cloneFinger(f,'onFingerOver',pick))
				}
				this.hoverMap[f.digit] = pick

				f.pickId = pick.pickId
				f.todoId = pick.todoId
				f.workerId = pick.workerId
				f.fn = 'onFingerHover'
				
				this.worker.services.painter1.onFingerHover(f)
				
				this.batchMessage(f)

				//this.worker.onAfterEntry()
			}.bind(this, f))
		}
	}

	onFingerForce(fingers){
		if(!this.worker.services.painter1) return
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]
			var oldf = this.nearestFinger(f.x, f.y)

			f.fn = 'onFingerForce'
			f.digit = oldf.digit
			f.pickId = oldf.pickId
			f.todoId = oldf.todoId
			f.workerId = oldf.workerId

			this.postMessage(f)
		}
	}

	onFingerWheel(fingers){
		for(let i = 0; i < fingers.length; i++){
			var f = fingers[i]

			this.worker.services.painter1.pickFinger(0, f.x, f.y).then(function(f, pick){
				if(!pick) return
				f.pickId = pick.pickId
				f.todoId = pick.todoId
				f.workerId = pick.workerId
				f.fn = 'onFingerWheel'
				f.pileupTime = Date.now()
				this.worker.services.painter1.onFingerWheel(f)
				this.postMessage(f)
			}.bind(this, f))
		}
	}

	onMouseDown(e){
		e.preventDefault()
		if(this.worker.services.keyboard1.onMouseDown(e))return
		this.mouseIsDown = true
		this.onFingerDown(mouseToFinger(e))
	}

	onMouseUp(e){
		this.mouseIsDown = false
		e.preventDefault()
		if(this.worker.services.keyboard1.onMouseUp(e)) return
		this.onFingerUp(mouseToFinger(e))
	}

	onMouseMove(e){
		if(this.mouseIsDown){
			this.onFingerMove(mouseToFinger(e))
		}
		else{
			this.onFingerHover(mouseToFinger(e))
		}
	}

	onForceInterval(){
		this.onFingerForce(touchToFinger(this.touchPollEvent))
	}

	onCheckMacForce(e){
		// lets reuse our mouse
		var fingers = touchToFinger(touchPollEvent)
		for(let i = 0; i < fingers.length; i++){
			fingers[i].force = e.webkitForce / 3.0
		}
		this.onFingerForce(fingers)
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
	}

	onTouchMove(e){
		this.onFingerMove(touchToFinger(e))
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
		return this.onFingerWheel(f)
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