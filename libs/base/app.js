require('base/log')
//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var keyboard = require('services/keyboard')
var Store = require('base/store')
var Worker = require('services/worker')
var mat4 = require('base/mat4')
var vec4 = require('base/vec4')
var View = require('base/view')
module.exports = class App extends View{
	
	// lets define some props
	prototype(){
		this.Turtle = require('base/turtle')
		this.ScrollBar = require('views/scrollbar').extend({
			order:99
		})
		this.name = 'App'
		this.cursor = 'default'
		this.x = 0
		this.y = 0
		this.w = '100%'
		this.h = '100%'
		this.pickId = 1
	}

	destroy(){
		super.destroy()
		this.$painterUbo.destroyUbo()
	}

	constructor(){
		super()
		// create app
		this.module = module
		this.store = Store.create()

		var app = this.app = this

		// pick Ids
		this.$pickAlloc = 2
		this.$pickFree = []
		var pickIds = this.$pickIds = {
			1:this
		}
		
		this.$turtleStack = []
		this.turtle = this.$appTurtle = new this.Turtle(this)
		this.$turtleStack.push(this.$appTurtle)
		this.$turtleStack.len = 1

		this.$camPosition = mat4.create()
		this.$camProjection = mat4.create()
		
		var painterUboDef = this.Pass.prototype.$compileInfo.uboDefs.painter
		this.$painterUbo = new painter.Ubo(painterUboDef)

		this.frameId = 0

		// lets do our first redraw
		this.app = app
		// we are the default focus
		this.$focusView = app
		// the main app has a todo

		function fingerMessage(event, todoId, pickId, msg, isOut){
			if(msg.xDown !== undefined){
				msg.xDown -= painter.x
				msg.yDown -= painter.y
			}
			msg.x -= painter.x
			msg.y -= painter.y

			var view = pickIds[pickId]
			if(!view) return				

			if(view[event]) view[event](msg)

			var iter = view
			while(iter){
				var state = iter.states && iter.states[iter.state]
				if(state && state.cursor) return fingers.setCursor(state.cursor)
				if(iter.cursor) return fingers.setCursor(iter.cursor)
				iter = iter.parent
			}
		}

		app.$fingerMove = {}
		app.$fingerDragObject = {}

		// dispatch mouse events
		fingers.onFingerDown = function(msg, localId){
			if(localId){
				Worker.setFocus(localId)
				var focusView = app.$focusView
				if(focusView) focusView.clearFocus()
				return
			}
			else Worker.setFocus(0)

			app.$fingerMove[msg.digit] = {
				todoId:msg.todoId,
				pickId:msg.pickId
			}
			fingerMessage('onFingerDown', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerMove = function(msg, localId){
			if(localId) return
			var move = app.$fingerMove[msg.digit]
			if(!move) return
			fingerMessage('onFingerMove', move.todoId, move.pickId, msg)
		}

		var dragTodoId = {}
		var dragPickId = {}
		fingers.onFingerDrag = function(msg, localId){
			if(localId) return
			// we want mouse in/out messages to go to the right view and stamp.
			var todoId = msg.todoId
			var pickId = msg.pickId
			msg.dragObject = app.$fingerDragObject
			if(todoId !== dragTodoId[msg.digit] || pickId !== dragPickId[msg.digit]){
				fingerMessage('onFingerDragOut', dragTodoId[msg.digit], dragPickId[msg.digit], msg, true)
				fingerMessage('onFingerDragOver', msg.todoId, msg.pickId, msg)
			}
			dragTodoId[msg.digit] = todoId
			dragPickId[msg.digit] = pickId
			fingerMessage('onFingerDrag', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerUp = function(msg, localId){
			//if(localId) return
			var move = app.$fingerMove[msg.digit]
			if(!move) return
			app.$fingerMove[msg.digit] = undefined
			fingerMessage('onFingerUp', move.todoId, move.pickId, msg)
		}

		fingers.onFingerUpNow = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerUpNow', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerForce = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerForce', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerHover = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerHover', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerOver = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerOver', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerOut = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerOut', msg.todoId, msg.pickId, msg)
		}

		fingers.onFingerWheel = function(msg, localId){
			if(localId) return
			fingerMessage('onFingerWheel', msg.todoId, msg.pickId, msg)
		}

		function keyboardMessage(name, msg){
			var iter = app.$focusView
			while(iter){
				if(iter[name] && iter[name](msg)) break
				iter = iter.parent
			}
		}

		keyboard.onKeyDown = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyDown', msg)
		}

		keyboard.onKeyUp = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyUp', msg)
		}

		keyboard.onKeyPress = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyPress', msg)
		}

		keyboard.onKeyPaste = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyPaste', msg)
		}

		keyboard.onKeyboardOpen = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyboardOpen', msg)
		}

		keyboard.onKeyboardClose = function(msg, localId){
			if(localId) return
			keyboardMessage('onKeyboardClose', msg)
		}

		var appBlur
		keyboard.onAppBlur = function(msg, localId){
			if(localId) return
			appBlur = app.$focusView
			if(appBlur) appBlur.clearFocus()
		}

		keyboard.onAppFocus = function(msg, localId){
			if(localId) return
			if(appBlur) appBlur.setFocus()
		}


		painter.onResize = function(){
			app.x = 0
			app.y = 0
			app.w = painter.w
			app.h = painter.h
			app.redraw()
		}
		
		painter.onResize()
		_="Application "+module.worker.main+" started at "+Date().toString() 
	}

	transferFingerMove(digit, pickId){
		this.$fingerMove[digit] = {
			todoId:undefined,
			pickId:pickId
		}
	}

	startFingerDrag(digit, dragObject){
		this.$fingerDragObject[digit] = dragObject
		fingers.startFingerDrag(digit)
	}

	setClipboardText(text){
		keyboard.setClipboardText(text)
	}

	useSystemEditMenu(capture){
		keyboard.useSystemEditMenu(capture)
	}

	setCharacterAccentMenuPos(x,y){
		keyboard.setCharacterAccentMenuPos(x,y)
	}

	//setWorkerKeyboardFocus(focus){
	//	keyboard.setWorkerKeyboardFocus()
	//}

	setTextInputFocus(focus){
		keyboard.setTextInputFocus(focus)
	}

	getTime(){
		return (Date.now() - painter.timeBoot) / 1000
	}

	$updateTime(){
		this.time = this.getTime()
		this.frameId++
	}

	_redraw(force){
		if(this.redrawTimer === undefined || force){
			if(this.redrawTimer === null){ // make sure we dont flood the main thread
				this.redrawTimer = setTimeout(_=>{
					this.redrawTimer = null
					this.$redrawViews()
					if(this.redrawTimer === null) this.redrawTimer = undefined
				},16)
			}
			else{
				this.redrawTimer = setImmediate(_=>{
					this.redrawTimer = null
					this.$redrawViews()
					if(this.redrawTimer === null) this.redrawTimer = undefined
				},0)
			}
		}
	}

	$redrawViews(){
		this.$updateTime()
		// we can submit a todo now
		mat4.ortho(this.$camProjection, 0, painter.w, 0, painter.h, -100, 100)

		// copy to turtle
		this.$turtleStack.len = 0
		//this.$writeList.length = 0

		// set up our root turtle
		var turtle = this.$appTurtle
		turtle._x = 0
		turtle._y = 0
		turtle.wy = 0
		turtle.wx = 0
		turtle.ix = 0
		turtle.iy = 0
		turtle._w = turtle.width = this.w
		turtle._h = turtle.height = this.h

		this.$painterUbo.mat4(painter.nameId('thisDOTcamPosition'), this.$camPosition)
		this.$painterUbo.mat4(painter.nameId('thisDOTcamProjection'), this.$camProjection)

		this.draw()
		View.recomputeTodoMatrices(this.$todos[0], 0, 0)
		//this.$recomputeMatrix(0,0)
	}
}


