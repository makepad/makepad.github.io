var bus = service.bus
var canvas = service.canvas
var services = service.others

//
//
// Device specialisation variables
//
//

// Type detection
var isIOSDevice = navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)
var isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints)

// IOS uses a default selection and the rest does not
var defaultStart = isIOSDevice?2:3
var defaultEnd = 3
// the magic data that goes into the textarea
var magicClip = '\n\u00A0\u00A0\u00A1\n'
var androidBackspace = '\n\u00A0\u00A1\n'
//
//
// Service API
//
//

bus.onMessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}

// service state
var lastClipboard = ''
var lastEnd = 0, lastStart = 0
var useSystemEditMenu = false
var characterAccentMenuPos
var arrowCursorPollInterval
var hasKeyboardFocus

var userMessage = {
	setClipboardText:function(msg){
		lastClipboard = cliptext.value = magicClip.slice(0,3)+ msg.text + magicClip.slice(3)

		// lets wait for a mouse up to set selection
		if(hasKeyboardFocus || !isTouchDevice){

			lastStart = cliptext.selectionStart = msg.text.length?3:defaultStart
			lastEnd = cliptext.selectionEnd = msg.text.length + 3
		}
		//cliptext.focus()
	},
	useSystemEditMenu:function(msg){
		useSystemEditMenu = msg.capture
		if(useSystemEditMenu && isIOSDevice && !arrowCursorPollInterval){
			arrowCursorPollInterval = setInterval(arrowCursorPoll, 30)
		}
		else if(arrowCursorPollInterval){
			clearInterval(arrowCursorPollInterval)
			arrowCursorPollInterval = undefined
		}
	},
	setCharacterAccentMenuPos:function(msg){
		characterAccentMenuPos = msg
	},
	setKeyboardFocus:function(msg){
		hasKeyboardFocus = msg.focus
		if(msg.focus) cliptext.focus()
		else cliptext.blur()
	}

}

// finalize the selection (selection is lazy sometimes)
function finalizeSelection(){

	var len = cliptext.value.length
	if(len > 5) cliptext.selectionStart = 3
	else cliptext.selectionStart = defaultStart
	cliptext.selectionEnd = len - 2
}

// poll for arrow keys on iOS. Yes this is horrible, but the only way
// we watch how the selection changes in a time loop poll
function arrowCursorPoll(){
	if(ignoreCursorPoll) return
	if((lastEnd !== cliptext.selectionEnd || lastStart !== cliptext.selectionStart)){
		var dir = cliptext.selectionStart

		//return
		var key = 0
		if(dir == 0) key = 38
		if(dir >= cliptext.value.length - 2) key = 40
		if(dir == 3 && cliptext.value.length > 5) dir = 2
		if(dir == 2) key = 37
		if(dir == 3) key = 39

		cliptext.value = magicClip
		lastStart = cliptext.selectionStart = defaultStart
		lastEnd = cliptext.selectionEnd = defaultEnd

		if(key == 0) return

		bus.postMessage({
			fn:'onKeyDown',
			repeat: 1,
			code: key
		})
		bus.postMessage({
			fn:'onKeyUp',
			repeat: 1,
			code: key
		})

	}
}


//
//
// Initialization of text area
//
//

var cliptext = document.createElement('textarea')
cliptext.className = "makepad"
cliptext.style.left = -100
cliptext.style.top = -100//window.innerWidth - 60
cliptext.style.width = 80
cliptext.style.height = 40
cliptext.style.position = 'absolute'
cliptext.setAttribute('autocomplete','off')
cliptext.setAttribute('autocorrect','off')
cliptext.setAttribute('autocapitalize','off')
cliptext.setAttribute('spellcheck','false')

cliptext.style.zIndex = 100000

var style = document.createElement('style')
style.innerHTML = "\n\
::selection { background:transparent; color:transparent; }\n\
textarea.makepad{\n\
	opacity: 0;\n\
	border-radius:4px;\n\
	color: white;\n\
	font-size:6;\n\
	background: gray;\n\
	-moz-appearance: none;\n\
	appearance: none;\n\
	border: none;\n\
	resize: none;\n\
	outline: none;\n\
	overflow: hidden;\n\
	text-indent:0px;\n\
	padding: 0 0px;\n\
	margin: 0 -1px;\n\
	text-indent: 0px;\n\
	-ms-user-select: text;\n\
	-moz-user-select: text;\n\
	-webkit-user-select: text;\n\
	user-select: text;\n\
	white-space: pre!important;\n\
	\n\
}\n\
textarea:focus.makepad{\n\
	outline:0px !important;\n\
	-webkit-appearance:none;\n\
}"
document.body.appendChild(style)

