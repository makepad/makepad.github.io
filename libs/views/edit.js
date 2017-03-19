var painter = require('services/painter')

module.exports = class Edit extends require('base/view'){

	prototype(){

		this.pageSize = 70

		this.props = {
			cursorTrim:0.,
			text:''
		}

		this.cursor = 'text'
		//
		//
		// Shaders
		//
		//
		let colors = module.style.colors
		this.tools = {
			Bg:require('shaders/bg').extend({
				borderRadius:0,
				padding:2,
				color:colors.codeBg
			}),
			Text:require('shaders/text').extend({
				font:require('fonts/ubuntu_regular_256.font'),
				fontSize:24,
				order:3,
				color:'#ccc',
				drawDiscard:'y'
			}),
			Selection:require('shaders/selection').extend({
				bgColor:colors.textSelect,
				fieldPush:0.8,
				order:1,
				gloopiness:6,
				borderRadius:3,
				borderColor:'#458',
				drawDiscard:'y',
				vertexStyle:function(){$
					if(this.w<0.001) return
					var dx = 2.
					var dy = 0.75
					this.xp -= dx
					this.xn -= dx
					this.x -= dx
					this.y -= dy
					this.w += 2.*dx
					this.wp += 2.*dx
					this.wn += 2.*dx
					this.h += 2.*dy
				}
			}),
			Cursor:require('shaders/shadowquad').extend({
				duration:0.0,
				ease:[1,100,0,0],
				tween:2,
				order:4,
				color:'#fff',
				vertexStyle:function(){$
					
					//var time = this.normalTween
					//var v = sin(time*PI)
					//this.y -= v*2.
					//this.h += v*4.
					//this.x -= v
					//this.w += v*1.
					//this.shadowOffset = vec2(-v,v)*4.
				}
			})
		}
	}
	//
	//
	// View 
	//
	//

	constructor(...args){
		super(...args)
		this.cs = new CursorSet(this)
		this.$undoStack = []
		this.$redoStack = []
		this.$undoGroup = 0
	}

	onHasFocus(){
		if(this.hasFocus){
			this.app.useSystemEditMenu(true)
		}
		else{
			this.app.useSystemEditMenu(false)
		}
		this.redraw()
	}

	//
	//
	// Drawing
	//
	//

	onDraw(){

		this.beginBg(this.viewGeom)

		this.drawSelection()

		this.drawText({
			wrapping: 'line',
			$editMode: true,
			text: this._text
		})

		if(this.hasFocus){
			var cursors = this.cs.cursors
			for(let i = 0; i < cursors.length; i++){
				var cursor = cursors[i]

				var t = this.cursorRect(cursor.end)
				var boxes = this.$boundRectsText(cursor.lo(), cursor.hi())
				if(cursor.max < 0) cursor.max = t.x
				for(let j = 0; j < boxes.length; j++){
					var box = boxes[j]
					var pbox = boxes[j-1]
					var nbox = boxes[j+1]

					this.fastSelection(
						box.x,
						box.y,
						box.w,
						box.h,
						pbox?pbox.x:-1,
						pbox?pbox.w:-1,
						nbox?nbox.x:-1,
						nbox?nbox.w:-1
					)
					// lets tell the keyboard
				}
				/*
				if(cursor.byFinger && boxes.length){
					var box = boxes[0]
					this.drawSelectHandle({
						x:box.x-15,
						y:box.y-15,
						h:30,
						w:30
					})
					var box = boxes[boxes.length-1]
					this.drawSelectHandle({
						x:box.x+box.w-15,
						y:box.y+box.h-15,
						h:30,
						w:30
					})

				}*/

				this.drawCursor({
					x:t.x-1,
					y:t.y,
					w:2,
					h:t.h
				})
			}
		}
		this.endBg()
	}

	//
	//
	// Editor cursor API
	//
	//

	cursorRect(offset, loop){
		var rd = this.$readOffsetText(offset)
		if(!rd){
			if(loop){
				return {}
			}
			if(offset < 0) return this.cursorRect(0, 1)
			var last = this.lengthText() - 1//this._text.length - 1
			if(last <0){ // first cursor, make it up from initial props
				var ls = this.Text.prototype.lineSpacing
				var fs = this.Text.prototype.fontSize
				return {
					lineSpacing: ls,
					fontSize:fs,
					advance:0,
					x:0,
					y:0 + this.cursorTrim * fs,
					h:fs * ls - 2.* this.cursorTrim * fs
				}
			}
			var cr = this.cursorRect(last, 1)

			if(this._text.charCodeAt(last) === 10){
				cr.y += cr.fontSize * cr.lineSpacing
				cr.x = 0
			}
			else{
				cr.x += (cr.advance) * cr.fontSize
			}
			cr.advance = 0
			return cr
		}

		return {
			lineSpacing: rd.lineSpacing,
			fontSize:rd.fontSize,
			advance:rd.advance,
			x:rd.x, //+ t.fontSize * t.x1,
			y:rd.y + this.cursorTrim * rd.fontSize,
			h:rd.fontSize * rd.lineSpacing - 2.* this.cursorTrim * rd.fontSize
		}
	}

	offsetFromPos(x, y){
		var t = this.$seekPosText(x, y)

		if(t === -1) t = 0
		else if(t === -2) t = this.textLength()
		return t
	}
	
	scanBackSpaceRange(start){
		return start - 1
	}

	textLength(){
		return this._text.length
	}

	charAt(offset){
		return this._text.charAt(offset)
	}

	slice(start, end){
		return this._text.slice(start, end)
	}

	charCodeAt(offset){
		return this._text.charCodeAt(offset)
	}

	insertText(offset, text){
		this._text = this._text.slice(0, offset) + text + this._text.slice(offset)
		this.redraw()
	}

	removeText(start, end){
		this._text = this._text.slice(0, start) + this._text.slice(end)
		this.redraw()
		return 0
	}

	serializeSlice(start, end, arg){
		return this._text.slice(start, end)
	}

	scanWordLeft(start){
		if(start == 0) return 0
		var i = start - 1, type = 2
		while(i>= 0 && type === 2) type = charType(this.charAt(i--))
		while(i>= 0 && type === charType(this.charAt(i))) i--
		return i + 1
	}

	scanWordRight(start){
		var i = start, type = 2, len = this.textLength()
		if(this._text.charCodeAt(start) === 10) return start
		while(i < len && type === 2) type = charType(this.charAt(i++))
		while(i < len && type === charType(this.charAt(i))) i++
		return i
	}

	scanLineLeft(start){
		for(var i = start - 1; i >= 0; i--){
			if(this.charCodeAt(i) === 10) break
		}
		return i + 1
	}

	scanLineRight(start){
		for(var i = start; i < this._text.length; i++){
			if(this.charCodeAt(i) === 10) break
		}
		return i
	}

	showLastCursor(){
		if(!this.cs) return

		// lets set the character accent menu pos
		var cursor = this.cs.cursors[this.cs.cursors.length - 1]
		var rd = this.cursorRect(cursor.end)

		// ok so lets move the thing into view
		this.scrollIntoView(rd.x-.5*rd.fontSize, rd.y, .5*rd.fontSize, rd.h)

		//console.log(rd.y - this.todo.yScroll, this.todo.yView)
		this.app.setCharacterAccentMenuPos(
			this.$xAbs + rd.x + 0.5 * rd.advance - this.todo.xScroll, 
			this.$yAbs + rd.y - this.todo.yScroll 
		)
	}

	// serialize all selections, lazily
	cursorChanged(){

		if(!this.$selChangeTimer) this.$selChangeTimer = setTimeout(function(){
			this.$selChangeTimer = undefined

			// lets fuse em
			this.cs.fuse()

			var txt = ''
			for(let i = 0; i < this.cs.cursors.length; i++){
				var cursor = this.cs.cursors[i]
				txt += this._text.slice(cursor.lo(), cursor.hi())
			}

			this.app.setClipboardText(txt)

			this.showLastCursor()

			this.redraw()
		}.bind(this))
	}

	//
	//
	// Undo stack
	//
	//

	addUndoInsert(start, end, stack, slicesrc, mark){
		if(!stack) stack = this.$undoStack
		var last = stack[stack.length - 1]
		if(last && last.type === 'insert' && last.start == end){
			var group = last.group
			last.group = this.$undoGroup
			for(let i = stack.length - 2; i >= 0; i--){
				if(stack[i].group === group) stack[i].group = this.$undoGroup
			}
		}
		stack.push({
			group: this.$undoGroup,
			type:'insert',
			mark:mark,
			start:start,
			data: this.serializeSlice(start, end, slicesrc),
			cursors: this.cs.serializeToArray()
		})
	}

	addUndoDelete(start, end, stack, mark){
		if(!stack) stack = this.$undoStack
		var last = stack[stack.length - 1]
		if(last && last.type === 'delete' && last.end === start){
			last.end += end - start
			return
		}
		stack.push({
			group: this.$undoGroup,
			type:'delete',
			mark:mark,
			start:start,
			end:end,
			cursors:this.cs.serializeToArray()
		})
	}

	forkRedo(){
		if(this.$undoStack.length){
			this.$undoStack[this.$undoStack.length -1].redo = this.$redoStack
		}
		this.$redoStack = []
	}

	undoRedo(stack1, stack2){
		if(!stack1.length) return
		var lastGroup = stack1[stack1.length - 1].group
		for(var i = stack1.length - 1; i >= 0; i--){
			var item = stack1[i]
			var lastCursors
			if(item.group !== lastGroup) break
			if(item.type === 'insert'){
				//continue
				this.addUndoDelete(item.start, item.start + item.data.length, stack2)
				this.insertText(item.start, item.data, 1)
				lastCursors = item.cursors
			}
			else{
				this.addUndoInsert(item.start, item.end, stack2)
				this.removeText(item.start, item.end, 1)
				lastCursors = item.cursors
			}
		}
		stack1.splice(i+1)
		this.cs.deserializeFromArray(lastCursors)
	}

	//
	//
	// Command keys
	//
	//

	onKeyZ(k){
		if(!k.ctrl && !k.meta) return
		this.$undoGroup++
		this.undoRedo(this.$undoStack, this.$redoStack)
	}

	onKeyY(k){
		if(!k.ctrl && !k.meta) return
		this.$undoGroup++
		this.undoRedo(this.$redoStack, this.$undoStack)
	}
	
	onKeyPageUp(k){
		this.cs.moveLine(-this.pageSize, k.shift)
	}

	onKeyPageDown(k){
		this.cs.moveLine(this.pageSize, k.shift)
	}

	onKeyHome(k){
		if(k.ctrl || k.alt) return this.cs.moveHome(k.shift)
		return this.cs.moveLineLeft(k.shift)
	}

	onKeyEnd (k){
		if(k.ctrl || k.alt) return this.cs.moveEnd(k.shift)
		return this.cs.moveLineRight(k.shift)
	}

	onKeyLeftArrow(k){
		if(k.ctrl || k.alt) return this.cs.moveWordLeft(k.shift)
		if(k.meta) return this.cs.moveLineLeft(k.shift)
		this.cs.moveDelta(-1, k.shift)
	}

	onKeyRightArrow(k){
		if(k.ctrl || k.alt) return this.cs.moveWordRight(k.shift)
		if(k.meta) return this.cs.moveLineRight(k.shift)
		this.cs.moveDelta(1, k.shift)
	}

	onKeyUpArrow(k){
		if(k.ctrl) return this.onKeyPageUp(k)
		if(k.alt) return this.cs.moveLineLeftUp(k.shift)
		if(k.meta) return this.onKeyHome(k)
		this.cs.moveLine(-1, k.shift)
	}

	onKeyDownArrow(k){
		if(k.ctrl) return this.onKeyPageDown(k)
		if(k.alt) return this.cs.moveLineRightDown(k.shift)
		if(k.meta) return this.onKeyEnd(k)
		this.cs.moveLine(1, k.shift)
	}

	onKeyBackSpace(k){
		this.$undoGroup++
		if(k.ctrl || k.alt) return this.cs.backSpaceWord()
		if(k.meta) return this.cs.backSpaceLine()
		this.cs.backSpace()
	}

	onKeyDelete(k){
		this.$undoGroup++
		if(k.ctrl || k.alt) return this.cs.deleteWord()
		if(k.meta) return this.cs.deleteLine()
		this.cs.delete()
	}

	onKeyEnter(k){
		this.$undoGroup++
		this.cs.insertText('\n')
		this.cs.moveDelta(1)
	}

	onKeyX(k){
		if(!k.ctrl && !k.meta) return true
		this.$undoGroup++
		this.cs.delete()
	}

	onKeyA(k){
		if(!k.ctrl && !k.meta) return true
		// select all
		var cur = this.cs.clearCursors()
		cur.select(0, this.textLength())
	}

	onKeySlash(k){
		if(!k.alt && !k.ctrl && !k.meta) return true
		// lets scan for // at the beg of the line
		this.cs.toggleSlashComment(k.shift)
	}

	onKeyDown(k){
		// lets trigger an event
		if(super.onKeyDown(k)){
			return true
			this.$lastKeyPress = undefined
		}
	}

	// move the cursor into view when the keyboard opens on mobile
	onKeyboardOpen(){
		this.showLastCursor()
	}

	//
	//
	// Character input
	//
	//

	onKeyPaste(k){
		this.$undoGroup ++
		this.cs.insertText(k.text)
		this.cs.moveDelta(k.text.length)
		this.cs.invalidateMax()
		return true
	}
	
	onKeyPress(k){
		// if we switch from characters fo space
		var out = String.fromCharCode(k.char === 13? 10: k.char)
		var type = charType(out)
		if(this.$lastKeyPress !== type){
			// if its not space->word transition
			if(!(this.$lastKeyPress ===2 && type === 1)){
				this.$undoGroup++
			}
			this.$lastKeyPress = type
		}
		// lets run over all our cursors
		// if repeat is -1 we have to replace last char
		if(k.special){
			this.cs.backSpace()
		}
		this.cs.insertText(out)
		this.cs.moveDelta(1)
		this.cs.invalidateMax()
		return true
	}

	//
	//
	// touch/mouse input
	//
	//
	
	onFingerDown(f){
		this.$lastKeyPress = undefined
		if(f.digit!== 1 || f.button !== 1  || this.isScrollBar(f.pickId)) return
		if(f.touch && f.tapCount < 1) return// && this.cs.cursors[0].hasSelection()) return

		this.setFocus()

		if(f.meta){
			this.fingerCursor = this.cs.addCursor()
			this.fingerCursor.end = -1
		}
		else{
			var oldstart = this.cs.cursors[0].start
			this.fingerCursor = this.cs.clearCursors()
			this.fingerCursor.start = oldstart
			this.fingerCursor.end = oldstart
		}

		var touchdy = 0//f.touch?-20:0
		let lf = this.toLocal(f)
		
		this.fingerCursor.moveTo(lf.x, lf.y + touchdy, f.shift)
		var tapDiv = f.touch? 4: 3
		var tapStart = f.touch? 2: 1
		if(f.tapCount % tapDiv === tapStart+0){ // select word under finger
			var x = this.fingerCursor.end
			this.fingerCursor.select(this.scanWordLeft(x+1), this.scanWordRight(x))
			this.fingerCursor.byFinger = true
		}
		else if(f.tapCount % tapDiv === tapStart+1){ // select line
			var x = this.fingerCursor.end
			this.fingerCursor.select(this.scanLineLeft(x+1), this.scanLineRight(x)+1)
			this.fingerCursor.byFinger = true
		}
		// 
		//this.redraw()
	}

	onFingerMove(f){
		if(f.digit!== 1 || f.button !== 1 || this.isScrollBar(f.pickId) || (!f.touch && !this.fingerCursor))return
		var touchdy = 0//f.touch?-20:0
		if(f.touch && f.tapCount < 1){
			return
		}
		this.fingerCursor.byFinger = true
		let lf = this.toLocal(f)
		this.fingerCursor.moveTo(lf.x, lf.y+touchdy, true)

		var tapDiv = f.touch?4:3, tapStart = f.touch?2:1
		if(f.tapCount%tapDiv === tapStart+0){
			if(this.fingerCursor.end < this.fingerCursor.start){
				this.fingerCursor.end = this.scanWordLeft(this.fingerCursor.end)
			}
			else{
				this.fingerCursor.end = this.scanWordRight(this.fingerCursor.end)
			}

		}
		else if(f.tapCount%tapDiv === tapStart+1){ // select line
			if(this.fingerCursor.end < this.fingerCursor.start){
				this.fingerCursor.end = this.scanLineRight(this.fingerCursor.end)+1
			}
			else {
				this.fingerCursor.end = this.scanLineLeft(this.fingerCursor.end)
			}
		}
	}

	onFingerUp(f){
		this.$lastKeyPress = undefined
		if(f.digit!== 1 || f.button !== 1 || this.isScrollBar(f.pickId) || (!f.touch && !this.fingerCursor))return
		this.fingerCursor = undefined
		var touchdy = 0//f.touch?-20:0
		if(f.touch && f.tapCount === 1){// && this.cs.cursors[0].hasSelection()){
			var cursor = this.cs.clearCursors()
			let lf = this.toLocal(f)
			cursor.moveTo(lf.x, lf.y+touchdy, false)
			this.app.setTextInputFocus(true)
		}
		//this.redraw()
	}
}

