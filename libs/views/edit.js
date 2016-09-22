var painter = require('services/painter')

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

		this.cursorSet.delta -= this.span()
		var len = text.length
		if(len){
			
			len = this.editor.insertText(lo, text)
			
			this.cursorSet.delta += len
			this.editor.addUndoDelete(lo, lo +len)
		}
		this.start = this.end = lo
		//this.max = this.editor.cursorRect(this.end).x
		this.max = -1//true
		//console.log(this.max)
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
		var prev = this.end - 1
		this.editor.addUndoInsert(prev, this.end)
		prev += this.editor.removeText(prev, this.end)
		this.cursorSet.delta -= 1
		this.editor.forkRedo()
		this.start = this.end = prev
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

	scanChange(pos, oldText, newText){
		if(this.start !== this.end) return
		if(pos < this.end){

			// scan for the closest position for the cursor
			
			var d = 0
			var oc1
			if(this.editor.wasNewlineChange){
				oc1 = oldText.charCodeAt(this.end)
				d = 2
			}
			else{
				oc1 = oldText.charCodeAt(this.end)
				// find something better than a newline to hold on to
				if(!this.editor.wasNoopChange){
					var ocm1 = oldText.charCodeAt(this.end-1)
					if(ocm1 === 32) oc1 = oldText.charCodeAt(this.end - 2),d = +1
					// cant reverse these, find another way
					if(oc1 === 10) oc1 =  oldText.charCodeAt(this.end-1), d = 1
					if(oc1 === 10) oc1 =  oldText.charCodeAt(this.end+1), d = -1
				}
			}

			for(var i = pos+1; i > 0; i--){
				if(newText.charCodeAt(i) === oc1){
					i+=d
					break
				}
			}
			for(var j = pos-1; j < newText.length; j++){
				if(newText.charCodeAt(j) === oc1){
					j+=d
					break
				}
			}
			var arr = oldText.split('')
			var s= ''
			for(let k =0; k < arr.length;k++){
				s+= k+':'+arr[k]+' - '+arr[k].charCodeAt(0)+'\n'
			}
			if(Math.abs(pos-i) < Math.abs(pos-j)){
				this.start = this.end = i
			}
			else this.start = this.end =j
		}
	}

	invalidateMax(){
		this.max = -1
	}

	toggleSlashComment(){
		// toggle a line comment on or off
		var start = this.end
		var ct = 0
		// lets find the end of the line
		for(var i = this.end, l = this.editor.textLength();i<l;i++){
			var code = this.editor.charCodeAt(i)
			if(code === 10){
				i--
				break
			}
		}
		for(;i >= 0; i--){
			var code = this.editor.charCodeAt(i)
			if(code === 47) ct++
			else ct = 0
			if(ct === 2) break
			if(code === 10 || code === 13) break
		}
		var d = 0
		if(ct === 2){
			this.editor.addUndoInsert(i, i+2)
			this.editor.removeText(i, i+2)
			d = -min(abs(i-this.end), 2.)
		}
		else{
			this.editor.insertText(i+1, '//')
			this.cursorSet.delta += 2
			this.editor.addUndoDelete(i+1, i+3)
			d = 2
		}

		this.cursorSet.delta = d
		this.start += d
		this.end += d
		this.editor.cursorChanged()
	}
}

class CursorSet extends require('base/class'){
	prototype(){
		function makeSetCall(key, fn){
			return function(){
				this.delta = 0
				var cursors = this.cursors
				for(let i = 0; i < cursors.length; i++){
					var cursor = cursors[i]
					cursor.start += this.delta
					cursor.end += this.delta
					cursor[key].apply(cursor, arguments)
				}
				this.updateSet()
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
		this.tools = {
			Bg:require('tools/bg').extend({
				borderRadius:0,
				padding:2,
				color:'#0c2141'
			}),
			Debug:require('tools/rect').extend({
				color:[0,0,0,0],
				borderRadius:1,
				borderWidth:1,
				borderColor:'red'
			}),
			Text:require('tools/text').extend({
				font:require('fonts/ubuntu_medium_256.font'),
				fontSize:24,
				color:'#ccc',
				drawDiscard:'y'
			}),
			Selection:require('tools/selection').extend({
				bgColor:'#458',
				fieldPush:0.8,
				borderWidth:0,//0.25,
				gloop:6,
				borderRadius:3,
				borderColor:'#458',
				drawDiscard:'y',
				vertexStyle:function(){
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
			Cursor:require('tools/rect').extend({
				duration:0.0,
				ease:[1,100,0,0],
				tween:2,
				color:'#fff',
				vertexStyle:function(){
					
					var time = this.normalTween
					var v = sin(time*PI)
					this.y -= v*2.
					this.h += v*4.
					this.x -= v
					this.w += v*1.
					this.shadowOffset = vec2(-v,v)*4.
				}
			})
		}
	}
	//
	//
	// View 
	//
	//

	_onInit(){
		super._onInit()
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
			var last = this.$lengthText() - 1//this._text.length - 1
			if(last <0){ // first cursor, make it up from initial props
				var ls = this.Text.prototype.lineSpacing
				var fs = this.Text.prototype.fontSize
				return {
					lineSpacing: ls,
					fontSize:fs,
					tail:0,
					head:0,
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
				cr.x += (cr.head + cr.tail + cr.advance) * cr.fontSize
			}
			cr.advance = 0
			return cr
		}

		return {
			lineSpacing: rd.lineSpacing,
			fontSize:rd.fontSize,
			tail:rd.tail,
			head:rd.head,
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

	textLength(){
		return this._text.length
	}

	charAt(offset){
		return this._text.charAt(offset)
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

	addUndoInsert(start, end, stack, slicesrc){
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
			start:start,
			data: this.serializeSlice(start, end, slicesrc),
			cursors: this.cs.serializeToArray()
		})
	}

	addUndoDelete(start, end, stack){
		if(!stack) stack = this.$undoStack
		var last = stack[stack.length - 1]
		if(last && last.type === 'delete' && last.end === start){
			last.end += end - start
			return
		}
		stack.push({
			group: this.$undoGroup,
			type:'delete',
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
		var name = k.name
		var prefix = ''
		var evname = 'onKey' + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]){
			if(!this[evname](k)){
				this.$lastKeyPress = undefined				
			}
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
	}

	//
	//
	// touch/mouse input
	//
	//
	
	onFingerDown(f){
		if(f.digit!== 1 || f.button !== 1  || f.pickId >= this.$scrollPickIds) return
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

		this.fingerCursor.moveTo(f.x, f.y + touchdy, f.shift)
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
		if(f.digit!== 1 || f.button !== 1 || f.pickId >= this.$scrollPickIds || (!f.touch && !this.fingerCursor))return
		var touchdy = 0//f.touch?-20:0
		if(f.touch && f.tapCount < 1){
			return
		}
		this.fingerCursor.byFinger = true

		this.fingerCursor.moveTo(f.x, f.y+touchdy, true)

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
		if(f.digit!== 1 || f.button !== 1 || f.pickId >=this.$scrollPickIds|| (!f.touch && !this.fingerCursor))return
		this.fingerCursor = undefined
		var touchdy = 0//f.touch?-20:0
		if(f.touch && f.tapCount === 1){// && this.cs.cursors[0].hasSelection()){
			var cursor = this.cs.clearCursors()
			cursor.moveTo(f.x, f.y+touchdy, false)
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
