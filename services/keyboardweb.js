var bus = service.bus
var canvas = service.canvas
var services = service.others

//
//
// Device specialisation variables
//
//

// Type detection
var isIPad = navigator.userAgent.match(/iPad/)
var isIOSDevice = navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)
var isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints)


// IOS uses a default selection and the rest does not
var defaultStart = isIOSDevice?2:3
var defaultEnd = 3
// the magic data that goes into the textarea
var magicClip = '\n\u00A0\u00A0\u00B7\n'
var androidBackspace = '\n\u00A0\u00B7\n'
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
var ignoreFirstIosClipboard
var userMessage = {
	setClipboardText:function(msg){
		lastClipboard = cliptext.value = magicClip.slice(0,3)+ msg.text + magicClip.slice(3)

		// lets wait for a mouse up to set selection
		if(hasKeyboardFocus || !isTouchDevice){

			lastStart = cliptext.selectionStart = msg.text.length?3:ignoreFirstIosClipboard?3:defaultStart
			lastEnd = cliptext.selectionEnd = msg.text.length + 3
			ignoreFirstIosClipboard = false
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
		if(msg.focus){
			if(isTouchDevice){
				cliptext.style.top = -15
			}
			cliptext.focus()
		}
		else{
			if(isTouchDevice){
				cliptext.style.top = 0
			}
			cliptext.blur()
		}
	}

}

// finalize the selection (selection is lazy sometimes)
function finalizeSelection(){

	var len = cliptext.value.length
	if(len > 5) cliptext.selectionStart = 3
	else cliptext.selectionStart = defaultStart
	cliptext.selectionEnd = len - 2
}

var lastIdlePoll = Date.now()
setInterval(function(){
	var now = Date.now()	
	if(now - lastIdlePoll > 500 ){
		bus.postMessage({
			fn:'onIdleResume'
		})
		if(hasKeyboardFocus){
			hideClipTextPos()
			hasKeyboardFocus = false
			services.painter.resizeCanvas()
			bus.postMessage({
				fn:'onKeyboardClose'
			})
		}
	}
	lastIdlePoll = now
}, 125)

// poll for arrow keys on iOS. Yes this is horrible, but the only way
// we watch how the selection changes in a time loop poll
function arrowCursorPoll(){
	if(!keyboardAnimPlaying && document.body.scrollTop)document.body.scrollTop = 0
	if(ignoreCursorPoll) return
	if((lastEnd !== cliptext.selectionEnd || lastStart !== cliptext.selectionStart)){

		if(cliptext.value !== magicClip){
			// reselect
			lastStart = cliptext.selectionStart = 3 
			lastEnd = cliptext.selectionEnd = cliptext.value.length - magicClip.length + 3
			return
		} 

		var key = 0
		var dir = cliptext.selectionStart
		if(dir == 0) key = 38 // up
		if(dir == 5) key = 40 // down
		if(dir == 2) key = 37 // left
		if(dir == 4) key = 39 // right
		// reset selection
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
cliptext.style.position = 'relative'
cliptext.style.top = 0//-15
cliptext.style.height = 15
cliptext.style.width = 50
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
	text-align: center ;\n\
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

if(!isTouchDevice){
	cliptext.style.position = 'absolute'
	cliptext.style.left = -100
	cliptext.style.top = -100
	cliptext.style.opacity = 0.
}
else{
	cliptext.style.top = 0
}

if(isIOSDevice){
	cliptext.style.opacity = 0.5
	cliptext.style.fontSize = 1
}
if(!isIOSDevice && isTouchDevice){
	cliptext.style.opacity = 0.5
	cliptext.style.fontSize = 12
}

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

exports.onWindowResize = function(){
	if(isTouchDevice){
		if(window.innerHeight < defaultHeight){
			hasKeyboardFocus = true
			bus.postMessage({
				fn:'onKeyboardOpen'
			})
		}
		else{
			cliptext.blur()
			hasKeyboardFocus = false
			if(isTouchDevice){
				cliptext.style.top = 0
				//cliptext.style.visibility = 'hidden'
			}			
			bus.postMessage({
				fn:'onKeyboardClose'
			})
		}
	}
}

if(isIOSDevice){
	document.addEventListener('focusout', function(e) {
		cliptext.blur()
		hasKeyboardFocus = false
		cliptext.style.top = 0
		services.painter.resizeCanvas()
		bus.postMessage({
			fn:'onKeyboardClose'
		})
	})
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
		cliptext.style.left = characterAccentMenuPos.x- 14
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
	if(value.length === 4 && value === androidBackspace){
		console.log("BACKSPACE?")
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
		lastStart = cliptext.selectionStart = defaultStart
		lastEnd = cliptext.selectionEnd = defaultEnd
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
		cliptext.style.top = 0
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

var keyboardAnimPlaying = false

exports.onTouchEnd = function(x, y, tapCount){
	ignoreCursorPoll = false
	if(isIOSDevice && tapCount === 1 && !hasKeyboardFocus){
		ignoreFirstIosClipboard = true
		keyboardAnimPlaying = true
		cliptext.focus()
		var itvpoll = setInterval(function(){
			var st = document.body.scrollTop
			if(st!==0){
				keyboardAnimPlaying = false
				clearInterval(itvpoll)
				// lets clear the canvas
				services.painter.resizeCanvas(st - 15)
				hasKeyboardFocus = true
				bus.postMessage({
					fn:'onKeyboardOpen'
				})

				document.body.scrollTop = 0
				document.body.scrollLeft = 0
			}
		},16)
	}
	// lets make the selection now
	if(hasKeyboardFocus) finalizeSelection()
}