function charType(char){
	if(char.match(/\w/))return 1
	if(char.match(/\s/))return 2
	return 3
}

//
//
// Cursors
//
//

class Cursor extends require('base/class'){
	
	constructor(cursorSet, editor){
		super()
		this.cursorSet = cursorSet
		this.editor = editor 
		this.start = 0
		this.end = 0
		this.max = 0
	}

	hi(){
		return this.start > this.end? this.start: this.end
	}

	lo(){
		return this.start > this.end? this.end: this.start
	}

	span(){
		return abs(this.start - this.end)
	}

	hasSelection(){
		return this.start !== this.end
	}

	moveDelta(delta, onlyEnd){
		this.end = clamp(this.end + delta, 0, this.editor.textLength())
		if(!onlyEnd){
			this.start = this.end
		}
		//var rect = this.editor.cursorRect(this.end)
		this.max = -1//true
		//this.max = rect?rect.x:0
		this.editor.cursorChanged(this)
	}

	moveHome(onlyEnd){
		this.end = 0
		if(!onlyEnd) this.start = this.end
		//var rect = this.editor.cursorRect(this.end)
		this.max = -1//true
		//this.max = rect?rect.x:0
		this.editor.cursorChanged(this)
	}

	moveEnd(onlyEnd){
		this.end = this.editor.textLength()
		if(!onlyEnd) this.start = this.end
		//var rect = this.editor.cursorRect(this.end)
		this.max = -1//true
		//this.max = rect?rect.x:0
		this.editor.cursorChanged(this)
	}

