
var bus = service.bus
var canvas = service.canvas
var services = service.others

var userMessage = {
}

bus.onmessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}

var fireFoxRemap = {
	91:93,
	92:93,
	224:93, // right meta
	61:187, // equals
	173:189, // minus
	59:186 // semicolon
}

function keyDown(e){
	var code = fireFoxRemap[e.keyCode] || e.keyCode
	bus.postMessage({
		fn:'onKeyDown',
		repeat: e.repeat,
		code:code,
		shift: e.shiftKey?true:false,
		alt: e.altKey?true:false,
		ctrl: e.ctrlKey?true:false,
		meta: e.metaKey?true:false
	})
}

function keyUp(e){
	var code = fireFoxRemap[e.keyCode] || e.keyCode
	bus.postMessage({
		fn:'onKeyUp',
		repeat: e.repeat,
		code:code,
		shift: e.shiftKey?true:false,
		alt: e.altKey?true:false,
		ctrl: e.ctrlKey?true:false,
		meta: e.metaKey?true:false
	})
}

function keyPress(e){
	bus.postMessage({
		fn:'onKeyPress',
		char:e.charCode,
		repeat: e.repeat,
		shift: e.shiftKey?true:false,
		alt: e.altKey?true:false,
		ctrl: e.ctrlKey?true:false,
		meta: e.metaKey?true:false
	})
}

window.addEventListener('keydown',keyDown)
window.addEventListener('keyup',keyUp)
window.addEventListener('keypress',keyPress)
