//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var keyboard = require('services/keyboard')
var Store = require('base/store')
var Worker = require('services/worker')
var mat4 = require('base/mat4')
var vec4 = require('base/vec4')

module.exports = class App extends require('base/view'){
	
	// lets define some props
	prototype(){
		this.name = 'App'
		this.cursor = 'default'
		this.x = 0
		this.y = 0
		this.w = '100%'
		this.h = '100%'
	}

	constructor(){
		super()
		
		// create app
		this.store = Store.create()

		// the turtle writelist
		this.$writeList = []

		var app = this.app = this
		var viewTodoMap = this.$viewTodoMap = []

		viewTodoMap[this.todo.todoId] = this

		app.camPosition = mat4.create()
		app.camProjection = mat4.create()
		
		var painterUboDef = app.Pass.prototype.$compileInfo.uboDefs.painter
		app.painterUbo = new painter.Ubo(painterUboDef)

		app._frameId = 0

		function fingerMessage(event, todoId, pickId, msg, isOut){
			var view = viewTodoMap[todoId]
			if(!view) return				

			if(view[event]) view[event](msg)

			// lets find the right cursor
			var stamp = view.$pickIds[pickId]
			if(stamp){
				if(stamp[event]) stamp[event](msg)
			}
			if(isOut) return
			// set the mousecursor
			if(stamp){
				if(stamp.state && stamp.state.cursor) return fingers.setCursor(stamp.state.cursor)
				if(stamp.cursor) return fingers.setCursor(stamp.cursor)
			}
			var iter = view
			while(iter){
				if(iter.cursor){
					return fingers.setCursor(iter.cursor)
				}
				iter = iter.parent
			}
		}

		app.$fingerMove = {}
		app.$fingerDragObject = {}

		// dispatch mouse events
		fingers.onFingerDown = function(msg, localId){
			
			if(localId){
				Worker.setFocus(localId)
				var focusView = app.focusView
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
			var iter = app.focusView
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
			appBlur = app.focusView
			if(appBlur) appBlur.clearFocus()
		}

		keyboard.onAppFocus = function(msg, localId){
			if(localId) return
			if(appBlur) appBlur.setFocus()
		}


		painter.onResize = function(){
			app._x = 0
			app._y = 0
			app._w = painter.w
			app._h = painter.h
			app.redraw()
		}

		// lets do our first redraw
		app.app = app
		// we are the default focus
		app.focusView = app
		// lets attach our todo and ubo to the main framebuffer
		painter.mainFramebuffer.assignTodoAndUbo(app.todo, app.painterUbo)

		this.appTurtle = new this.Turtle(this)

		// compose the tree
		//app.$composeTree(app)
		// first draw
		painter.onResize()
		//app.$redrawViews()
	}

	transferFingerMove(digit, todoId, pickId){
		this.$fingerMove[digit] = {
			todoId:todoId,
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
		this._time = this.getTime()
		this._frameId++
	}

	$redrawViews(){
		this.$updateTime()
		// we can submit a todo now
		mat4.ortho(this.camProjection, 0, painter.w, 0, painter.h, -100, 100)
		var todo = this.todo

		// copy to turtle
		//this.$turtleStack.len = 0
		this.$writeList.length = 0

		// set up our root turtle
		var turtle = this.appTurtle
		turtle._x = 0
		turtle._y = 0
		turtle.wy = 0
		turtle.wx = 0
		turtle.ix = 0
		turtle.iy = 0
		turtle._w = turtle.width = this._w
		turtle._h = turtle.height = this._h

		this.draw()
		this.$recomputeMatrix(0,0)
	}
}