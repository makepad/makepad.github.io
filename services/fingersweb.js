
var bus = service.bus
var canvas = service.canvas
var services = service.others

var ownerServices = service.ownerServices
if(ownerServices){
	console.log('bailin')
	return
}

var TAP_TIME = 350

var TAP_DIST_TOUCH = 50
var TAP_DIST_MOUSE = 5

var isWindows = typeof navigator !== 'undefined' && navigator.appVersion.indexOf("Win") > -1

// 
// 
// Service API
// 
//

var userMessage = {
	setCursor:function(msg){
		canvas.style.cursor = msg.cursor
	}
}

bus.onmessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}

// 
// 
// Attached listeners
// 
// 

canvas.addEventListener('mousedown',onMouseDown)
window.addEventListener('mouseup',onMouseUp)
window.addEventListener('mousemove',onMouseMove)
canvas.addEventListener('contextmenu',function(e){
	e.preventDefault()
	return false
})
window.addEventListener('touchstart', onTouchStart)
//canvas.addEventListener('touchstart', onTouchStart)
window.addEventListener('touchmove',onTouchMove)
window.addEventListener('touchend', onTouchEnd, false)
canvas.addEventListener('touchcancel', onTouchEnd)
canvas.addEventListener('touchleave', onTouchEnd)
canvas.addEventListener('wheel', onWheel)

window.addEventListener('webkitmouseforcewillbegin', onCheckMacForce, false)
window.addEventListener('webkitmouseforcechanged', onCheckMacForce, false)

// 
// 
// Finger map query
// 
// 

var fingermap = {}
var tapmap = {}
var fingermapalloc = 1

function nearestFinger(x, y){
	var near_dist = Infinity, near_digit = -1
	for(var digit in fingermap){
		var f = fingermap[digit]
		if(!f) continue
		var dx = x - f.x, dy = y - f.y
		var len = Math.sqrt(dx*dx+dy*dy)
		if(len < near_dist) near_dist = len, near_digit = digit
	}
	return fingermap[near_digit]
}

function storeNewFinger(f){
		// find the hole in fingers
	for(var digit in fingermap){
		if(!fingermap[digit]) break
	}
	// we need to alloc a new one
	if(!digit || fingermap[digit]) fingermap[digit = fingermapalloc++] = f
	else fingermap[digit] = f
	f.digit = parseInt(digit)
}

// 
// 
// Finger listeners (called by direct listeners)
// 
// 

function onFingerDown(fingers){
	if(!services.painter) return
	// pick all fingers in set
	// send 
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		storeNewFinger(f)
		var dt = Date.now()

		// post it twice, first is the immediate message
		f.fn = 'onImmediateFingerDown'
		bus.postMessage(f)

		services.painter.pickFinger(f.digit, f.x, f.y, fingers.length === 1).then(function(f, pick){
			if(!pick) return
			// set the ID
			f.fn = 'onFingerDown'
			// store startx for delta
			f.pickId = pick.pickId
			f.todoId = pick.todoId
			f.workerId = pick.workerId
			f.sx = f.x
			f.sy = f.y
			f.dx = 0
			f.dy = 0
			f.move = 0
			var oldf = tapmap[f.digit]
			if(oldf){
				var dx = f.x - oldf.x, dy = f.y - oldf.y
				var isTap = f.time - oldf.time < TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?TAP_DIST_TOUCH:TAP_DIST_MOUSE)
				if(isTap) f.tapCount = oldf.tapCount
				else f.tapCount = 0
			}
			else f.tapCount = 0

			services.painter.onFingerDown(f)

			// post the message
			bus.postMessage(f)
			if(f.queue){
				for(var i = 0; i < f.queue.length; i++){
					var q = f.queue[i]
					q.pick = pick
					bus.postMessage(q)
				}
			}
		}.bind(null, f))
	}
}

function onFingerMove(fingers){
	if(!services.painter) return
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]
		
		var oldf = nearestFinger(f.x, f.y)
		// copy over the startx/y
		if(!oldf){
			console.log('Move finger without matching finger', f)
			continue
		}
		f.sx = oldf.sx
		f.sy = oldf.sy
		oldf.dx = f.dx = isNaN(oldf.lx)?0:oldf.lx - f.x
		oldf.dy = f.dy = isNaN(oldf.ly)?0:oldf.ly - f.y
		oldf.move++
		oldf.lx = f.x
		oldf.ly = f.y
		f.fn = 'onFingerMove'
		f.digit = oldf.digit
		f.workerId = oldf.workerId
		f.todoId = oldf.todoId
		f.pickId = oldf.pickId
		f.tapCount = oldf.tapCount

		services.painter.onFingerMove(f)

		if(!oldf.todoId){
			var queue = oldf.queue || (oldf.queue = [])
			queue.push(f)
		}
		else bus.postMessage(f)
	}
}

