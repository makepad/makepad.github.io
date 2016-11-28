//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var mat4 = require('base/mat4')
var types = require('base/types')

var zeroMargin = [0,0,0,0]
var identityMat4 = mat4.create()

module.exports = class View extends require('base/class'){

	prototype(){
		this.mixin(
			require('base/props'),
			require('base/events'),
			require('base/tools')
		)

		this.Turtle = require('base/turtle')

		this.props = {
			visible:true,
			x:NaN,
			y:NaN,
			z:NaN,
			w:NaN,
			h:NaN,
			xOverflow:'scroll',
			yOverflow:'scroll',
			d:NaN,
			clip:true,
			xCenter:0.5,
			yCenter:0.5,
			xScale:1,
			yScale:1,
			rotate:0,
			time:0,
			hasFocus:false,
			frameId:0,
			surface:false,
			margin:[0,0,0,0],
			padding:[0,0,0,0],
			// drawPadding:undefined,
			align:[0,0],
			down:0,
			wrap:1
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.tools = {
			ScrollBar: require('stamps/scrollbar'),
			Debug:require('shaders/quad'),
			Surface:require('base/shader').extend({
				props:{
					x: NaN,
					y: NaN,
					w: NaN,
					h: NaN,
					z: 0,
					mesh:{kind:'geometry', type:types.vec2},
					colorSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
					pickSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
				},
				mesh:new painter.Mesh(types.vec2).pushQuad(0, 0, 1, 0, 0, 1, 1, 1),
				drawTrace:1,
				
				vertex(){$
					var pos = vec2(this.mesh.x * this.w, this.mesh.y * this.h) + vec2(this.x, this.y)
					return vec4(pos, 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
				},

				pixelMain(){$
					if(this.workerId < 0.){
						gl_FragColor = texture2D(this.pickSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
					else{
						gl_FragColor = texture2D(this.colorSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
				}
			})
		}

		//this.viewId = 0
		this._onVisible = 8

		this.$scrollBarSize = 8
		this.onFlag4 = this.redraw

		this.verbs = {
			draw:function(overload){
				//this.app.$viewTodoMap[this.todo.todoId] = this
				var id = overload.id
				if(id === undefined) throw new Error('Please provide a local unique ID for a view')

				var view = this.$views[id]
				if(!view){
					view = new this.NAME(this, overload)
				}
				else if(view.constructor !== this.NAME) throw new Error('View id collision detected' + id)

				// draw it here
				view.draw(this, overload)
			}
		}

		this.blending = [painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA]
		this.constantColor = undefined
		this.depthFunction =  painter.GREATER
	}

	constructor(owner, overload){
		super()
		var app = owner && owner.app
		this.app = app
		this.todo = this.$createTodo()
		// hook it
		if(app) app.$viewTodoMap[this.todo.todoId] = this

		// put in our default turtle
		this.$turtleStack = []
		this.$turtleStack.len = 0
		this.$writeList = []

		this.$renderPasses = {}

		// our matrix
		this.viewPosition = mat4.create()
		this.viewInverse = mat4.create()
		this.viewTotal = mat4.create()

		// shader tree and stamp array
		this.$shaders = {}
		//this.$stampId = 0
		this.$stamps = {}
		this.$views = {}
		this.$pickIds = {}
		this.$pickId = 1
		this.view = this
		
		this.$dirty = true

		if(overload){
			for(let key in overload){
				let value = overload[key]
				if(this.__lookupSetter__(key)){
					this['_'+key] = value
				}
				else this[key] = value
			}
		}
		if(owner){
			var id = this.id
			if(id === undefined) throw new Error('Please pass owner-unique id to view')
			if(owner.$views[id]){
				throw new Error('Owner already has view with id '+this.id)
			}
			owner.$views[id] = this

			this.todo.viewId = id
		}
	}
	
	destroy(){
		if(this.destroyed) return
		this.destroyed = true

		if(this.onDestroy) this.onDestroy()
		var children = this.children
		if(children) for(var i = 0; i < children.length; i++){
			children[i].destroy()
		}
		// clean out resources
		var todo = this.todo
		if(todo){
			this.todo = undefined
			this.app.$viewTodoMap[todo.todoId] = undefined
			todo.destroyTodo()
		}
		this.$recurDestroyShaders(this.$shaders)
		// destroy framebuffers
		for(var name in this.$renderpasses){
			var pass = this.$renderpasses[name]
			this.$renderpasses[name] = undefined
			if(pass.color0) pass.color0.destroyTexture()
			if(pass.pick) pass.pick.destroyTexture()
			if(pass.depth) pass.depth.destroyTexture()
			pass.framebuffer.destroyFramebuffer()
		}
	}

	draw(parent, overload){
		if(parent){
			parent.todo.addChildTodo(this.todo)
			this.parent = parent
			for(let key in overload){
				let value = overload[key]
				if(this.__lookupSetter__(key)){
					this['_'+key] = value
				}
				else this[key] = value
			}
		}

		this._time = this.app._time
		this._frameId = this.app._frameId

		var todo = this.todo
		if(!todo) return // init failed

		var todoUbo = todo.todoUbo

		var turtle = this.turtle = this.parent?this.parent.turtle:this.appTurtle
		
		if(!this.$dirty && 
			this.$width === turtle.width &&  
			this.$height === turtle.height){
			return
		}

		this.$width = turtle.width
		this.$height = turtle.height
		this.$order = 0.
		todo.clearTodo()

		todo.blending(this.blending, this.constantColor)
		todo.depthTest(this.depthFunction, true)
		if(!this.visible) return
		
		if(this.$scrollAtDraw){
			todo.scrollSet(this.$scrollAtDraw.x, this.$scrollAtDraw.y)
			this.$scrollAtDraw = undefined
		}
		
		if(this.app == this){
			this.painterUbo.mat4(painter.nameId('thisDOTcamPosition'), this.camPosition)
			this.painterUbo.mat4(painter.nameId('thisDOTcamProjection'), this.camProjection)
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}

		// we need to render to a texture
		/*
		if(this.surface){
			// set up a surface and start a pass
			var pass = this.beginSurface('surface', this.$w, this.$h, painter.pixelRatio, true)
			todo = this.todo
			todoUbo = todo.todoUbo
			todoUbo.mat4(painter.nameId('thisDOTviewPosition'),identityMat4)
			todoUbo.mat4(painter.nameId('thisDOTviewInverse'),this.viewInverse)
			//!TODO SOLVE THIS LATER, for a surface this changes
			//todoUbo.mat4(painter.nameId('thisDOTcamPosition'),identityMat4)
			//todoUbo.mat4(painter.nameId('thisDOTcamProjection'),pass.projection)
			todo.clearColor(0., 0., 0., 1)
		}*/

		if(this.parent){ // push us into the displacement list
			this.parent.$writeList.push(this,-1,-1)
		}

		// clear our write list
		this.$writeList.length = 0

		// set input props
		turtle._margin = this._margin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._down = this._down
		turtle._wrap = this._wrap
		turtle._x = this._x
		turtle._y = this._y
		turtle._w = this._w
		turtle._h = this._h

		this.$turtleStack.len = 0

		// lets set up a clipping rect IF we know the size
		turtle._turtleClip = [-50000,-50000,50000,50000]
			
		this.beginTurtle()
		var nt = this.turtle

		nt.$xAbs = turtle.wx + nt.margin[3]
		nt.$yAbs = turtle.wy + nt.margin[0]

		if(this.clip && !isNaN(this.turtle.width) && !isNaN(this.turtle.height)){
			this.viewClip = [0, 0, this.turtle.width, this.turtle.height]
		}
		else this.viewClip = [-50000,-50000,50000,50000]

		if(this.onDraw){
			this.onFlag = 4
			this.onDraw()
			this.onFlag = 0
		}

		this.endTurtle()

		turtle.walk(nt)

		// store computed absolute coordinates
		this.$x = turtle._x// + turtle.$xAbs
		this.$y = turtle._y// + turtle.$yAbs
		this.$w = turtle._w
		this.$h = turtle._h
		this.$vw = nt.x2 - nt.$xAbs //- turtle._margin[3]
		this.$vh = nt.y2 - nt.$yAbs //- turtle._margin[0]

		if(this.$turtleStack.len !== 0){
			console.error("Disalign detected in begin/end for turtle: "+this.name+" disalign:"+$turtleStack.len, this)
		}

		this.$drawScrollBars(this.$w, this.$h, this.$vw, this.$vh)

		// if we are a surface, end the pass and draw it to ourselves
		/*
		if(this.surface){
			this.endSurface()
			// draw using 
			this.drawSurface({
				x:0,
				y:0,
				w:this.$w,
				h:this.$h,
				colorSampler: pass.color0,
				pickSampler: pass.pick
			})
		}
		*/
		this.$dirty = false
	}

	$drawScrollBars(wx, wy, vx, vy){
		// store the draw width and height for layout if needed
		var tw = wx//this.$wDraw = turtle._w
		var th = wy//this.$hDraw = turtle._h
		
		this.$x2Old = vx
		this.$y2Old = vy//ty2
		var xOverflow = this.xOverflow
		var yOverflow = this.yOverflow
		var addHor, addVer
		// lets compute if we need scrollbars
		if(vy > th){
			addVer = true
			if(xOverflow === 'scroll') tw -= this.$scrollBarSize
			if(vx > tw) th -= this.$scrollBarSize, addHor=true // add vert scrollbar
		}
		else if(vx > tw){
			addHor = true
			if(yOverflow === 'scroll') th -= this.$scrollBarSize
			if(vy > th) tw -= this.$scrollBarSize, addVer = true
		}

		// view heights for scrolling on the todo
		var todo = this.todo

		todo.scrollMask = 0
		todo.xTotal = vx
		todo.xView = tw
		todo.yTotal = vy
		todo.yView = th
		todo.scrollMomentum = 0.92
		todo.scrollToSpeed = 0.5
		todo.scrollMinSize = this.ScrollBar.prototype.ScrollBar.prototype.scrollMinSize

		if(xOverflow === 'scroll'){
			if(addHor){//th < this.$hDraw){
				this.$xScroll = this.drawScrollBar({
					id:'hscroll',
					moveScroll:0,
					vertical:false,
					x:0,
					y:wy - this.$scrollBarSize,//-this.padding[0],// / painter.pixelRatio,
					w:tw,
					h:this.$scrollBarSize,// / painter.pixelRatio,
				})
				this.todo.xScrollId = this.$xScroll.$pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.xScroll > 0){
				todo.scrollTo(0,undefined)
			}
		}
		if(yOverflow === 'scroll'){
			if(addVer){//tw < this.$wDraw){ // we need a vertical scrollbar
				this.$yScroll = this.drawScrollBar({
					id:'vscroll',
					moveScroll:0,
					vertical:true,
					x:wx - this.$scrollBarSize,//-this.padding[3], /// painter.pixelRatio,
					y:0,
					w:this.$scrollBarSize,// / painter.pixelRatio,
					h:th,
				})
				this.todo.yScrollId = this.$yScroll.$pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.yScroll > 0){
				todo.scrollTo(undefined,0)
			}
		}		
	}

	$createTodo(){
		var todo = new painter.Todo()

		var todoUboDef = this.Surface.prototype.$compileInfo.uboDefs.todo
		
		todo.todoUbo = new painter.Ubo(todoUboDef)//this.$todoUboDef)
		todo.view = this
		return todo
	}

	findInstances(cons, set){
		if(!set) set = []
		if(this instanceof cons) set.push(this)
		var $views = this.$views
		for(let key in $views){
			$views[key].findInstances(cons, set)
		}
		return set
	}

	// breadth first find child by name
	find(id){
		var $views = this.$views
		if(id.constructor === RegExp){
			for(let key in $views)	{
				if(key.match(id)) return $views[key]
			}
		}
		else{
			for(let key in $views)	{
				if(key.id === id) return  $views[key]
			}
		}
		for(let key in $views)	{
			let res = $views[key].find(id)
			if(res) return res
		}
	}

	// depth first find all
	findAll(id, set){
		var $views = this.$views
		if(!set) set = []
		if(id.constructor === RegExp){
			if(this.id && this.id.match(id)) set.push(this)
		}
		else{
			if(this.id == id) set.push(this)
		}
		for(let key in $views)	{
			let child = $views[key]
			child.findAll(id, set)
		}
		return set
	}

	onComposeDestroy(){
		// remove entry
		this.destroy()
	}

	beginSurface(name, w, h, pixelRatio, hasPick, hasZBuf, colorType){
		if(w === undefined) w = this.$w
		if(h === undefined) h = this.$h
		if(isNaN(w)) w = 1
		if(isNaN(h)) h = 1

		var sw = w * pixelRatio
		var sh = h * pixelRatio

		// and the todo is forked out
		var pass = this.$renderPasses[name] 

		if(!pass){ // initialize the buffers for the pass
			pass = this.$renderPasses[name] = {}
			pass.color0 = new painter.Texture(painter.RGBA, colorType || painter.UNSIGNED_BYTE, 0, 0, 0)
			if(hasPick) pass.pick = new painter.Texture(painter.RGBA, painter.UNSIGNED_BYTE, 0, 0, 0)
			if(hasZBuf) pass.depth = new painter.Texture(painter.DEPTH, painter.UNSIGNER_SHORT, 0, 0, 0)
			pass.framebuffer = new painter.Framebuffer(sw, sh,{
				color0:pass.color0,
				pick:pass.pick,
				depth:pass.depth,
			}, this.$xAbs, this.$yAbs)
			pass.todo = this.$createTodo()
			// store the view reference
			this.app.$viewTodoMap[pass.todo.todoId] = this

			pass.todo.viewId = 'surface-' + (this.id || this.constructor.name)
			pass.projection = mat4.create()
			pass.w = w
			pass.h = h
			mat4.ortho(pass.projection, 0, pass.w, 0, pass.h, -100, 100)
			// assign the todo to the framebuffe
			pass.framebuffer.assignTodoAndUbo(pass.todo, this.app.painterUbo)
		}

		// swap out our todo object
		if(!this.$todoStack) this.$todoStack = []
		this.$todoStack.push(this.todo)
		this.todo = pass.todo
		// clear it
		this.todo.clearTodo()

		// see if we need to resize buffers
		if(pass.sw !== sw || pass.sh !== sh || pass.sx !== this.$xAbs || pass.sy !== this.$yAbs){
			pass.framebuffer.resize(sw, sh, this.$xAbs, this.$yAbs)
			pass.sx = this.$xAbs
			pass.sy = this.$yAbs
			pass.w = w
			pass.h = h
			pass.sw = sw
			pass.sh = sh
			mat4.ortho(pass.projection,0, pass.w,  0,pass.h, -100, 100)
		}

		return pass
	}
	
	endSurface(){
		// stop the pass and restore our todo
		this.todo = this.$todoStack.pop()
	}

	transferFingerMove(digit, pickId){
		this.app.transferFingerMove(digit, this.todo.todoId, pickId)
	}

	scrollIntoView(x, y, w, h){
		// we figure out the scroll-to we need
		var todo = this.todo
		var sx = todo.xScroll, sy = todo.yScroll
		if(x < todo.xScroll) sx = Math.max(0., x)
		if(x+w > todo.xScroll + todo.xView) sx = Math.max(0.,Math.min(x + w - todo.xView, todo.xTotal - todo.xView))
		if(y < todo.yScroll) sy = Math.max(0., y)
		if(y+h > todo.yScroll + todo.yView) sy = Math.max(0.,Math.min(y + h - todo.yView, todo.yTotal - todo.yView))
		this.todo.scrollTo(sx, sy)
	}

	$recomputeMatrix(){
		var hw = this.$w * this.xCenter
		var hh = this.$h * this.yCenter
		mat4.fromTSRT(this.viewPosition, -hw, -hh, 0, this.xScale, this.yScale, 1., 0, 0, radians(this.rotate), hw + this.$x, hh+this.$y, 0)

		if(this.parent){
			mat4.multiply(this.viewTotal, this.parent.viewPosition, this.viewPosition)
			mat4.invert(this.viewInverse, this.viewTotal)
			if(!this.parent.surface){
				mat4.multiply(this.viewPosition, this.parent.viewPosition, this.viewPosition)
			}
		}

		var todo = this.todo
		this.todo.xsScroll = this.$x + painter.x
		this.todo.ysScroll = this.$y + painter.y

		// lets set some globals
		var todoUbo = todo.todoUbo
		todoUbo.mat4(painter.nameId('thisDOTviewPosition'), this.viewPosition)
		todoUbo.mat4(painter.nameId('thisDOTviewInverse'),this.viewInverse)

		var children = todo.children
		var todoIds = todo.todoIds
		for(var i = 0, l = children.length; i < l; i++){
			var view = todoIds[children[i]].view
			view.$recomputeMatrix()
		}
	}

	$allocStamp(args, classname){
		var turtle = this.turtle
		var id = args.id
		if(id === undefined) throw new Error("Please provide a locally unique id to a stamp")
		var stamp = this.$stamps[id]
		if(!stamp){
			stamp = this.$stamps[id] = new this[classname]()
			var pickId = this.$pickId++
			this.$pickIds[pickId] = stamp
			stamp.view = this
			stamp.$pickId = pickId
		}
		else if(stamp.constructor !== this[classname]){
			console.error("Stamp ID reused for different class!")
		}
		else if(stamp.$frameId == this._frameId){
			console.error("Please provide a unique id to each stamp")
		}
		stamp.$frameId = this._frameId

		var group = args.group
		if(group){
			var l = group + classname
			stamp.group = group
			stamp.$shaders = this.$shaders[l]
			if(!stamp.$shaders) stamp.$shaders = (this.$shaders[l] = {})
		}
		else{
			stamp.$shaders = this.$shaders[classname]
			if(!stamp.$shaders) stamp.$shaders = (this.$shaders[classname] = {})
		}
		stamp.turtle = turtle

		return stamp
	}


	scrollAtDraw(dx, dy, delta){
		this.$scrollAtDraw = {
			x:delta?this.todo.xScroll+(dx||0):(dx||0),
			y:delta?this.todo.yScroll+(dy||0):(dy||0)
		}
		this.redraw()
	}

	onKeyDown(e){
		var name = e.name
		if(!name) return console.error("Strange", e)
		var prefix = ''
		var evname = 'onKey' + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]){
			if(!this[evname](e)){
				return true
			}
		}
	}

	scrollSize(x2, y2, x1, y1){
		var turtle = this.turtle
		if(x2 > turtle.x2) turtle.x2 = x2
		if(y2 > turtle.y2) turtle.y2 = y2
		if(x1 < turtle.x1) turtle.x1 = x1
		if(y1 < turtle.y1) turtle.y1 = y1
	}

	reuseDrawSize(){
		this.turtle.x2 = this.$x2Old
		this.turtle.y2 = this.$y2Old
	}

	$dirtyTrue(){
		var node = this
		while(node){//}] && node.$drawClean){
			node.$dirty = true
			node = node.parent
		}
	}

	// how do we incrementally redraw?
	redraw(){
		//if(this.$drawClean){
		this.$dirtyTrue()
		if(this.app && !this.app.redrawTimer){
			this.app.redrawTimer = setImmediate(function(){
				this.$redrawViews()
				this.redrawTimer = undefined
			}.bind(this.app),0)
		}
		//}
	}

	setFocus(){
		var old = this.app.focusView
		//this.app.setWorkerKeyboardFocus()
		if(old !== this){
			this.app.focusView = this
			if(old) old.hasFocus = false
			this.hasFocus = true
			if(this.app.onFocusChange) this.app.onFocusChange(this, old)
		}
	}

	clearFocus(){
		var old = this.app.focusView		
		this.app.focusView = undefined
		if(old){
			old.hasFocus = false
		}
		if(this.app.onFocusChange) this.app.onFocusChange(undefined, old)
	}

	animateUniform(value){
		var timeMax = value[0] + value[1]
		if(timeMax > this.todo.timeMax) this.todo.timeMax = timeMax
	}

	static style(StyleClass){
		return StyleClass.apply(this)
	}
}