	moveLine(lines, onlyEnd){
		var rect = this.editor.cursorRect(this.end)
		this.end = this.editor.offsetFromPos(this.max, rect.y + .5*rect.h + lines * rect.h)
		if(this.end < 0) this.end = 0
		if(!onlyEnd) this.start = this.end
		//console.log(this.max)
		this.editor.cursorChanged(this)
	}
	
	moveTo(x, y, onlyEnd){
		var end = this.editor.offsetFromPos(x, y)

		if(this.end === end && (onlyEnd || this.start === end)) return
		this.end = end
		//var rect = this.editor.cursorRect(this.end)
		//this.max = rect?rect.x:0
		this.max = -1//true
		//console.log(this.max)
		if(!onlyEnd) this.start = this.end
		this.editor.cursorChanged(this)
	}

	moveWordRight(onlyEnd){
		this.moveDelta(this.editor.scanWordRight(this.end) - this.end, onlyEnd)
	}

	moveWordLeft(onlyEnd){
		this.moveDelta(this.editor.scanWordLeft(this.end) - this.end, onlyEnd)
	}

	moveLineLeft(onlyEnd){
		var delta = this.editor.scanLineLeft(this.end) - this.end
		this.moveDelta(delta, onlyEnd)
		return delta
	}

	moveLineRight(onlyEnd){
		var delta = this.editor.scanLineRight(this.end) - this.end
		if(delta) this.moveDelta(delta, onlyEnd)
	}