// text area wrapper to add a bit of UI around it for touch devices
var cliptextWrapper
if(isTouchDevice){
	cliptextWrapper = document.createElement('span')
	cliptextWrapper.innerHTML = "Clipboard"
	cliptextWrapper.style.display = 'flex'
	cliptextWrapper.style.justifyContent = 'center'
	cliptextWrapper.style.alignItems = 'flex-end'
	cliptextWrapper.style.position = 'absolute'
	cliptextWrapper.style.fontSize = 8
	cliptextWrapper.style.color = 'white'
	cliptextWrapper.style.textAlign = 'center'
	cliptextWrapper.style.verticalAlign = 'bottom'
	cliptextWrapper.style.borderRadius = '8px'
	cliptextWrapper.style.padding = '4px'
	cliptextWrapper.style.left = -100
	cliptextWrapper.style.top = -100
	cliptextWrapper.style.width = 40
	cliptextWrapper.style.height = 30
	cliptextWrapper.style.userSelect = 'none'
	cliptextWrapper.style.webkitUserSelect = "none"
	cliptextWrapper.style.MozUserSelect = "none"
	cliptextWrapper.style.backgroundColor = "rgba(128,128,128,0.3)"
	document.body.appendChild(cliptextWrapper)
}

if(!isTouchDevice){
	cliptext.style.opacity = 0.
}
if(isIOSDevice){
	cliptext.style.fontSize = 1
}
if(!isIOSDevice && isTouchDevice){
	cliptext.style.fontSize = 12
}

//cliptext.focus()
cliptext.value = magicClip
cliptext.selectionStart = defaultStart
cliptext.selectionEnd = defaultEnd

document.body.appendChild(cliptext)

//
//
// Orientation and keyboard open
//
//

//canvas.addEventListener('focus', function(){
	//cliptext.focus()
//})

var defaultHeight = window.innerHeight
// ok we have to differentiate rotation and keyboard opening.
window.addEventListener('orientationchange', function(e){

	defaultHeight = window.innerHeight
	cliptext.blur()
	if(hasKeyboardFocus){
		bus.postMessage({
			fn:'onKeyboardClose'
		})
		hasKeyboardFocus = false
	}
	if(isIOSDevice){
		document.body.scrollLeft = 0
		document.body.scrollTop = 0
		services.painter.resizeCanvas()
	}
	bus.postMessage({
		fn:'onOrientationChange'
	})
})

if(isTouchDevice)window.addEventListener('resize', function(e){
	if(window.innerHeight < defaultHeight){
		defaultClipTextPos()
		hasKeyboardFocus = true
		bus.postMessage({
			fn:'onKeyboardOpen'
		})
	}
	else{
		hideClipTextPos()
		cliptext.blur()
		hasKeyboardFocus = false
		bus.postMessage({
			fn:'onKeyboardClose'
		})
	}
})

if(isIOSDevice){
	document.addEventListener('focusout', function(e) {
		hideClipTextPos()
		cliptext.blur()
		hasKeyboardFocus = false
		services.painter.resizeCanvas()
		bus.postMessage({
			fn:'onKeyboardClose'
		})
	})
}
//
//
// Text area position
//
//

// moving the cliptext area
function defaultClipTextPos(){
	if(cliptextWrapper){
		cliptextWrapper.style.left = window.innerWidth-60
		cliptextWrapper.style.top = 10
	}
	cliptext.style.left = window.innerWidth-55
	cliptext.style.top = 15
}

function hideClipTextPos(){
	if(cliptextWrapper){
		cliptextWrapper.style.left = -100
		cliptextWrapper.style.top = -100
	}
	cliptext.style.left = -100
	cliptext.style.top = -100
}

//
//
// Text area listeners
//
//

cliptext.addEventListener('cut', onCut)
cliptext.addEventListener('paste', onPaste)
cliptext.addEventListener('select', onSelect)
cliptext.addEventListener('input', onInput)
cliptext.addEventListener('touchmove', onTouchMove)
cliptext.addEventListener('blur', onBlur)
cliptext.addEventListener('keydown', onKeyDown)
cliptext.addEventListener('keyup', onKeyUp)

// store state flags so we can manage the textarea
var keyboardCut
var keyboardSelectAll
var keyDownTriggered

// firefox has a different keymap, remap keys.
var fireFoxKeyRemap = {
	91:93,
	92:93,
	224:93, // right meta
	61:187, // equals
	173:189, // minus
	59:186 // semicolon
}