function onFingerUp(fingers){
	if(!services.painter) return

	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		var oldf = nearestFinger(f.x, f.y)

		// copy over the startx/y
		if(!oldf){
			//console.log('End finger without matching finger', p)
			continue
		}

		f.sx = oldf.sx
		f.sy = oldf.sy
		f.fn = 'onFingerUp'
		f.digit = oldf.digit
		f.pickId = oldf.pickId
		f.todoId = oldf.todoId
		f.workerId = oldf.workerId

		f.dx = oldf.dx
		f.dy = oldf.dy
		if(oldf.move === 1){
			if(!f.dx) f.dx = (f.sx - f.x)/3
			if(!f.dy) f.dy = (f.sy - f.y)/3
		}

		fingermap[oldf.digit] = undefined

		// store it for tap counting
		tapmap[oldf.digit] = f
		var dx = f.sx - f.x
		var dy = f.sy - f.y
		var isTap = f.time - oldf.time < TAP_TIME && Math.sqrt(dx*dx+dy*dy) < (f.touch?TAP_DIST_TOUCH:TAP_DIST_MOUSE)
		if(isTap) f.tapCount = oldf.tapCount + 1
		else f.tapCount = 0

		services.painter.onFingerUp(f)

		if(!oldf.todoId){
			var queue = oldf.queue || (oldf.queue = [])
			queue.push(f)
		}
		else{
			bus.postMessage(f)
		}

		return f.tapCount
	}
}
function onFingerHover(fingers){
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		services.painter.pickFinger(0, f.x, f.y).then(function(f, pick){
			if(!pick) return
			f.pickId = pick.pickId
			f.todoId = pick.todoId
			f.workerId = pick.workerId
			f.fn = 'onFingerHover'
			services.painter.onFingerHover(f)
			bus.postMessage(f)
		}.bind(null, f))
	}
}

function onFingerForce(fingers){
	if(!services.painter) return
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]
		var oldf = nearestFinger(f.x, f.y)

		f.fn = 'onFingerForce'
		f.digit = oldf.digit
		f.pickId = oldf.pickId
		f.todoId = oldf.todoId
		f.workerId = oldf.workerId

		bus.postMessage(f)
	}
}

function onFingerWheel(fingers){
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		services.painter.pickFinger(0, f.x, f.y).then(function(f, pick){
			if(!pick) return
			f.pickId = pick.pickId
			f.todoId = pick.todoId
			f.workerId = pick.workerId
			f.fn = 'onFingerWheel'
			services.painter.onFingerWheel(f)
			bus.postMessage(f)
		}.bind(null, f))
	}
}


// 
// 
// Direct listeners
// 
// 

// convert mouse event to finger
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
	for(var i = 0; i < e.changedTouches.length; i++){
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

var mouseIsDown = false

function onMouseDown(e){
	e.preventDefault()
	if(services.keyboard.onMouseDown(e))return
	mouseIsDown = true
	onFingerDown(mouseToFinger(e))
}

function onMouseUp(e){
	mouseIsDown = false
	e.preventDefault()
	if(services.keyboard.onMouseUp(e)) return
	onFingerUp(mouseToFinger(e))
}

function onMouseMove(e){
	if(mouseIsDown){
		onFingerMove(mouseToFinger(e))
	}
	else{
		onFingerHover(mouseToFinger(e))
	}
}

// running every frame
var touchPollEvent
var touchPollRefs = 0
var touchPollItv 

function onForceInterval(){
	onFingerForce(touchToFinger(touchPollEvent))
}

function onCheckMacForce(e){
	// lets reuse our mouse
	var fingers = touchToFinger(touchPollEvent)
	for(var i = 0; i < fingers.length; i++){
		fingers[i].force = e.webkitForce / 3.0
	}
	onFingerForce(fingers)
}

function onTouchStart(e){
	e.preventDefault()
	if(e.changedTouches[0].force !== undefined){
		touchPollEvent = e
		if(!touchPollRefs++){
			touchPollItv = setInterval(onForceInterval,16)
		}
	}
	services.keyboard.onTouchStart(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
	onFingerDown(touchToFinger(e))
}

function onTouchMove(e){
	onFingerMove(touchToFinger(e))
}

function onTouchEnd(e){
	if(services.audio) services.audio.onTouchEnd()
	if(touchPollRefs){
		if(!--touchPollRefs){
			clearInterval(touchPollItv)
		}
	}
	e.preventDefault()
	var tapCount = onFingerUp(touchToFinger(e))
	services.keyboard.onTouchEnd(e.changedTouches[0].pageX, e.changedTouches[0].pageY, tapCount)
}

function onWheel(e){
	if(services.keyboard.onMouseWheel(e)) return
	var f = mouseToFinger(e)
	e.preventDefault()
	var fac = 1
	if(e.deltaMode === 1) fac = 6
	else if(e.deltaMode === 2) fac = 400
	f[0].xWheel = e.deltaX * fac
	f[0].yWheel = e.deltaY * fac
	return onFingerWheel(f)
}
