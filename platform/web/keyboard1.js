var magicClip = '\n\u00A0\u00A0\u00B7\n'
var androidBackspace = '\n\u00A0\u00B7\n'

// firefox has a different keymap, remap keys.
var fireFoxKeyRemap = {
	91:93,
	92:93,
	224:93, // right meta
	61:187, // equals
	173:189, // minus
	59:186 // semicolon
}
module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'keyboard1'

		if(this.parent){
			this.parentKeyboard = this.parent.services[this.name]
			return
			//return this.parentKeyboard.addChild(this)
		}

		this.children = []

		// IOS uses a default selection and the rest does not
		this.defaultStart = this.root.isIOSDevice?2:3
		this.defaultEnd = 3
		this.lastClipboard = ''
		this.lastEnd = 0
		this.lastStart = 0
		this.useSystemEditMenu = false
		this.characterAccentMenuPos = undefined
		this.arrowCursorPollInterval = undefined
		this.hasTextInputFocus = false
		this.ignoreFirstIosClipboard = false
		this.ignoreCursorPoll = false

		// store state flags so we can manage the textarea
		this.keyboardCut
		this.keyboardSelectAll
		this.keyDownTriggered

		// bind the poll timers
		this.arrowCursorPoll = this.arrowCursorPoll.bind(this)
		this.idlePoll = this.idlePoll.bind(this)

		this.keyboardAnimPlaying = false
		this.lastIdlePoll = Date.now()

		//setInterval(this.idlePoll, 500)

		this.defaultHeight = window.innerHeight

		window.addEventListener('orientationchange', this.orientationChange.bind(this))

		if(this.root.isIOSDevice){
			document.addEventListener('focusout', this.onFocusOut.bind(this))
		}

		//
		// Initialization of text area
		//
		//

		var ta = this.textArea = document.createElement('textarea')
		ta.className = "makepad"
		ta.style.position = 'relative'
		ta.style.top = 0//-15
		ta.style.height = 15
		ta.style.width = 50
		ta.setAttribute('autocomplete','off')
		ta.setAttribute('autocorrect','off')
		ta.setAttribute('autocapitalize','off')
		ta.setAttribute('spellcheck','false')

		ta.style.zIndex = 100000
		//::selection { background:transparent; color:transparent; }\n\

		var style = document.createElement('style')
		style.innerHTML = "\n\
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

		//if(!this.root.isTouchDevice){
			ta.style.position = 'absolute'
			ta.style.left = -100
			ta.style.top = -100
			ta.style.opacity = 0.
		//}
		//else{
		//	ta.style.position = 'relative'
		//ta.style.top = 0
		///}

		if(this.root.isIOSDevice){
			ta.style.textAlign = 'center'
			ta.style.opacity = 0.5
			ta.style.fontSize = 1
		}
		if(!this.root.isIOSDevice && this.root.isTouchDevice){
			ta.style.opacity = 0.5
		}

		ta.value = magicClip
		ta.selectionStart = this.defaultStart
		ta.selectionEnd = this.defaultEnd

		ta.addEventListener('cut', this.onCut.bind(this))
		ta.addEventListener('paste', this.onPaste.bind(this))
		ta.addEventListener('select', this.onSelect.bind(this))
		ta.addEventListener('input', this.onInput.bind(this))
		ta.addEventListener('touchmove', this.onTouchMove.bind(this))
		ta.addEventListener('blur', this.onBlur.bind(this))
		ta.addEventListener('keydown', this.onKeyDown.bind(this))
		ta.addEventListener('keyup', this.onKeyUp.bind(this))

		document.body.appendChild(ta)

		window.addEventListener("focus", function(){
			this.postKeyEvent({fn:'onAppFocus'})	
			if(!this.root.isIOSDevice)ta.focus()
		}.bind(this))

		window.addEventListener("blur", function(){
			this.postKeyEvent({fn:'onAppBlur'})
		}.bind(this))
	}
	//
	//
	// Polling
	//
	//

	idlePoll(){
		var now = Date.now()	
		if(now - this.lastIdlePoll > 800 ){
			this.postKeyEvent({
				fn:'onIdleResume'
			})
			// fix ios bug
			if(this.hasTextInputFocus || this.root.isIOSDevice) this.worker.services.painter1.onScreenResize()
			if(this.hasTextInputFocus){
				this.hasTextInputFocus = false
				this.postKeyEvent({
					fn:'onKeyboardClose'
				})
			}
		}
		this.lastIdlePoll = now
	}

	// poll for arrow keys on iOS. Yes this is horrible, but the only way
	// we watch how the selection changes in a time loop poll
	arrowCursorPoll(){
		if(!this.keyboardAnimPlaying && document.body.scrollTop)document.body.scrollTop = 0
		if(this.ignoreCursorPoll) return
		if((this.lastEnd !== this.textArea.selectionEnd || this.lastStart !== this.textArea.selectionStart)){

			if(this.textArea.value !== magicClip){
				// reselect
				this.lastStart = this.textArea.selectionStart = 3 
				this.lastEnd = this.textArea.selectionEnd = this.textArea.value.length - magicClip.length + 3
				return
			} 

			var key = 0
			var dir = this.textArea.selectionStart
			if(dir == 0) key = 38 // up
			if(dir == 5) key = 40 // down
			if(dir == 2) key = 37 // left
			if(dir == 3) key = 39 // right
			// reset selection
			this.lastStart = this.textArea.selectionStart = this.defaultStart
			this.lastEnd = this.textArea.selectionEnd = this.defaultEnd

			if(key == 0) return

			this.postKeyEvent({
				pileupTime:Date.now(),
				fn:'onKeyDown',
				repeat: 1,
				code: key
			})
			this.postKeyEvent({
				pileupTime:Date.now(),
				fn:'onKeyUp',
				repeat: 1,
				code: key
			})
		}
	}
	
	//
	//
	// Parent child
	//
	//

	//addChild(child){
	//	if(this.parentKeyboard){
	//		return this.parentKeyboard.addChild(this)
	//	}
	//	this.children[child.worker.workerId] = child
	//}

	// we shouldnt post faster than the framerate
	postKeyEvent(msg, stop){
		// lets find the deepest focussedWorker
		var worker = this.worker
		var next = worker
		while(next){
			worker = next
			next = worker.services.keyboard1.focussedWorker
		}
		// walk back up the chain posting localIds
		var lastLocalId = 0
		while(worker && worker !== stop){
			worker.postMessage({
				$:'keyboard1', 
				msg:{
					localId:lastLocalId,
					body:msg
				}
			})
			lastLocalId = worker.localId
			worker = worker.parent
		}
	}
	

	//
	//
	// User api
	//
	//

	user_setClipboardText(msg){
		
		if(this.parentKeyboard) return this.parentKeyboard.user_setClipboardText(msg)

		this.lastClipboard = this.textArea.value = magicClip.slice(0,3)+ msg.text + magicClip.slice(3)

		// lets wait for a mouse up to set selection
		if(this.hasTextInputFocus || !this.root.isTouchDevice){

			this.lastStart = this.textArea.selectionStart = msg.text.length?3:this.ignoreFirstIosClipboard?3:this.defaultStart
			this.lastEnd = this.textArea.selectionEnd = msg.text.length + 3
			this.ignoreFirstIosClipboard = false
		}

	}

	user_useSystemEditMenu(msg){
		if(this.parentKeyboard)return this.parentKeyboard.user_useSystemEditMenu(msg)

		this.useSystemEditMenu = msg.capture
		if(this.useSystemEditMenu && this.root.isIOSDevice && !this.arrowCursorPollInterval){
			this.arrowCursorPollInterval = setInterval(this.arrowCursorPoll, 30)
		}
		else if(this.arrowCursorPollInterval){
			clearInterval(this.arrowCursorPollInterval)
			this.arrowCursorPollInterval = undefined
		}
	}

	user_setCharacterAccentMenuPos(msg){
		if(this.parentKeyboard)return this.parentKeyboard.user_setCharacterAccentMenuPos(msg)

		this.characterAccentMenuPos = msg
	}

	setWorkerFocus(worker){
		// focus this one
		var old = this.focussedWorker
		if(old && old !== worker){
			old.services.keyboard1.postKeyEvent({fn:'onAppBlur'}, this.worker)
		}
		this.focussedWorker = worker
		if(worker) worker.services.keyboard1.postKeyEvent({fn:'onAppFocus'})
	}

	user_setTextInputFocus(msg){
		if(this.parentKeyboard)return this.parentKeyboard.user_setTextInputFocus(msg)

		this.hasTextInputFocus = msg.focus

		if(msg.focus){
			this.showTextArea()
		}
		else{
			this.hideTextArea()
		}
	}

	//
	//
	//  Text area manipulation
	//
	//

	showTextArea(){
		//if(this.root.isTouchDevice){
		//	this.textArea.style.top = -15
		//}
		this.textArea.focus()
		this.hasTextInputFocus = true
	}

	hideTextArea(){
		//if(this.root.isTouchDevice){
		//	this.textArea.style.top = 0
		//}
		this.textArea.blur()
		this.hasTextInputFocus = false
	}

	moveTextArea(x, y){
		this.textArea.style.left = x
		this.textArea.style.top = y
	}

	textAreaMouseMode(){
		this.textArea.style.position = 'absolute'
		this.textArea.style.left = -100
	}

	textAreaTouchMode(){
		//this.textArea.style.position = 'relative'
		//this.textArea.style.top = 0
	}

	finalizeSelection(){

		var len = this.textArea.value.length
		if(len > 5) this.textArea.selectionStart = 3
		else this.textArea.selectionStart = this.defaultStart
		this.textArea.selectionEnd = len - 2
	}


	//
	//
	// Text area listeners
	//
	//


	orientationChange(e){

		this.defaultHeight = window.innerHeight
		this.hideTextArea()
		if(this.hasTextInputFocus){
			this.postKeyEvent({
				fn:'onKeyboardClose'
			})
			this.hasTextInputFocus = false
		}
		if(this.root.isIOSDevice){
			document.body.scrollLeft = 0
			document.body.scrollTop = 0
			this.worker.services.painter1.onScreenResize()
		}
		this.postKeyEvent({
			fn:'onOrientationChange'
		})
	}

	onFocusOut(e) {
		this.hideTextArea()
		this.worker.services.painter1.onScreenResize()
		this.postKeyEvent({
			fn:'onKeyboardClose'
		})
	}

	onWindowResize(){
		if(this.root.isTouchDevice){
			if(window.innerHeight < this.defaultHeight){
				this.postKeyEvent({
					fn:'onKeyboardOpen'
				})
			}
			else{
				this.hideTextArea()
				this.postKeyEvent({
					fn:'onKeyboardClose'
				})
			}
		}
	}

	onKeyDown(e){

		this.keyDownTriggered = true
		var code = fireFoxKeyRemap[e.keyCode] || e.keyCode

		// we only wanna block backspace 
		if(code === 8 || code === 9) e.preventDefault() // backspace/tab
		if(code === 88 && (e.metaKey || e.ctrlKey)) this.keyboardCut = true // x cut
		if(code === 65 && (e.metaKey || e.ctrlKey)) this.keyboardSelectAll = true	 // all (select all)	
		if(code === 90 && (e.metaKey || e.ctrlKey)) e.preventDefault() // all (select all)	
		if(code === 89 && (e.metaKey || e.ctrlKey)) e.preventDefault() // all (select all)	
		if(code === 83 && (e.metaKey || e.ctrlKey)) e.preventDefault() // ctrl s

		// move the text area for the character accent menu
		if(!this.root.isTouchDevice && this.characterAccentMenuPos){
			var x = Math.max(0,Math.min(document.body.offsetWidth -  this.textArea.offsetWidth, this.characterAccentMenuPos.x + 6))
			var y = Math.max(0,Math.min(document.body.offsetHeight -  this.textArea.offsetHeight, this.characterAccentMenuPos.y + 4))
			this.moveTextArea(x,y)
		}
		//cliptext.focus()

		this.postKeyEvent({
			fn:'onKeyDown',
			pileupTime:Date.now(),
			repeat: e.repeat?true:false,
			code:code,
			shift: e.shiftKey?true:false,
			alt: e.altKey?true:false,
			ctrl: e.ctrlKey?true:false,
			meta: e.metaKey?true:false
		})
	}


	onKeyUp(e){
		var code = fireFoxKeyRemap[e.keyCode] || e.keyCode
		
		// Put the text area back (the character accent menu)
		if(!this.root.isTouchDevice && this.characterAccentMenuPos){
			this.moveTextArea(-100,-100)
		}
		// do the selection
		this.finalizeSelection()

		this.postKeyEvent({
			fn:'onKeyUp',
			pileupTime:Date.now(),
			repeat: e.repeat?true:false,
			code:code,
			shift: e.shiftKey?true:false,
			alt: e.altKey?true:false,
			ctrl: e.ctrlKey?true:false,
			meta: e.metaKey?true:false
		})
	}

	onCut(e){
		this.lastClipboard = ''
		if(this.keyboardCut) return this.keyboardCut = false
		//if(cliptext.value.length<5)return
		this.postKeyEvent({
			fn:'onKeyDown',
			pileupTime:Date.now(),
			meta: true,
			repeat: false,
			code: 88
		})
		this.postKeyEvent({
			fn:'onKeyUp',
			pileupTime:Date.now(),
			meta: true,
			repeat: false,
			code: 88
		})
	}

	onPaste(e){
		this.postKeyEvent({
			fn:'onKeyPaste',
			pileupTime:Date.now(),
			text: e.clipboardData.getData('text/plain')
		})
		e.preventDefault()
	}

	onSelect(e){
		//console.log('selectall?', keyboardSelectAll, mouseIsDown)
		if(this.keyboardSelectAll) return this.keyboardSelectAll = false
		if(this.textArea.selectionStart === 0 && this.textArea.selectionEnd === this.textArea.value.length){
			this.postKeyEvent({
				fn:'onKeyDown',
				pileupTime:Date.now(),
				meta: true,
				repeat: false,
				code: 65
			})
			this.postKeyEvent({
				fn:'onKeyUp',
				pileupTime:Date.now(),
				meta: true,
				repeat: false,
				code: 65
			})
		}
	}

	onInput(){
		
		window.stamp = performance.now()

		var value = this.textArea.value
		// we seem to have pressed backspace on android	
		if(value.length === 4 && value === androidBackspace){
			this.textArea.value = magicClip
			this.textArea.selectionStart = this.defaultStart
			this.textArea.selectionEnd = this.defaultEnd
			if(this.keyDownTriggered){
				this.keyDownTriggered = false
				this.postKeyEvent({
					fn:'onKeyDown',
					pileupTime:Date.now(),
					repeat: false,
					code: 8
				})
				this.postKeyEvent({
					fn:'onKeyUp',
					pileupTime:Date.now(),
					repeat: false,
					code: 8
				})
			}
			return
		}
		// Something changed from our clipboard-set to now
		if(value !== this.lastClipboard){
			this.lastClipboard = ''
			this.textArea.value = magicClip
			this.lastStart = this.textArea.selectionStart = this.defaultStart
			this.lastEnd = this.textArea.selectionEnd = this.defaultEnd
			// special character accent popup 
			if(this.defaultStart === 3 && value.charCodeAt(2) !== magicClip.charCodeAt(1)){
				this.postKeyEvent({
					fn:'onKeyPress',
					pileupTime:Date.now(),
					char:value.charCodeAt(2),
					special:1,
					repeat: false
				})
			}
			// the main keypress entry including multiple characters
			// like swipe android keyboards 
			else for(let i = 0, len = value.length - 2 - this.defaultStart; i < len; i++){
				var charcode = value.charCodeAt(i + this.defaultStart)
				
				var msg = {
					fn:'onKeyPress',
					pileupTime:Date.now(),
					char:charcode,
					repeat: false
				}
				// if we are more than one character let the otherside know
				// about this (for instance for undo handling)
				if(len>1){
					msg.groupIndex = i
					msg.groupLen = len
				}
				// ignore newlines and magicClip values
				if(charcode !== 10 && charcode !== magicClip.charCodeAt(1)){
					this.postKeyEvent(msg)
				}
			}
		}
	}

	onTouchMove(e){
		e.preventDefault()
		return false
	}


	onBlur(){
		this.hideTextArea()
	}

	//
	//
	// Interaction with fingers service
	//
	//

	onMouseDown(e){
		if(this.root.isTouchDevice){
			this.textAreaMouseMode()
			this.finalizeSelection()
			//console.log(cliptext.style.left)
		}
		if(e.button !==2){ // defocus the text input for a sec to hide character popup menu
			this.textArea.blur()
			this.textArea.focus()
		}
		if(e.button !==2 || !this.useSystemEditMenu) return
		this.moveTextArea(e.pageX - 10, e.pageY - 10)

		setTimeout(function(){
			if(this.root.isTouchDevice){
				this.textAreaTouchMode()
			}
			else{
				this.moveTextArea(-20,-20)
			}
		}.bind(this), 0)
		return true
	}

	onMouseUp(e){
		if(e.button !==2 || !this.useSystemEditMenu) return
		this.textArea.focus()
		return true
	}

	onMouseWheel(e){
		this.textArea.blur()
		this.textArea.focus()
	}

	onTouchStart(x, y){
		this.ignoreCursorPoll = true
		return true
	}

	onTouchEnd(x, y, tapCount){
		//document.body.requestFullscreen();
		return
		if(this.root.isTouchDevice && tapCount === 1){
			this.textAreaTouchMode()
			this.showTextArea()
			//this.textArea.style.position = 'relative'
			//this.textArea.style.left = 0
			//this.textArea.style.top = -15
		}

		this.ignoreCursorPoll = false
		if(this.root.isIOSDevice && tapCount === 1 && !this.hasTextInputFocus){
			this.ignoreFirstIosClipboard = true
			this.keyboardAnimPlaying = true
			this.textArea.focus()
			var itvpoll = setInterval(function(){
				var st = document.body.scrollTop
				if(st!==0){
					this.keyboardAnimPlaying = false
					clearInterval(itvpoll)
					// lets clear the canvas
					this.services.painter1.onScreenResize(st - 15)
					this.hasTextInputFocus = true
					this.postKeyEvent({
						fn:'onKeyboardOpen'
					})

					document.body.scrollTop = 0
					document.body.scrollLeft = 0
				}
			}.bind(this),16)
		}
		// lets make the selection now
		if(this.hasTextInputFocus) this.finalizeSelection()
	}
}