function onKeyDown(e){
	keyDownTriggered = true
	var code = fireFoxKeyRemap[e.keyCode] || e.keyCode

	// we only wanna block backspace 
	if(code === 8 || code === 9) e.preventDefault() // backspace/tab
	if(code === 88 && (e.metaKey || e.ctrlKey))keyboardCut = true // x cut
	if(code === 65 && (e.metaKey || e.ctrlKey))keyboardSelectAll = true	 // all (select all)	
	if(code === 90 && (e.metaKey || e.ctrlKey)) e.preventDefault() // all (select all)	
	if(code === 89 && (e.metaKey || e.ctrlKey)) e.preventDefault() // all (select all)	

	// move the text area for the character accent menu
	if(!isTouchDevice && characterAccentMenuPos){
		cliptext.style.left = characterAccentMenuPos.x + 10
		cliptext.style.top = characterAccentMenuPos.y + 12
	}
	//cliptext.focus()
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

function onKeyUp(e){
	var code = fireFoxKeyRemap[e.keyCode] || e.keyCode
	
	// Put the text area back (the character accent menu)
	if(!isTouchDevice && characterAccentMenuPos){
		cliptext.style.left =  -100
		cliptext.style.top =  -100
	}
	// do the selection
	finalizeSelection()

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

function onCut(e){
	lastClipboard = ''
	if(keyboardCut) return keyboardCut = false
	//if(cliptext.value.length<5)return
	bus.postMessage({
		fn:'onKeyDown',
		meta: true,
		repeat: 1,
		code: 88
	})
	bus.postMessage({
		fn:'onKeyUp',
		meta: true,
		repeat: 1,
		code: 88
	})
}

function onPaste(e){
	bus.postMessage({
		fn:'onKeyPaste',
		text: e.clipboardData.getData('text/plain')
	})
	e.preventDefault()
}

function onSelect(e){
	//console.log('selectall?', keyboardSelectAll, mouseIsDown)
	if(keyboardSelectAll) return keyboardSelectAll = false
	if(cliptext.selectionStart === 0 && cliptext.selectionEnd === cliptext.value.length){
		bus.postMessage({
			fn:'onKeyDown',
			meta: true,
			repeat: 1,
			code: 65
		})
		bus.postMessage({
			fn:'onKeyUp',
			meta: true,
			repeat: 1,
			code: 65
		})

	}
}

// the magic 'watch input event' function on the textares
function onInput(){
	var value = cliptext.value
	// we seem to have pressed backspace on android	
	if(value.length === 4 && value === androidBackspace){// || lastClipboard && value === magicClip){
		cliptext.value = magicClip
		cliptext.selectionStart = defaultStart
		cliptext.selectionEnd = defaultEnd
		if(keyDownTriggered){
			keyDownTriggered = false
			bus.postMessage({
				fn:'onKeyDown',
				repeat: 1,
				code: 8
			})
			bus.postMessage({
				fn:'onKeyUp',
				repeat: 1,
				code: 8
			})
		}
		return
	}
	// Something changed from our clipboard-set to now
	if(value !== lastClipboard){
		lastClipboard = ''
		cliptext.value = magicClip
		cliptext.selectionStart = defaultStart
		cliptext.selectionEnd = defaultEnd
		// special character accent popup 
		if(defaultStart === 3 && value.charCodeAt(2) !== magicClip.charCodeAt(1)){
			bus.postMessage({
				fn:'onKeyPress',
				char:value.charCodeAt(2),
				special:1,
				repeat: 1
			})
		}
		// the main keypress entry including multiple characters
		// like swipe android keyboards 
		else for(var i = 0, len = value.length - 2 - defaultStart; i < len; i++){
			var charcode = value.charCodeAt(i + defaultStart)
			var msg = {
				fn:'onKeyPress',
				char:charcode,
				repeat: 1
			}
			// if we are more than one character let the otherside know
			// about this (for instance for undo handling)
			if(len>1){
				msg.groupIndex = i
				msg.groupLen = len
			}
			// ignore newlines and magicClip values
			if(charcode !== 10 && charcode !== magicClip.charCodeAt(1)) bus.postMessage(msg)
		}
	}
}

function onTouchMove(e){
	e.preventDefault()
	return false
}

function onBlur(){
	if(isTouchDevice){
		hideClipTextPos()
	}
}

//
//
// Interaction with fingers service
//
//

exports.onMouseDown = function(e){
	if(e.button !==2){ // defocus the text input for a sec to hide character popup menu
		cliptext.blur()
		cliptext.focus()
	}
	if(e.button !==2 || !useSystemEditMenu) return
	cliptext.style.left = e.pageX - 10
	cliptext.style.top = e.pageY  - 10
	setTimeout(function(){
		cliptext.style.left =  -20
		cliptext.style.top =  -20
	}, 0)
	return true
}

exports.onMouseUp = function(e){
	if(e.button !==2 || !useSystemEditMenu) return
	cliptext.focus()
	return true
}

exports.onMouseWheel = function(e){
	cliptext.blur()
	cliptext.focus()
}

var ignoreCursorPoll = false

exports.onTouchStart = function(x, y){
	ignoreCursorPoll = true
	return true
}

exports.onTouchEnd = function(x, y, tapCount){
	ignoreCursorPoll = false
	if(isIOSDevice && tapCount === 1){
		document.body.scrollTop = document.body.offsetHeight
		cliptext.style.left = x - 10
		cliptext.style.top = document.body.offsetHeight - 40// make sure we scroll
		cliptext.focus()
		var itvpoll = setInterval(function(){
			var st = document.body.scrollTop
			if(st!==document.body.offsetHeight){
				clearInterval(itvpoll)
				// lets clear the canvas
				services.painter.resizeCanvas(st)
				if(!hasKeyboardFocus){
					hasKeyboardFocus = true
				}
				bus.postMessage({
					fn:'onKeyboardOpen'
				})

				document.body.scrollTop = 0
				document.body.scrollLeft = 0
			}
		},16)
		defaultClipTextPos()
	}
	// lets make the selection now
	if(hasKeyboardFocus) finalizeSelection()
}
