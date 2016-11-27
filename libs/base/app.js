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
		
		var painterUboDef = app.Surface.prototype.$compileInfo.uboDefs.painter
		app.painterUbo = new painter.Ubo(painterUboDef)

		app._frameId = 0

		function fingerMessage(event, todoId, pickId, orig, isOut){
			var view = viewTodoMap[todoId]
			if(!view) return
			var xyLocal = [0,0,0,0]
			let msg = Object.create(orig)
			msg.x -= painter.x
			msg.y -= painter.y
			vec4.transformMat4(xyLocal, [msg.x, msg.y, 0, 1.], view.viewInverse)
			msg.xAbs = msg.x
			msg.yAbs = msg.y
			msg.xLocal = xyLocal[0]
			msg.yLocal = xyLocal[1]
			msg.x = msg.xView = xyLocal[0] + (view.todo.xScroll || 0)
			msg.y = msg.yView = xyLocal[1] + (view.todo.yScroll || 0)
			if(view[event]) view[event](msg)

			// lets find the right cursor
			var stamp = view.$pickIds[pickId]
			if(stamp){
				let msg2 = Object.create(msg)
				msg2.x = msg.xLocal - stamp.$x
				msg2.y = msg.yLocal - stamp.$y
				if(stamp.moveScroll){
					msg2.x += view.todo.xScroll || 0
					msg2.y += view.todo.yScroll || 0
				}
				if(stamp[event]) stamp[event](msg2)
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

	/*
	$composeTree(node, oldChildren){
		// it calls compose recursively
		if(node.onCompose){
			node.onFlag = 16
			node.children = node.onCompose()
			node.onFlag = 0
		}

		if(!Array.isArray(node.children)){
			node.children = node.children?[node.children]:[]
		}

		var children = node.children
		
		if(!node.initialized){
			node.initialized = true
			if(node._onInit) node._onInit()
			if(node.onInit) node.onInit()
		}	

		var $inwards = node.$inwards
		for(let inw in $inwards){
			var config = $inwards[inw]
			var child = node.find(config.inward)
			if(!child){
				console.error('Cannot find inward target '+config.inward )
				continue
			}
			if(!child.$outwards) child.$outwards = {}
			child.$outwards[config.prop] = {
				obj:node,
				key:inw
			} 
			child['_on'+config.prop] |= 2
			child['_'+config.prop] = node['_'+inw]
		}

		for(let i = 0; i < children.length; i++){
			var child = children[i]
			child.parent = node
			child.app = node.app
			child.store = node.store
			var oldchild = oldChildren && oldChildren[i]
			this.$composeTree(child, oldchild && oldchild.children)
		}

		if(oldChildren) for(;i < oldChildren.length; i++){
			var oldchild = oldChildren[i]
			if(oldchild.onComposeDestroy) oldchild.onComposeDestroy()
		}
		if(node.onAfterCompose) node.onAfterCompose()
	}
	*/
	/*
	proto.$generateViewIds = function(){
		var viewId = 1
		var map = this.$views
		map.length = 1

		var iter = this
		while(iter){
			map[viewId] = iter
			iter.pickIdHi = viewId++
			// depth first recursion free walk
			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
				//else we hopped up to parent
			}
			iter = next
		}
	}*/

	// relayout the viewtree
	/*
	$relayoutViews(){
		var iter = this
		var layout = this.$turtleLayout

		// reset the write list
		layout.$writeList.length = 0
		layout.$turtleStack.len = 0
		//layout.view = layout

		iter._x = 0
		iter._y = 0
		iter._w = painter.w
		iter._h = painter.h

		var turtle = layout.turtle
		while(iter){
			var turtle = layout.turtle


			// copy the props from the iterator node to the turtle
			turtle._x = iter._x
			turtle._y = iter._y

			if(iter.$drawDepLayout){
				iter.$drawDepLayout = false
				turtle._w = iter.$wDraw
				turtle._h = iter.$hDraw
			}
			else{
				turtle._w = iter._w
				turtle._h = iter._h
			}
			turtle._margin = iter._margin
			turtle._padding = iter._padding
			turtle._align = iter._align
			turtle._down = iter._down
			turtle._wrap = iter._wrap

			//var level = layout.$turtleStack.len - ((
			//	typeof turtle._x === "number" && !isNaN(turtle._x) || typeof turtle._x === "string" || 
			//	typeof turtle._y === "number" && !isNaN(turtle._y) || typeof turtle._y === "string"
			//)?-1:0)

			layout.$writeList.push(iter)
			iter.onFlag = 8
			layout.beginTurtle(iter)
			turtle = layout.turtle
			// define width/height for any expressions depending on it
			iter.$wInside = turtle.width 
			iter.$hInside = turtle.height
			iter.$wLast = iter.$w
			iter.$hLast = iter.$h
			//iter.$xLast = iter.$xAbs
			//iter.$yLast = iter.$yAbs
			iter.$w = turtle.width + turtle.padding[3] + turtle.padding[1]
			iter.$h = turtle.height+ turtle.padding[0] + turtle.padding[2]
			// depth first recursion free walk
			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var view = turtle.context
				
				var ot = layout.endTurtle()
				view.onFlag = 0

				turtle = layout.turtle
		
				turtle.walk(ot)
				
				// copy the layout from the turtle to the view
				view.$xAbs = turtle._x 
				view.$yAbs = turtle._y 
				view.$w = turtle._w
				view.$h = turtle._h
				if(view.$w !== view.$wLast || view.$h !== view.$hLast){
					view.$drawCleanFalse()
				}

				// treewalk
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
			}
			iter = next
		}

		// compute relative positions
		var iter = this
		iter.$x = 0
		iter.$y = 0
		while(iter){
			if(iter.parent){
				iter.$x = iter.$xAbs - iter.parent.$xAbs
				iter.$y = iter.$yAbs - iter.parent.$yAbs
			}			

			if(iter.$x !== iter.$xLast || iter.$yAbs !== iter.$yLast || iter.$w !== iter.$wLast && iter.xCenter || iter.$h !== iter.$hLast && iter.yCenter){
				iter.$xLast = iter.$x
				iter.$yLast = iter.$y
				iter.$recomputeMatrix()
			}

			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
			}
			iter = next
		}
	}*/

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
		turtle.$xAbs = 0
		turtle.$yAbs = 0
		turtle._x = 0
		turtle._y = 0
		turtle.wy = 0
		turtle.wx = 0
		turtle.ix = 0
		turtle.iy = 0
		turtle._w = turtle.width = this._w
		turtle._h = turtle.height = this._h

		this.$redrawView()
		this.$recomputeMatrix()
	}
}