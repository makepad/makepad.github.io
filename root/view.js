//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')

module.exports = require('class').extend(function View(proto){

	require('props')(proto)
	require('events')(proto)
	require('tools')(proto)

	proto.Turtle = require('turtle')
	
	var View = proto.constructor

	// lets define some props
	proto.props = {
		x:NaN,
		y:NaN,
		z:NaN,
		w:NaN,
		h:NaN,
		d:NaN,
		cenX:0.5,
		cenY:0.5,
		scaleX:1,
		scaleY:1,
		rotate:0,
		time:0,
		frameId:0,
		surface:false,
		margin:[0,0,0,0],
		padding:[0,0,0,0],
		align:[0,0],
		wrap:true		
	}

	proto.viewId = 0

	proto._onConstruct = function(){
		// lets process the args and construct things
		// lets create a todo
		this.todo = new painter.Todo()
		this.turtle = new this.Turtle(this)
		// our matrix
		this.viewPosition = mat4.create()

		// stuff needed for the drawing
		this.$turtleStack = [
			this.turtle
		]
		// the buffer writelist for nested turtle layout
		this.$writeList = []

		// the turtlestack. Its turtles all the way down
		this.$turtleStack.len = 0

		// shader tree and stamp array
		this.$shaders = {}
		this.$stampId = 0
		this.$stamps = [0]

		this.turtle._x = 0
		this.turtle._y = 0
		this.turtle._margin = this._margin
		this.turtle._padding = this._padding

		this.view = this

		var children = this.children = this.constructorChildren = []
		for(i = 0; i < arguments.length; i++){
			var value = arguments[i]
			if(typeof value === 'object' && value.constructor === Object){
				for(var key in value){
					this[key] = value[key]
				}
			}
			else if(value instanceof View){
				children.push(value)
			}
		}
	}

	proto._onDestroy = function(){
		// destroy the todo
		this.todo.destroyTodo()
		this.todo = undefined
	}

	proto.recompose = function(){
	}

	// how do we incrementally redraw?
	proto.redraw = function(){
		this.$drawClean = false
		if(!this.app.redrawTimer){
			this.app.redrawTimer = setTimeout(function(){
				this.redrawTimer = undefined
				this.$redrawApp()
			}.bind(this.app),0)
		}
	}

	proto.relayout = function(){
		this.app.$layoutClean = false
		this.redraw()
	}

	proto.onFlag1 = proto.recompose
	proto.onFlag2 = proto.redraw
	proto.onFlag4 = proto.relayout

	proto.onDrawChildren = function(){
		var todo = this.todo
		var children = this.children
		for(var i = 0; i < children.length; i++){
			child = children[i]
			todo.addChildTodo(child.todo)
			child.$redrawView()
		}
	}

	var zeroMargin = [0,0,0,0]
	proto.$redrawView = function(){		
		this._time = this.app._time
		this._frameId = this.app._frameId
		this.$writeList.length = 0

		// update the matrix?
		if(!this.$matrixClean){
			this.$matrixClean = true
			var hw = this.$w * this.cenX
			var hh = this.$h * this.cenY
			mat4.fromTSRT(this.viewPosition, -hw, -hh, 0, this.scaleX, this.scaleY, 1., 0, 0, this.rotate, hw + this.$x, hh+this.$y, 0)
		}

		// begin a new todo stack
		var todo = this.todo
		todo.clearTodo()
		
		// lets set some globals
		todo.mat4Global(painter.nameId('this_DOT_viewPosition'), this.viewPosition)

		if(this.app == this){
			todo.mat4Global(painter.nameId('this_DOT_camPosition'), this.camPosition)
			todo.mat4Global(painter.nameId('this_DOT_camProjection'), this.camProjection)
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}

		// store time info on todo
		todo.self.timeStart = this._time
		todo.self.timeMax = 0

		// begin a new turtle with the views' layout settings
		var turtle = this.turtle
		turtle._margin = zeroMargin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._wrap = this._wrap
		turtle._w = this.$w
		turtle._h = this.$h

		this.$stampId = 1

		this.beginTurtle()

		if(this.onDraw){
			this.onFlag = 2
			this.onDraw()
			this.onFlag = 0
		}

		this.onDrawChildren()

		this.endTurtle()
		this.$wDraw = turtle._w
		this.$hDraw = turtle._h
	}
})