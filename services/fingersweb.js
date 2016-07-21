
var bus = service.bus
var canvas = service.canvas
var services = service.others

var userMessage = {
	setCursor:function(msg){
		canvas.style.cursor = msg.cursor
	}
}

bus.onmessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}

var TAP_TIME = 150
var TAP_DIST = 5

var fingermap = {}
var fingermapalloc = 1

function nearestFinger(x, y){
	var near_dist = Infinity, near_digit = -1
	for(var digit in fingermap){
		var p = fingermap[digit]
		if(!p) continue
		var dx = x - p.x, dy = y - p.y
		var len = Math.sqrt(dx*dx+dy*dy)
		if(len < near_dist) near_dist = len, near_digit = digit
	}
	return fingermap[near_digit]
}

function storeNewFinger(p){
		// find the hole in fingers
	for(var digit in fingermap){
		if(!fingermap[digit]) break
	}
	// we need to alloc a new one
	if(!digit || fingermap[digit]) fingermap[digit = fingermapalloc++] = p
	else fingermap[digit] = p
	p.digit = digit
}

function fingerDown(fingers){
	if(!services.painter) return
	// pick all fingers in set
	// send 
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		var pick = services.painter.pick(p.x, p.y)

		storeNewFinger(p)

		// set the ID
		p.fn = 'onFingerDown'
		// store startx for delta
		p.pick = pick
		p.sx = p.x
		p.sx = p.y
		p.dx = 0
		p.dy = 0
		// post the message
		bus.postMessage(p)
	}
}

function fingerMove(fingers){
	if(!services.painter) return
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]
		
		var op = nearestFinger(p.x, p.y)
		// copy over the startx/y
		if(!op){
			console.log('Move finger without matching finger', p)
			continue
		}
		p.sx = op.sx
		p.sy = op.sy
		p.dx = p.x - p.sx
		p.dy = p.y - p.sx
		p.fn = 'onFingerMove'
		p.digit = op.digit

		bus.postMessage(p)
	}
}

function fingerHover(fingers){
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		var pick = services.painter.pick(p.x, p.y)

		p.pick = pick
		p.fn = 'onFingerHover'
		bus.postMessage(p)
	}
}

function fingerWheel(fingers){
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		var pick = services.painter.pick(p.x, p.y)
		p.pick = pick
		p.fn = 'onFingerWheel'
		bus.postMessage(p)
	}
}

function fingerUp(fingers){
	if(!services.painter) return
	// lets retire a finger
	// lets find the nearest finger
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		var op = nearestFinger(p.x, p.y)
		// copy over the startx/y
		if(!op){
			console.log('End finger without matching finger', p)
			continue
		}
		p.sx = op.sx
		p.sy = op.sy
		p.dx = p.x - p.sx
		p.dy = p.y - p.sx
		p.fn = 'onFingerUp'
		p.finger = op.finger

		// remove the old from the finger set
		fingermap[op.digit] = undefined

		bus.postMessage(p)

		// check if dt < tapspeed
		if(p.time - op.time < TAP_TIME && Math.sqrt(p.dx*p.dx+p.dy*p.dy) < TAP_DIST){
			p.fn = 'onFingerTap'
			bus.postMessage(p)
		}

	}
}

function mouseFinger(e){
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

function touchFinger(e){
	var p = []
	for(var i = 0; i < e.changedTouches.length; i++){
		var t = e.changedTouches[i]
		p.push({
			x:t.pageX,
			y:t.pageY,
			button:1,
			touch: true,
			time:Date.now()
		})
	}
	return p
}

var down = false

function mousedown(e){
	e.preventDefault()
	down = true
	fingerDown(mouseFinger(e))
}

function mouseup(e){
	down = false
	e.preventDefault()
	fingerUp(mouseFinger(e))
}

function mousemove(e){
	if(down){
		fingerMove(mouseFinger(e))
	}
	else{
		fingerHover(mouseFinger(e))
	}
}

function touchstart(e){
	e.preventDefault()
	fingerDown(touchFinger(e))
}

function touchmove(e){
	fingerMove(touchFinger(e))
}

function touchend(e){
	e.preventDefault()
	fingerUp(touchFinger(e))
}

var is_windows = typeof navigator !== 'undefined' && navigator.appVersion.indexOf("Win") > -1

function wheel(e){
	var p = mouseFinger(e)
	e.preventDefault()
	var fac = 1
	if(e.deltaMode === 1) fac = 6
	else if(e.deltaMode === 2) fac = 400
	else if(is_windows) fac = 0.125
	p[0].wheelx = e.deltaX * fac
	p[0].wheely = e.deltaY * fac
	return fingerWheel(p)
}

var canvas = service.canvas

canvas.addEventListener('mousedown',mousedown)
canvas.addEventListener('mouseup',mouseup)
canvas.addEventListener('mousemove',mousemove)
canvas.addEventListener('contextmenu',function(e){
	e.preventDefault()
	return false
})
canvas.addEventListener('touchstart', touchstart)
canvas.addEventListener('touchmove',touchmove)
canvas.addEventListener('touchend', touchend)
canvas.addEventListener('touchcancel', touchend)
canvas.addEventListener('touchleave', touchend)
canvas.addEventListener('wheel', wheel)