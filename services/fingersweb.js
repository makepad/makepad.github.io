
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

var TAP_TIME = 200
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
	p.digit = parseInt(digit)
}

function fingerDown(fingers){
	if(!services.painter) return
	// pick all fingers in set
	// send 
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		storeNewFinger(p)

		services.painter.pickFinger(p.digit, p.x, p.y, fingers.length === 1).then(function(p, pick){
			// set the ID
			p.fn = 'onFingerDown'
			// store startx for delta
			p.pick = pick
			p.sx = p.x
			p.sy = p.y
			p.dx = 0
			p.dy = 0

			services.painter.updateFinger(p.pick, p.digit, p.x, p.y, 0, 0, 2)

			// post the message
			bus.postMessage(p)
			if(p.queue){
				for(var i = 0; i < p.queue.length; i++){
					var q = p.queue[i]
					q.pick = pick
					bus.postMessage(q)
				}
			}
		}.bind(null, p), function(){})
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

		op.dx = p.dx = isNaN(op.lx)?0:op.lx - p.x
		op.dy = p.dy = isNaN(op.ly)?0:op.ly - p.y
		op.lx = p.x
		op.ly = p.y
		p.fn = 'onFingerMove'
		p.digit = op.digit
		p.pick = op.pick

		services.painter.updateFinger(p.pick, p.digit, p.x, p.y, p.dx, p.dy, 0)

		if(!op.pick){
			var queue = op.queue || (op.queue = [])
			queue.push(p)
		}
		else bus.postMessage(p)
	}
}
var dx = 0, dy =0 
function fingerHover(fingers){
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]
		services.painter.updateFinger(0, p.x, p.y)
		services.painter.pickFinger(0, p.x, p.y).then(function(p, pick){
			p.pick = pick
			p.fn = 'onFingerHover'
			bus.postMessage(p)
		}.bind(null, p), function(){})
	}
}

function fingerWheel(fingers){
	for(var i = 0; i < fingers.length; i++){
		var p = fingers[i]

		services.painter.pickFinger(0, p.x, p.y).then(function(p, pick){
			services.painter.scrollFinger(pick, p.xScroll, p.yScroll)
			p.pick = pick
			p.fn = 'onFingerWheel'
			bus.postMessage(p)
		}.bind(null, p), function(){})
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
			//console.log('End finger without matching finger', p)
			continue
		}

		p.sx = op.sx
		p.sy = op.sy
		p.fn = 'onFingerUp'
		p.digit = op.digit
		p.pick = op.pick
		// remove the old from the finger set
		fingermap[op.digit] = undefined

		services.painter.updateFinger(p.pick, p.digit, p.x, p.y, op.dx, op.dy, 1)

		p.isTap = p.time - op.time < TAP_TIME && Math.sqrt(p.dx*p.dx+p.dy*p.dy) < TAP_DIST

		if(!op.pick){
			var queue = op.queue || (op.queue = [])
			queue.push(p)
		}
		else{
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
var showingInput = false
function mousedown(e){
	e.preventDefault()
	if(e.button === 2){
		if(services.keyboard.mouseDown(e.pageX, e.pageY))return
	}
	down = true
	fingerDown(mouseFinger(e))
}

function mouseup(e){
	down = false
	e.preventDefault()
	if(e.button === 2){
		if(services.keyboard.mouseUp(e.pageX, e.pageY)) return
	}
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
	services.keyboard.touchStart(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
	fingerDown(touchFinger(e))
}

function touchmove(e){
	fingerMove(touchFinger(e))
}

function touchend(e){
	if(exports.onTouchEndHook) exports.onTouchEndHook()
	services.keyboard.touchEnd(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
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
	p[0].xScroll = e.deltaX * fac
	p[0].yScroll = e.deltaY * fac
	return fingerWheel(p)
}

var canvas = service.canvas

canvas.addEventListener('mousedown',mousedown)
window.addEventListener('mouseup',mouseup)
window.addEventListener('mousemove',mousemove)
canvas.addEventListener('contextmenu',function(e){
	e.preventDefault()
	return false
})
canvas.addEventListener('touchstart', touchstart)
window.addEventListener('touchmove',touchmove)
window.addEventListener('touchend', touchend, false)
canvas.addEventListener('touchcancel', touchend)
canvas.addEventListener('touchleave', touchend)
canvas.addEventListener('wheel', wheel)