	moveLineLeftUp(onlyEnd){
		var delta = this.editor.scanLineLeft(this.end) - this.end
		if(delta) this.moveDelta(delta, onlyEnd)
		else this.moveLine(-1, onlyEnd)
	}

	moveLineRightDown(onlyEnd){
		var delta = this.editor.scanLineRight(this.end) - this.end
		if(delta) this.moveDelta(delta, onlyEnd)
		else this.moveLine(1, onlyEnd)
	}

	insertText(text){
		var lo = this.lo(), hi = this.hi()

		this.editor.addUndoInsert(lo, hi)
		this.editor.removeText(lo, hi)
		this.start = this.end = lo
		this.cursorSet.delta -= this.span()
		var len = text.length
		if(len){
			let ins = this.editor.insertText(lo, text)
			if(ins){
				len = ins.len
				this.start = this.end = lo + ins.move
			}
			this.cursorSet.delta += len
	
			this.editor.addUndoDelete(lo, lo +len)
		}
		this.max = -1//true
		this.editor.cursorChanged(this)
	}

	deleteRange(lo, hi){
		if(lo === undefined) lo = this.lo()
		if(hi === undefined) hi = this.hi()
		this.editor.addUndoInsert(lo, hi)
		this.editor.removeText(lo, hi)
		this.cursorSet.delta -= hi - lo
		this.start = this.end = lo
		this.max = -1//true
		//this.max = this.editor.cursorRect(this.end).x
		this.editor.cursorChanged(this)
	}

