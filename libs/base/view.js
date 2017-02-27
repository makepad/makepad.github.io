//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var mat4 = require('base/mat4')
var vec4 = require('base/vec4')
var types = require('base/types')

var zeroMargin = [0,0,0,0]
var identityMat4 = mat4.create()
var debug = 0
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
			ScrollBar: require('stamps/scrollbar').extend({
				order:99
			}),
			Debug:require('shaders/quad'),
			Pass:require('shaders/quad').extend({
				props:{
					colorSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
					pickSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
				},
				verbs:{
					begin:null,
					end:null,					
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
		this.$scrollBarBg = '#0000'
		this.onFlag4 = this.redraw

		this.verbs = {

			draw:function(overload){
				var id = overload.id
				var view = this.$views[id]
				if(!view){
					view = new this.NAME(this, overload)
				}
				else if(view.constructor !== this.NAME) throw new Error('View id collision detected' + id)
				view.draw(this, overload)
			}
		}

		this.blending = [painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA]
		this.constantColor = undefined
		this.depthFunction =  painter.GREATER
	}

	constructor(owner, overload){
		super()
		if(arguments.length !== 0 && arguments.length !== 2) throw new Error("Please pass (owner, {overload}) to a view constructor")
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
		this.$dirty_check = {}
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
		this.viewClip = [-50000,-50000,50000,50000]
		this.$dirty = true
		this.onFlag4 = undefined
		if(overload){
			for(let key in overload){
				let value = overload[key]
				//if(this.__lookupSetter__(key)){
				//	this['_'+key] = value
				//}
				//else 
				this[key] = value
			}
		}
		this.onFlag4 = this.redraw
		if(owner){
			this.owner = owner
			var id = this.id
			//if(id === undefined) throw new Error('Please pass owner-unique id to view')
			if(owner.$views[id]){
				throw new Error('Owner already has view with id '+this.id)
			}
			owner.$views[id] = this
			this.store = owner.store
			this.todo.viewId = id
		}
		this.initialized = true
	}
	
	destroy(){
		if(this.destroyed) return
		this.destroyed = true

		if(this.onDestroy) this.onDestroy()
		// destroy child views
		var $views = this.$views
		for(let key in $views){
			$views[key].destroy()
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
		// remove it
		if(this.owner) delete this.owner.$views[this.id]
	}

	onCompileVerbs(){
		this.__initproto__()
	}

	onFingerDown(){
		this.setFocus()
	}

	draw(parent, overload){
		if(parent){
			this.parent = parent
			this.onFlag4 = undefined
			for(let key in overload){
				let value = overload[key]
				//let set = this.__lookupSetter__(key)
				//if(set){
				//	this[set._key] = value
				//	if(this[set._onkey]&4) this.$dirty = true
				//}
				//else
				this[key] = value
			}
			this.onFlag4 = this.redraw
			parent.todo.beginOrder(this.order)
			parent.todo.addChildTodo(this.todo)
			parent.todo.endOrder()
		}

		this._time = this.app._time
		this._frameId = this.app._frameId

		var todo = this.todo
		if(!todo) return // init failed

		var todoUbo = todo.todoUbo

		var turtle = this.turtle = this.parent?this.parent.turtle:this.appTurtle
		
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
		//console.log(turtle.$writeStart)
		// do a dirty check against turtle state to skip drawing
		let $dirty = this.$dirty_check
		if(!this.$dirty && 
			$dirty.width === turtle.width &&  
			$dirty.height === turtle.height &&
			$dirty.w === this._w &&  
			$dirty.h === this._h &&
			$dirty.wx === turtle.wx &&
			$dirty.wy === turtle.wy){
			// lets just walk the turtle
			turtle._w = this.$w
			turtle._h = this.$h
			turtle.walk()
			return
		}
		$dirty.w = this._w
		$dirty.h = this._h
		$dirty.wx = turtle.wx
		$dirty.wy = turtle.wy
		$dirty.width = turtle.width
		$dirty.height = turtle.height

		this._order = 0.
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
			var pass = this.beginPass('surface', this.$w, this.$h, painter.pixelRatio, true)
			todo = this.todo
			todoUbo = todo.todoUbo
			//todoUbo.mat4(painter.nameId('thisDOTviewPosition'),identityMat4)
			//todoUbo.mat4(painter.nameId('thisDOTviewInverse'),this.viewInverse)
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

		turtle._order = 0
		turtle._turtleClip = [-50000,-50000,50000,50000]

		this.$turtleStack.len = 0

		//console.log(this.turtle.wx)
		var owx = turtle.wx
		var owy = turtle.wy
		// conceptual error!.
		this.beginTurtle()

		var nt = this.turtle
		// make turtle relatively positioned
		nt.wx -= turtle.wx
		nt.wy -= turtle.wy
		nt.sx -= turtle.wx
		nt.sy -= turtle.wy

		var viewClip = this.viewClip
		viewClip[0] = -50000
		viewClip[1] = -50000
		viewClip[2] = 50000
		viewClip[3] = 50000

		if(this.clip){
			let pad = nt.padding
			if(!isNaN(this.turtle.width)){
				viewClip[0] = pad[3]
				viewClip[2] = this.turtle.width+pad[3]
			}
			if(!isNaN(this.turtle.height)){
				viewClip[1] = pad[0]
				viewClip[3] = this.turtle.height+pad[0]
			}
		}
		
		this.$dirty = false

		if(this.onDraw){
			this.onFlag = 4
			this.onDraw()
			this.onFlag = 0
		}
		
	
		// we need to walk the turtle.
		this.$w = nt.wBound()
		this.$h = nt.hBound()
		this.$vw = nt.x2// - nt.$xAbs //- turtle._margin[3]
		this.$vh = nt.y2// - nt.$yAbs //- turtle._margin[0]
		this.$xReuse = nt.x2
		this.$yReuse = nt.y2

		// draw our scrollbars
		this.$drawScrollBars(this.$w, this.$h, this.$vw, this.$vh)

		this.endTurtle()
		// here we walk the turtle, but somehow it moves the other crap

		turtle.walk(nt, true)

		// store computed absolute coordinates
		this.$rx = turtle._x //+ turtle.$xAbs
		this.$ry = turtle._y//+ turtle.$yAbs

		if(this.$turtleStack.len !== 0){
			console.error("Disalign detected in begin/end for turtle: "+this.name+" disalign:"+$turtleStack.len, this)
		}

		// if we are a surface, end the pass and draw it to ourselves
		/*
		if(this.surface){
			this.endPass()
			// draw using 
			this.drawPass({
				x:'0',
				y:'0',
				w:this.$w,
				h:this.$h,
				colorSampler: pass.color0,
				pickSampler: pass.pick
			})
		}*/
	}

	$drawScrollBars(wx, wy, vx, vy){
		// store the draw width and height for layout if needed
		var tw = wx//this.$wDraw = turtle._w
		var th = wy//this.$hDraw = turtle._h
		
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
		let xScroll = todo.xScroll
		let yScroll = todo.yScroll
		if(xOverflow === 'scroll'){
			if(addHor){//th < this.$hDraw){
				this.lineBreak()
				this.$xScroll = this.drawScrollBar({
					id:'hscroll',
					pickId:65534,
					moveScroll:0,
					vertical:false,
					x:'0',
					y:'@0',
					w:'100%',
					h:this.$scrollBarSize,// / painter.pixelRatio,
				})
				this.todo.xScrollId = this.$xScroll.$pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.xScroll > 0){
				todo.scrollTo(0,undefined,-1)
			}
			// lets clamp our scroll positions
			xScroll = clamp(xScroll,0,max(0,todo.xTotal - todo.xView))
		}
		if(yOverflow === 'scroll'){
			if(addVer){//tw < this.$wDraw){ // we need a vertical scrollbar
				this.$yScroll = this.drawScrollBar({
					id:'vscroll',
					pickId:65535,
					moveScroll:0,
					vertical:true,
					x:'@0',
					y:'0',
					w:this.$scrollBarSize,// / painter.pixelRatio,
					h:'100%',
				})
				this.todo.yScrollId = this.$yScroll.$pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.yScroll > 0){
				todo.scrollTo(undefined,0,-1)
			}
			yScroll = clamp(yScroll,0,max(0,todo.yTotal - todo.yView))
		}
		if(xScroll !== todo.xScroll || yScroll !== todo.yScroll){
			todo.scrollTo(xScroll, yScroll, -1)
		}
	}

	isScrollBar(pickId){
		if(this.$xScroll && this.$xScroll.$pickId === pickId) return true
		if(this.$yScroll && this.$yScroll.$pickId === pickId) return true
		return false
	}


	$createTodo(){
		var todo = new painter.Todo()

		var todoUboDef = this.Pass.prototype.$compileInfo.uboDefs.todo
		
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
				if(key === id) return  $views[key]
			}
		}
		for(let key in $views)	{
			let res = $views[key].find(id)
			if(res) return res
		}
	}

	// depth first find all
	findAll(id, set){
		if(!set) set = []
		if(id.constructor === RegExp){
			if(this.id && this.id.match(id)) set.push(this)
		}
		else{
			if(this.id == id) set.push(this)
		}
		var $views = this.$views
		for(let key in $views)	{
			let child = $views[key]
			child.findAll(id, set)
		}
		return set
	}

	toLocal(msg, noScroll){
		var xy = [0,0,0,0]
		vec4.transformMat4(xy, [msg.x, msg.y, 0, 1.], this.viewInverse)
		return {
			x:xy[0] + (noScroll?0:(this.todo.xScroll || 0)),
			y:xy[1] + (noScroll?0:(this.todo.yScroll || 0))
		}
	}

	onComposeDestroy(){
		// remove entry
		this.destroy()
	}

	beginPass(options){
		let w = options.w
		let h = options.h

		if(typeof w === 'string'){
			this.turtle._margin = zeroMargin
			w = this.turtle.evalw(w, this)
		}
		if(typeof h === 'string'){
			this.turtle._margin = zeroMargin
			h = this.turtle.evalh(h, this)
		}
		if(w === undefined) w = this.$w
		if(h === undefined) h = this.$h
		if(isNaN(w)) w = 1
		if(isNaN(h)) h = 1
		let pixelRatio = options.pixelRatio || painter.pixelRatio
		
		var sw = w * pixelRatio
		var sh = h * pixelRatio

		let id = options.id
		// and the todo is forked out
		var pass = this.$renderPasses[id] 

		if(!pass){ // initialize the buffers for the pass
			pass = this.$renderPasses[id] = {}
			pass.color0 = new painter.Texture({
				format:painter.RGBA, 
				type:options.colorType || painter.UNSIGNED_BYTE, 
				flags:0, 
				w:0, 
				h:0
			})
			if(options.pick) pass.pick = new painter.Texture({
				format:painter.RGBA, 
				type:painter.UNSIGNED_BYTE, 
				flags:0, 
				w:0, 
				h:0
			})
			if(options.depth) pass.depth = new painter.Texture({
				format:painter.DEPTH, 
				type:painter.UNSIGNER_SHORT, 
				flags:0, 
				w:0, 
				h:0
			})
			pass.framebuffer = new painter.Framebuffer(sw, sh,{
				color0:pass.color0,
				pick:pass.pick,
				depth:pass.depth,
			})
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

			if(options.dx !== undefined || options.dy !== undefined){
				let pp = this.$positionedPasses
				if(!pp) this.$positionedPasses = pp = []
				pp.push(pass)	
			}
		}

		// swap out our todo object
		if(!this.$todoStack) this.$todoStack = []
		this.$todoStack.push(this.todo)
		this.todo = pass.todo
		// clear it
		this.todo.clearTodo()

		// see if we need to resize buffers
		if(pass.sw !== sw || pass.sh !== sh){
			pass.framebuffer.resize(sw, sh)
			//pass.sx = this.$xAbs
			//pass.sy = this.$yAbs
			pass.w = w
			pass.h = h
			pass.sw = sw
			pass.sh = sh
			mat4.ortho(pass.projection,0, pass.w,  0,pass.h, -100, 100)
		}
		pass.dx = options.dx || 0
		pass.dy = options.dy || 0
		return pass
	}
	
	endPass(){
		// stop the pass and restore our todo
		this.todo = this.$todoStack.pop()
	}

	transferFingerMove(digit, stamp){
		this.app.transferFingerMove(digit, this.todo.todoId, typeof stamp === 'object'?stamp.$pickId:stamp)
	}

	scrollIntoView(x, y, w, h,scrollToSpeed){
		// we figure out the scroll-to we need
		var todo = this.todo
		var sx = todo.xScroll, sy = todo.yScroll
		if(x < todo.xScroll) sx = max(0., x)
		if(x+w > todo.xScroll + todo.xView) sx = clamp(0.,x + w - todo.xView, todo.xTotal - todo.xView)
		if(y < todo.yScroll) sy = max(0., y)
		if(y+h > todo.yScroll + todo.yView) sy = clamp(0.,y + h - todo.yView, todo.yTotal - todo.yView)
		this.todo.scrollTo(sx, sy,scrollToSpeed)
	}

	scrollTo(x, y, scrollToSpeed){
		this.todo.scrollTo(x,y,scrollToSpeed)
	}

	scrollMode(scrollMode){
		this.todo.scrollMode = scrollMode
	}

	scrollArea(x,y,w,h){
		this.todo.xVisible = x
		this.todo.yVisible = y
		this.todo.wVisible = w
		this.todo.hVisible = h
	}

	$recomputeMatrix(px, py){
		var hw = this.$w * this.xCenter
		var hh = this.$h * this.yCenter
		let rx = this.$rx// - px
		let ry = this.$ry// - py
		let x = this.$x = rx + px
		let y = this.$y = ry + py
		
		mat4.fromTSRT(this.viewPosition, -hw, -hh, 0, this.xScale, this.yScale, 1., 0, 0, radians(this.rotate), hw + rx, hh+ry, 0)

		if(this.parent){
			mat4.multiply(this.viewTotal, this.parent.viewPosition, this.viewPosition)
			mat4.invert(this.viewInverse, this.viewTotal)
			if(!this.parent.surface){
				mat4.multiply(this.viewPosition, this.parent.viewPosition, this.viewPosition)
			}
		}

		var todo = this.todo
		if(!todo) return
		this.todo.xsScroll = x + painter.x 
		this.todo.ysScroll = y + painter.y 
		//console.log(painter.y)
		let pp =this.$positionedPasses
		if(pp){
			for(let i = 0 ;i < pp.length;i++){
				pp[i].framebuffer.position(x+painter.x + pp[i].dx, y+painter.y + pp[i].dy)
			}
		}
		// lets set some globals
		var todoUbo = todo.todoUbo
		todoUbo.mat4(painter.nameId('thisDOTviewPosition'), this.viewPosition)
		todoUbo.mat4(painter.nameId('thisDOTviewInverse'), this.viewInverse)

		var children = todo.children
		var todoIds = todo.todoIds
		for(var i = 0, l = children.length; i < l; i++){
			var view = todoIds[children[i]].view
			view.$recomputeMatrix(x, y)
		}
	}

	$allocStamp(args, classname, context){
		var turtle = context.turtle
		var id = args.id
		if(id === undefined) throw new Error("Please provide a view unique id to a stamp")
		var stamp = this.$stamps[id]
		if(!stamp){
			stamp = this.$stamps[id] = new context[classname](args)
			var pickId = args.pickId || ++this.$pickId
			//console.log('allocating', id, classname, pickId)
			this.$pickIds[pickId] = stamp
			stamp.view = this
			var name = context.$context?context.$context + '_' + classname:classname
			stamp.$context = name
			stamp.$pickId = pickId
			stamp.$shaders = this.$shaders[name]
			let ctxorder = context._order
			if(ctxorder && !stamp._order) stamp._order = ctxorder
			if(!stamp.$shaders) stamp.$shaders = (this.$shaders[name] = {})
		}
		else if(stamp.constructor !== context[classname]){
			console.error("Stamp ID reused for different class!")
		}
		else if(stamp.$frameId == this._frameId){
			console.error("Please provide a unique id to each stamp")
		}
		stamp.$frameId = this._frameId
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
		this.turtle.x2 = this.$xReuse
		this.turtle.y2 = this.$yReuse
	}

	// how do we incrementally redraw?
	redraw(force){
		//if(debug++<100)console.error("REDRAW")
		var node = this
		while(node){
			node.$dirty = true
			node = node.parent
		}
		let app = this.app
		if(app && !app.redrawTimer && (app.redrawTimer === undefined || force)){
			if(app.redrawTimer === null){ // make sure we dont flood the main thread
				app.redrawTimer = setTimeout(function(){
					this.redrawTimer = null
					this.$redrawViews()
					if(this.redrawTimer === null) this.redrawTimer = undefined
				}.bind(app),16)
			}
			else{
				app.redrawTimer = setImmediate(function(){
					this.redrawTimer = null
					this.$redrawViews()
					if(this.redrawTimer === null) this.redrawTimer = undefined
				}.bind(app),0)
			}
		}
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