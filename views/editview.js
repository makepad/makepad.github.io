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
			//duration:0.8,
			//ease:[1,100,0,0],
			//tween:2,
			color:'#ccc'
		}),
		Select:require('shaders/rectshader').extend({
			color:'#87543a',
			//duration:0.2,
			borderWidth:1,
			borderRadius:3,
			borderColor:['#87543aff',1.2],
			//ease:[1,100,0,0],
			//tween:2,
			vertexStyle:function(){
				var dx = 0.75
				this.x -= dx
				this.y -= dx
				this.w += 2.*dx
				this.h += 2.*dx
			}
		}),		
		Cursor:require('shaders/rectshader').extend({
			duration:0.2,
			ease:[1,100,0,0],
			tween:2,
			color:'#fff',
			vertexStyle:function(){
				var time = this.normalTween
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
		//console.log(this.$drawFastText.toString())
		this.text = require('shaders/lineshader').body.toString()
		//this.text = Array(100).join("Hello World i'm a piece of text Hello World i'm a piece of text Hello World i'm a piece of text Hello World i'm a piece of text\n")
		//this.text = "H\nO\n"
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

		this.drawSelect()

		var style = {
			color:[1,1,1,1],
			outlineColor:[0,0,0,0],
			shadowColor:[0,0,0,0],
			fontSize:12,
			italic:0,
			duration:1,
			tween:1,
			ease:[0,0,0,0],
			shadowBlur:0,
			shadowSpread:0,
			shadowOffset:[0,0],
			outlineWidth:0,
			boldness:0,
			lockScroll:1
		}
		var parser = require('jsparser/jsparser')
		//var text = this.text.split(' ')
		//for(var i =0 ;i < text.length; i++){
		this.$drawFastText(this.text, style)
		//}

		if(this.hasFocus){
			var cursors = this.cs.cursors
			for(var i = 0; i < cursors.length; i++){
				var cursor = cursors[i]

				var t = this.cursorRect(cursor.end)
				var boxes = this.$boundRectsText(cursor.lo(), cursor.hi())
				for(var j = 0; j < boxes.length;j++){
					var box = boxes[j]
					this.drawSelect({
						x:box.x,
						y:box.y,
						w:box.w,
						h:box.h
					})
				}

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
			var lo = this.lo(), hi = this.hi()
			this.editor.addUndoInsert(lo, hi)
			this.editor.removeText(lo, hi)
			this.cursorSet.delta -= hi - lo
			this.start = this.end = lo
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.delete = function(){
			if(this.start !== this.end) return this.deleteRange()
			var next = this.end + 1
			this.editor.addUndoInsert(this.end, next)
			this.editor.removeText(this.end, next)
			this.cursorSet.delta -= 1
			this.editor.forkRedo()
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.backSpace = function(){
			if(this.start !== this.end) return this.deleteRange()
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

		proto.clearCursors = function(){
			this.cursors = []
			return this.addCursor()
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
		var rd = this.$readOffsetText(offset)
		if(!rd) return
		return {
			x:rd.x,
			y:rd.y,
			w:rd.advance * rd.fontSize,
			h:rd.fontSize * rd.lineSpacing
		}
	}

	proto.cursorRect = function(offset){
		var rd = this.$readOffsetText(offset)
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
		var t = this.$seekPosText(x, y)

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

	proto.onKeyLeftArrow = function(e){
		this.cs.movePos(-1, e.shift)
	}

	proto.onKeyRightArrow = function(e){
		this.cs.movePos(1, e.shift)
	}

	proto.onKeyUpArrow = function(e){
		this.cs.moveLine(-1, e.shift)
	}

	proto.onKeyDownArrow = function(e){
		this.cs.moveLine(1, e.shift)
	}

	proto.onKeyBackSpace = function(e){
		this.cs.backSpace()
	}

	proto.onKeyDelete = function(e){
		this.cs.delete()
	}

	proto.onKeyEnter = function(e){
		this.cs.insertText('\n')
		this.cs.movePos(1)
	}

	proto.onKeyX = function(e){
		if(!e.ctrl && !e.meta) return
		this.cs.delete()		
	}

	proto.onKeyA = function(e){
		if(!e.ctrl && !e.meta) return
		// select all
		var cur = this.cs.clearCursors()
		cur.start = 0, cur.end = this.textLength()
		this.redraw()
	}

	proto.onKeyDown = function(e){
		// lets trigger an event
		var name = e.name
		var prefix = ''
		var evname = 'onKey' + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]) return this[evname](e)
	}
	
	proto.onKeyPress = function(e){
		//if(e.ctrl || e.meta || e.alt || e.shift) return
		var out = String.fromCharCode(e.char === 13?10:e.char)
		// lets run over all our cursors
		this.cs.insertText(out)
		this.cs.movePos(1)
	}

	proto.onFingerDown = function(e){
		if(e.digit!== 1)return

		this.setFocus()

		if(e.meta){
			this.fingerCursor = this.cs.addCursor()
		}
		else{
			this.fingerCursor = this.cs.clearCursors()
		}
		this.fingerCursor.moveTo(e.x, e.y)	
		this.redraw()
	}

	proto.onFingerMove = function(e){
		if(e.digit!== 1) return
		this.fingerCursor.moveTo(e.x, e.y, true)
		this.redraw()
	}

	proto.onFingerUp = function(e){
		if(e.digit!== 1)return
		this.fingerCursor = undefined
	}

	proto.onFingerUp = function(){

	}

})