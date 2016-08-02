module.exports = require('view').extend(function EditView(proto){

	proto.props = {
	}

	proto.tools = {
		Bg:require('shaders/fastrectshader').extend({
			borderRadius:0,
			padding:2,
			color:'#0c2141'
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
				//this.color = mix('white','gray',v)
			}
		})
	}

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

		proto.moveToOffset = function(){
			this.start = this.end = offset
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.movePos = function(delta, onlyEnd){
			this.end = clamp(this.end + delta, 0, this.editor.charCount)
			if(!onlyEnd){
				this.start = this.end
			}
			this.max = this.editor.cursorRect(this.end).x
		}

		proto.moveLine = function(lines, onlyEnd){
			var rect = this.editor.cursorRect(this.end)
			this.end = this.editor.offsetFromPos(this.max, rect.y + line * this.editor.lineHeight)
			if(this.end < 0) this.end = 0
			if(!onlyEnd) this.start = this.end
		}
		
		proto.moveTo = function(x, y, onlyEnd){
			this.end = this.editor.offsetFromPos(x, y)
			if(!onlyEnd) this.start = this.end
		}
	})

	var CursorSet = require('class').extend(function CursorSet(proto){

		function makeSetCall(key, fn){
			return function(){
				this.delta = 0
				var cursors = this.cursors
				for(var i = 0; i < cursors.length; i++){
					var cursor = cursors[i]
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
			this.cursors = [new Cursor(this, this.editor)]
		}

		// set has changed
		proto.updateSet = function(){
			this.editor.redraw()
		}
	})

	proto.onInit = function(){
		this.cs = new CursorSet(this)
		this.setFocus()
		this.text = "Hello World i'm a piece of text\nThat can be multiple lines\n123 123\n"
		this.charCount = this.text.length
	}

	// return the cursor x/y 
	proto.cursorRect = function(offset){
		// this function here
		var t = this.readText(offset)
		return {
			x:t.x, //+ t.fontSize * t.x1,
			y:t.y + 0.1*t.fontSize, //- t.fontSize * t.y1,
			w:(t.x2- t.x1)*t.fontSize,
			h:t.fontSize
		}
	}

	proto.onFingerDown = function(){
		this.setFocus()
	}

	proto.onHasFocus = function(){
		this.redraw()
	}

	proto.onCtrlZ =
	proto.onMetaZ = function(){

	}

	proto.onLeftArrow = function(e){
		this.cs.movePos(-1, e.shift)
	}

	proto.onRightArrow = function(e){
		this.cs.movePos(1, e.shift)
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

	proto.onKeyPress = function(){

	}

	proto.onDraw = function(){
		this.beginBg()

		this.drawText({
			fontSize:this.fontSize,
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
})