	delete(){
		if(this.start !== this.end) return this.deleteRange()
		var next = this.end + 1
		this.editor.addUndoInsert(this.end, next)
		this.editor.removeText(this.end, next)
		this.cursorSet.delta -= 1
		this.editor.forkRedo()
		this.max = -1//true
		//this.max = this.editor.cursorRect(this.end).x
		this.editor.cursorChanged(this)
	}

	deleteWord(){
		// move start to beginning of word
		if(this.start !== this.end) return this.deleteRange()
		this.deleteRange(this.end, this.editor.scanWordRight(this.end))
	}

	deleteLine(){
		// move start to beginning of word
		if(this.start !== this.end) return this.deleteRange()
		this.deleteRange(this.end, this.editor.scanLineRight(this.end))
	}

	backSpace(){
		if(this.start !== this.end) return this.deleteRange()
		if(this.start === 0) return
		//var prev = this.end

		// lets scan for the right start eating all gen whitespace
		let range = this.editor.scanBackSpaceRange(this.end, this.cursorSet.delta)

		this.editor.addUndoInsert(range.start, range.end)
		let last = range.start + this.editor.removeText(range.start, range.end)
		
		this.cursorSet.delta -= (range.end-range.start)
		
		this.editor.forkRedo()
		this.start = this.end = last
		this.max = -1//true
		//this.max = this.editor.cursorRect(this.end).x
		this.editor.cursorChanged(this)
	}

