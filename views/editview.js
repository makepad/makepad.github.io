module.exports = require('view').extend(function EditView(proto){

	proto.props = {
	}

	//
	//
	// Shaders
	//
	//

	proto.tools = {
		Bg:require('shaders/fastrectshader').extend({
			borderRadius:0,
			padding:2,
			color:'#0c2141'
		}),
		Debug:require('shaders/rectshader').extend({
			color:[0,0,0,0],
			borderRadius:1,
			borderWidth:1,
			borderColor:'red'
		}),
		Text:require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_medium_256.sdffont'),
			fontSize:24,
			color:'#ccc'
		}),
		Cursor:require('shaders/rectshader').extend({
			duration:0.2,
			ease:[1,100,0,0],
			tween:2,
			color:'#fff',
			vertexStyle:function(){
				var time = clamp((this.time - this.tweenStart) / this.duration,0.,1.)
				var v = sin(time*PI)
				this.y -= v*4.
				this.h += v*8.
				this.x -= v
				this.w += v*2.
				this.shadowOffset = vec2(-v,v)*4.
			}
		})
	}

	//
	//
	// View 
	//
	//

	proto.onInit = function(){
		this.cs = new CursorSet(this)
		this.setFocus()
		this.text = ""

		//this.text = "Hello World i'm a piece of text\nThat can be multiple lines\n123 123\n"
		this.charCount = this.text.length
	}

	proto.onHasFocus = function(){
		this.redraw()
	}

	//
	//
	// Drawing
	//
	//

	proto.onDraw = function(){
		this.beginBg()

		this.drawText({
			text:this.text
		})

		if(this.hasFocus){
			var cursors = this.cs.cursors
			for(var i = 0; i < cursors.length; i++){
				var cursor = cursors[i]
				var t = this.cursorRect(cursor.start)
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
	// Cursors
	//
	//

	var Cursor = require('class').extend(function Cursor(proto){
		proto.onConstruct = function(cursorSet, editor){
			this.cursorSet = cursorSet
			this.editor = editor 
			this.start = 0
			this.end = 0
			this.max = 0
		}

		proto.hi = function(){
			return this.start > this.end? this.start: this.end
		}

		proto.lo = function(){
			return this.start > this.end? this.end: this.start
		}

		proto.span = function(){
			return abs(this.start - this.end)
		}

		proto.moveToOffset = function(){
			this.start = this.end = offset
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.movePos = function(delta, onlyEnd){
			this.end = clamp(this.end + delta, 0, this.editor.textLength())
			if(!onlyEnd){
				this.start = this.end
			}
			var rect = this.editor.textRect(this.end)
			this.max = rect?rect.x:0
		}

		proto.moveLine = function(lines, onlyEnd){
			var rect = this.editor.textRect(this.end)
			this.end = this.editor.offsetFromPos(this.max, rect.y + .5*rect.h + lines * rect.h)
			if(this.end < 0) this.end = 0
			if(!onlyEnd) this.start = this.end
		}
		
		proto.moveTo = function(x, y, onlyEnd){
			this.end = this.editor.offsetFromPos(x, y)
			var rect = this.editor.cursorRect(this.end)
			this.max = rect?rect.x:0
			if(!onlyEnd) this.start = this.end
		}

		proto.insertText = function(text){
   			var lo = this.lo(), hi = this.hi()

			this.editor.addUndoInsert(lo, hi)
			this.editor.removeText(lo, hi)
			this.cursorSet.delta -= this.span()
			var len = text.length
			if(len){
				this.editor.insertText(lo, text)
				this.cursorSet.delta += len
				this.editor.addUndoDelete(lo, lo +len)
			}
		}

		proto.deleteRange = function(){

		}

		proto.delete = function(){
			if(this.start !== this.end) this.deleteRange()
			var next = this.end + 1
			this.editor.addUndoInsert(this.end, next)
			this.editor.removeText(this.end, next)
			this.cursorSet.delta -= 1
			this.editor.forkRedo()
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.backSpace = function(){
			if(this.start !== this.end) this.deleteRange()
			if(this.start === 0) return
			var prev = this.end - 1
			this.editor.addUndoInsert(prev, this.end)
			this.editor.removeText(prev, this.end)
			this.cursorSet.delta -= 1
			this.editor.forkRedo()
			this.start = this.end = prev
			this.max = this.editor.cursorRect(this.end).x
		}
	})

	var CursorSet = require('class').extend(function CursorSet(proto){

		function makeSetCall(key, fn){
			return function(){
				this.delta = 0
				var cursors = this.cursors
				for(var i = 0; i < cursors.length; i++){
					var cursor = cursors[i]
					cursor.start += this.delta
					cursor.end += this.delta
					cursor[key].apply(cursor, arguments)
				}
				this.updateSet()
			}
		}
		for(var key in Cursor.prototype){
			proto[key] = makeSetCall(key, Cursor.prototype[key])
		}

		proto.onConstruct = function(editor){
			this.editor = editor
			this.cursors = []
			this.addCursor()
		}

		proto.addCursor = function(){
			var cur = new Cursor(this, this.editor)
			this.cursors.push(cur)
			return cur
		}

		// set has changed
		proto.updateSet = function(){
			this.editor.redraw()
		}
	})


	//
	//
	// Editor cursor API
	//
	//

	proto.textRect = function(offset){
		var rd = this.readText(offset)
		if(!rd) return
		return {
			x:rd.x,
			y:rd.y,
			w:rd.advance * rd.fontSize,
			h:rd.fontSize * rd.lineSpacing
		}
	}

	proto.cursorRect = function(offset){
		var rd = this.readText(offset)
		if(!rd) return
		return {
			x:rd.x, //+ t.fontSize * t.x1,
			y:rd.y + 0.1*rd.fontSize, //- t.fontSize * t.y1,
			h:rd.fontSize
		}
	}

	proto.textLength = function(){
		return this.text.length
	}

	proto.offsetFromPos = function(x, y){
		var t = this.seekText(x, y)
		if(t === -1) t = 0
		else if(t === -2) t = this.text.length 
		return t
	}

	proto.insertText = function(offset, text){
		this.text = this.text.slice(0, offset) + text + this.text.slice(offset)
		this.redraw()
	}

	proto.removeText = function(start, end){
		this.text = this.text.slice(0, start) + this.text.slice(end)
		this.redraw()
	}

	//
	//
	// Undo stack
	//
	//
	proto.addUndoInsert = function(){

	}

	proto.addUndoDelete = function(){

	}

	proto.forkRedo = function(){

	}

	//
	//
	// Key and input bindings
	//
	//

	proto.onCtrlZ =
	proto.onMetaZ = function(){

	}

	proto.onLeftArrow = function(e){
		this.cs.movePos(-1, e.shift)
	}

	proto.onRightArrow = function(e){
		this.cs.movePos(1, e.shift)
	}

	proto.onUpArrow = function(e){
		this.cs.moveLine(-1, e.shift)
	}

	proto.onDownArrow = function(e){
		this.cs.moveLine(1, e.shift)
	}

	proto.onBackSpace = function(e){
		this.cs.backSpace()
	}

	proto.onDelete = function(e){
		this.cs.delete()
	}

	proto.onKeyDown = function(e){
		// lets trigger an event
		var name = e.name
		var prefix = ''
		if(e.ctrl) prefix += 'Ctrl'
		if(e.meta) prefix += 'Meta'
		if(e.alt) prefix += 'Alt'
		if(e.shift) prefix += 'Shift'			
		var evname = 'on' + prefix + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]) return this[evname](e)
	}
	
	proto.onKeyPress = function(e){
		var out = String.fromCharCode(e.char === 13?10:e.char)
		// lets run over all our cursors
		this.cs.insertText(out)
		this.cs.movePos(1)
	}

	proto.onFingerDown = function(e){
		this.setFocus()
		var cur = this.cs
		if(e.meta) cur = this.cs.addCursor()
		cur.moveTo(e.x, e.y)
		this.redraw()
	}

})