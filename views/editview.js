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
		this.text = Array(100).join("HELLO WORLD\n")
		//console.log(this.$drawFastText.toString())
		
		//this.text = require('shaders/lineshader').body.toString()
		//this.text = Array(100).join("Hello World i'm a piece of text Hello World i'm a piece of text Hello World i'm a piece of text Hello World i'm a piece of text\n")
		//this.text = "H\nO\n"
	}

	proto.onHasFocus = function(){
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

	proto.onDraw = function(){

		this.beginBg(this.viewGeom)

		this.drawSelect()

		//var parser = require('jsparser/jsparser')
		//js = require('shader').body.toString()
		//require.perf()
		//parser.parse(js)
		//require.perf()

		this.drawText({
			wrapping:'char',
			$editMode:true,
			text:this.text
		})

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
					// lets tell the keyboard
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
			this.editor.cursorChanged(this)
		}

		proto.movePos = function(delta, onlyEnd){
			this.end = clamp(this.end + delta, 0, this.editor.textLength())
			if(!onlyEnd){
				this.start = this.end
			}
			var rect = this.editor.textRect(this.end)
			this.max = rect?rect.x:0
			this.editor.cursorChanged(this)
		}

		proto.moveLine = function(lines, onlyEnd){
			var rect = this.editor.textRect(this.end)
			this.end = this.editor.offsetFromPos(this.max, rect.y + .5*rect.h + lines * rect.h)
			if(this.end < 0) this.end = 0
			if(!onlyEnd) this.start = this.end
			this.editor.cursorChanged(this)
		}
		
		proto.moveTo = function(x, y, onlyEnd){
			this.end = this.editor.offsetFromPos(x, y)
			var rect = this.editor.cursorRect(this.end)
			this.max = rect?rect.x:0
			if(!onlyEnd) this.start = this.end
			this.editor.cursorChanged(this)
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
			this.start = this.end = lo
			this.editor.cursorChanged(this)
		}

		proto.deleteRange = function(){
			var lo = this.lo(), hi = this.hi()
			this.editor.addUndoInsert(lo, hi)
			this.editor.removeText(lo, hi)
			this.cursorSet.delta -= hi - lo
			this.start = this.end = lo
			this.max = this.editor.cursorRect(this.end).x
			this.editor.cursorChanged(this)
		}

		proto.delete = function(){
			if(this.start !== this.end) return this.deleteRange()
			var next = this.end + 1
			this.editor.addUndoInsert(this.end, next)
			this.editor.removeText(this.end, next)
			this.cursorSet.delta -= 1
			this.editor.forkRedo()
			this.max = this.editor.cursorRect(this.end).x
			this.editor.cursorChanged(this)
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
			this.editor.cursorChanged(this)
		}

		proto.select = function(start, end){
			this.start = start
			this.end = end
			this.editor.cursorChanged()
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

	// serialize all selections, lazily
	proto.cursorChanged = function(){
		if(!this.$selChangeTimer) this.$selChangeTimer = setTimeout(function(){
			this.$selChangeTimer = undefined
			var txt = ''
			for(var i = 0; i < this.cs.cursors.length; i++){
				var cursor = this.cs.cursors[i]
				txt += this.text.slice(cursor.lo(), cursor.hi())
			}
			this.app.setClipboardText(txt)

			// lets set the character accent menu pos
			var cursor = this.cs.cursors[0]
			var rd = this.$readOffsetText(cursor.lo())

			this.app.setCharacterAccentMenuPos(rd.x + 0.5 * rd.advance, rd.y)

			this.redraw()
		}.bind(this))
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

	proto.onKeyPaste = function(k){
		this.cs.insertText(k.text)
		this.cs.movePos(k.text.length)
	}

	proto.onCtrlZ =
	proto.onMetaZ = function(){

	}

	proto.onKeyLeftArrow = function(k){
		this.cs.movePos(-1, k.shift)
	}

	proto.onKeyRightArrow = function(k){
		this.cs.movePos(1, k.shift)
	}

	proto.onKeyUpArrow = function(k){
		this.cs.moveLine(-1, k.shift)
	}

	proto.onKeyDownArrow = function(k){
		this.cs.moveLine(1, k.shift)
	}

	proto.onKeyBackSpace = function(k){
		this.cs.backSpace()
	}

	proto.onKeyDelete = function(k){
		this.cs.delete()
	}

	proto.onKeyEnter = function(k){
		this.cs.insertText('\n')
		this.cs.movePos(1)
	}

	proto.onKeyX = function(k){
		if(!k.ctrl && !k.meta) return
		this.cs.delete()		
	}

	proto.onKeyA = function(k){
		if(!k.ctrl && !k.meta) return
		// select all
		var cur = this.cs.clearCursors()
		cur.select(0, this.textLength())
	}

	proto.onKeyDown = function(k){
		// lets trigger an event
		var name = k.name
		var prefix = ''
		var evname = 'onKey' + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]) return this[evname](k)
	}
	
	proto.onKeyPress = function(k){
		//if(e.ctrl || e.meta || e.alt || e.shift) return
		var out = String.fromCharCode(k.char === 13?10:k.char)
		// lets run over all our cursors
		// if repeat is -1 we have to replace last char
		if(k.special){
			this.cs.backSpace()			
		}
		this.cs.insertText(out)
		this.cs.movePos(1)
	}

	proto.onFingerDown = function(f){
		if(f.digit!== 1 || f.button !== 1 || f.pickId !== 0)return
		this.setFocus() 

		if(f.meta){
			this.fingerCursor = this.cs.addCursor()
		}
		else{
			var oldstart = this.cs.cursors[0].start
			this.fingerCursor = this.cs.clearCursors()
			this.fingerCursor.start = oldstart
		}
		this.fingerCursor.moveTo(f.x, f.y, f.shift)	
		this.redraw()
	}

	proto.onFingerMove = function(f){
		if(f.digit!== 1 || f.button !== 1 || f.pickId !== 0)return
		this.fingerCursor.moveTo(f.x, f.y, true)
		this.redraw()
	}

	proto.onFingerUp = function(f){
		if(f.digit!== 1 || f.button !== 1 || f.pickId !== 0)return
		this.fingerCursor = undefined
	}

	proto.onFingerUp = function(){

	}

})