	backSpaceWord(){
		// move start to beginning of word
		if(this.start !== this.end) return this.deleteRange()
		this.deleteRange(this.editor.scanWordLeft(this.end))
	}

	backSpaceLine(){
		// move start to beginning of word
		if(this.start !== this.end) return this.deleteRange()
		this.deleteRange(this.editor.scanLineLeft(this.end))
	}

	select(start, end){
		this.start = start
		this.end = end
		this.editor.cursorChanged()
	}

	clampCursor(mi, ma){
		this.start = clamp(this.start, mi, ma)
		this.end = clamp(this.end, mi, ma)
	}

	scanChange(oldText, newText){
		//return
		if(this.start !== this.end) return
		this.start = this.end = this.editor.scanChange(this.end, oldText, newText)
		//this.start = this.end = pos-minAbs(minAbs(minAbs(minAbs(minAbs(pos-i,pos-j), pos-k), pos-l), pos-m), pos-n)//+dx
	}

	invalidateMax(){
		this.max = -1
	}


	toggleSlashComment(){

		// toggle a line comment on or off
		var toggleLine = (pos)=>{
			// lets find the end of the line
			for(var last = pos, l = this.editor.textLength();last<l;last++){
				var code = this.editor.charCodeAt(last)
				if(code === 10 || code === 13 || last === l - 1){
					last--
					break
				}
			}

			// scan backwards to tab, newline or start
			var slashes = 0
			for(var i = last; i >= 0; i--){
				var code = this.editor.charCodeAt(i)
				if(code === 9 || code === 10 || code === 13){
					break
				}
				if(code === 47) slashes++
				else slashes = 0
			}

			var delta = 0
			if(slashes > 1){ // remove //
				this.editor.addUndoInsert(i+1, i+3)
				this.editor.removeText(i+1, i+3)
				delta = -2//min(abs(i-this.end), 2.)
			}
			else{ // add //
				this.editor.insertText(i+1, '//')
				this.editor.addUndoDelete(i+1, i+3)
				delta = 2
			}
	
			this.cursorSet.delta += delta
			// ok if we are going from start to end
			// or from end to start determines which one gets moved
			if(this.start>this.end){
				if(this.end > i && this.end < last){
					this.end += delta
				}
				this.start += delta
			}
			else{
				if(this.start > i && this.start < last){
					this.start += delta
				}
				this.end += delta
			}
			return last + delta + 2
		}
		// lets start with toggle line on end
		var lo = this.lo() + this.cursorSet.delta
		var hi = this.hi() + this.cursorSet.delta
		for(var i = lo; i <= hi;){
			i = toggleLine(i)
		}

		this.editor.cursorChanged()
	}
}

