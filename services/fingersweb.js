
var bus = service.bus
var canvas = service.canvas
var services = service.others

var TAP_TIME = 200
var TAP_DIST = 5
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
canvas.addEventListener('touchstart', onTouchStart)
window.addEventListener('touchmove',onTouchMove)
window.addEventListener('touchend', onTouchEnd, false)
canvas.addEventListener('touchcancel', onTouchEnd)
canvas.addEventListener('touchleave', onTouchEnd)
canvas.addEventListener('wheel', onWheel)

// 
// 
// Finger map query
// 
// 

var fingermap = {}
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

		services.painter.pickFinger(f.digit, f.x, f.y, fingers.length === 1).then(function(f, pick){
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
		}.bind(null, f), function(){})
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
		oldf.lx = f.x
		oldf.ly = f.y
		f.fn = 'onFingerMove'
		f.digit = oldf.digit
		f.workerId = oldf.workerId
		f.todoId = oldf.todoId
		f.pickId = oldf.pickId

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
		// remove the old from the finger set
		fingermap[oldf.digit] = undefined

		services.painter.onFingerUp(f)

		f.isTap = f.time - oldf.time < TAP_TIME && Math.sqrt(f.dx*f.dx+f.dy*f.dy) < TAP_DIST

		if(!oldf.todoId){
			var queue = oldf.queue || (oldf.queue = [])
			queue.push(f)
		}
		else{
			bus.postMessage(f)
		}
	}
}
function onFingerHover(fingers){
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		services.painter.pickFinger(0, f.x, f.y).then(function(f, pick){
			f.pickId = pick.pickId
			f.todoId = pick.todoId
			f.workerId = pick.workerId
			f.fn = 'onFingerHover'
			services.painter.onFingerHover(f)
			bus.postMessage(f)
		}.bind(null, f), function(){})
	}
}

function onFingerWheel(fingers){
	for(var i = 0; i < fingers.length; i++){
		var f = fingers[i]

		services.painter.pickFinger(0, f.x, f.y).then(function(f, pick){
			f.pickId = pick.pickId
			f.todoId = pick.todoId
			f.workerId = pick.workerId
			f.fn = 'onFingerWheel'
			services.painter.onFingerWheel(f)
			bus.postMessage(f)
		}.bind(null, f), function(){})
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

function onTouchStart(e){
	e.preventDefault()
	services.keyboard.onTouchStart(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
	onFingerDown(touchToFinger(e))
}

function onTouchMove(e){
	onFingerMove(touchToFinger(e))
}

function onTouchEnd(e){
	if(services.audio) services.audio.onTouchEnd()
	services.keyboard.onTouchEnd(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
	e.preventDefault()
	onFingerUp(touchToFinger(e))
}

function onWheel(e){
	if(services.keyboard.onMouseWheel(e)) return
	var f = mouseToFinger(e)
	e.preventDefault()
	var fac = 1
	if(e.deltaMode === 1) fac = 6
	else if(e.deltaMode === 2) fac = 400
	else if(isWindows) fac = 0.125
	f[0].xWheel = e.deltaX * fac
	f[0].yWheel = e.deltaY * fac
	return onFingerWheel(f)
}