class CursorSet extends require('base/class'){
	prototype(){
		function makeSetCall(key, fn){
			return function(){
				this.delta = 0
				var cursors = this.cursors
				let dirty = false


				for(let i = 0; i < cursors.length; i++){
					var cursor = cursors[i]
					let start = cursor.start, end = cursor.end, max = cursor.max
					cursor.start += this.delta
					cursor.end += this.delta
					cursor[key].apply(cursor, arguments)
					//console.log("DISPATCHING", key, cursor.start)
					if(start !== cursor.start || end !== cursor.end || max !== cursor.max) dirty = true
				}
				if(dirty)this.updateSet()
			}
		}

		var props = Object.getOwnPropertyNames(Cursor.prototype)
		for(var i = 0; i < props.length; i++){
			var key = props[i]
			var value = Cursor.prototype[key]
			if(key !== 'constructor' && typeof value === 'function'){
				this[key] = makeSetCall(key, value)
			}
		}
	}

	constructor(editor){
		super()
		this.editor = editor
		this.cursors = []
		this.addCursor()
	}

	addCursor(){
		var cur = new Cursor(this, this.editor)
		this.cursors.push(cur)
		return cur
	}

	clearCursors(){
		this.cursors = []
		return this.addCursor()
	}

	// set has changed
	updateSet(){
		this.editor.redraw()
	}

	serializeToArray(){
		var out = []
		for(let i = 0; i < this.cursors.length; i++){
			var cursor = this.cursors[i]
			out.push(cursor.start, cursor.end, cursor.max)
		}
		return out
	}

	deserializeFromArray(inp){
		this.cursors = []
		for(let i = 0; i < inp.length; i += 3){
			var cursor = new Cursor(this, this.editor)
			cursor.start = inp[i]
			cursor.end = inp[i+1]
			cursor.max = inp[i+2]
			this.cursors.push(cursor)
		}
		this.updateSet()
	}

	fuse(){

		this.cursors.sort(function(a,b){ return (a.start<a.end?a.start:a.end) < (b.start<b.end?b.start:b.end)? -1: 1})
		// lets do single pass
		for(let i = 0; i < this.cursors.length - 1;){
			var cur = this.cursors[i]
			var nxt = this.cursors[i + 1]
			if(cur.hi() >= nxt.lo()){
				if(cur.hi() <= nxt.hi()){
					if(nxt.end < nxt.start){
						cur.end = cur.lo()
						cur.start = nxt.hi()
					}
					else{
						cur.start = cur.lo()
						cur.end = nxt.hi()
					}
				}
				this.cursors.splice(i+1, 1)
			}
			else i++
		}
	}
}
