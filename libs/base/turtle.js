var xcache = {}
var ycache = {}
var wcache = {}
var hcache = {}

module.exports = class Turtle extends require('base/class'){

	constructor(view){
		super()
		this.view = view
		this.wx = this.sx = 0
		this.wy = this.sy = 0
		this.x1 = this.y1 = Infinity
		this.x2 = this.y2 = -Infinity
		this.mh = 0
	}

	dump(){
		return (
		'sx:'+this.sx+
		',sy:'+this.sy+
		',width:'+this.width+
		',height:'+this.height+
		',_x:'+this._x+
		',_y:'+this._y+
		',wx:'+this.wx+
		',wy:'+this.wy)
	}
	
	begin(outer, walkZero){

		this.outer = outer

		var margin, padding
		if(typeof outer._margin === 'object'){
			margin = this.margin = outer._margin
		}
		else{
			margin = this.margin = this.$margin || (this.$margin = [0,0,0,0])
			margin[0] = margin[1] = margin[2] = margin[3] = outer._margin
		}
		if(typeof outer._padding === 'object'){
			padding = this.padding = outer._padding
		}
		else{
			padding = this.padding = this.$padding || (this.$padding = [0,0,0,0])
			padding[0] = padding[1] = padding[2] = padding[3] = outer._padding
		}

		// run align on outer
		var align = outer._align
		if(align && align[0] !== undefined){ // we are setting/changing alignment
			if(outer.$alignX !== align[0] || outer.$alignY !== align[1]){ // we should doAlign
				outer.doAlign(null)
			}
		}

		// do clipping
		this._turtleClip = outer._turtleClip
		// read the x
		var _x = outer._x, _y = outer._y, _w = outer._w, _h = outer._h

		this.width = outer.width
		if(typeof _w === 'string'){
			this._w = (outer._w = outer.evalw(_w, this.context)) - padding[1] - padding[3]
		}
		else this._w = _w - padding[1] - padding[3]
		if(typeof _x === 'string'){
			_x = (outer._x = outer.evalx(_x, this.context))
		}
		this.width = this._w

		this.height = outer.height
		if(typeof _h === 'string'){
			this._h = (outer._h = outer.evalh(_h, this.context)) - padding[0] - padding[2]
		}
		else{
			this._h = _h - padding[0] - padding[2]
		}
		if(typeof _y === 'string'){
			_y = (outer._y = outer.evaly(_y, this.context))
		}
		this.height = this._h
		this.ix = _x
		this.iy = _y

		this.$alignDx = 
		this.$alignDy =
		this.$alignX = 
		this.$alignY = 0 // default alignment

		//console.log(this.ix, _x)
		if(isNaN(this.ix)) this.ix = outer.wx
		if(isNaN(this.iy)) this.iy = outer.wy

		this.x1 = this.y1 = Infinity
		this.x2 = this.y2 = -Infinity
		//this.mx1 = this.my1 = 
		this.mh = 0
		// begin walking
		this.sx = this.wx = this.ix + padding[3] + margin[3]
		this.sy = this.wy = this.iy + padding[0] + margin[0]
		this.$writeCursor = 
		this.$writeStart = this.view.$writeList && this.view.$writeList.length || 0

		//this.$xAbs = outer.$xAbs
		//this.$yAbs = outer.$yAbs
	}	

	// lets do alignment
	doAlign(last){
		var ax = this.$alignX, ay = this.$alignY

		if(ax !== 0 || ay !== 0){
			var dx = isNaN(this.width)? 0: (this.width - (this.x2 - this.sx)) * ax
			var dy = isNaN(this.height)? 0: (this.height - (this.y2 - this.sy)) * ay

			//	dx = this.width - (this.x2 - this.sx  -15)
			if(isNaN(dx) || dx === Infinity) dx = 0
			if(isNaN(dy) || dy === Infinity) dy = 0
			if(dx !== 0 || dy !== 0){
				this.view.$moveWritten(this.$writeCursor, dx, dy)
				// update inner free delta when right/bottom aligning
				// so the % width calc works
				if(ax === 1){ // right align
					this.$alignDx = this.width - dx
				}
				if(ay === 1){ // bottom align
					this.$alignDy = this.height - dy
				}
			}
		}
		if(!last){
			var align = this._align
			// we should be aligning
			this.$writeCursor = this.view.$writeList && this.view.$writeList.length-3 || 0// oldturtle?oldturtle.$writeStart-4:(this.view.$writeList && this.view.$writeList.length-4 || 0)
			this.$alignX = align[0], this.$alignY = align[1]
			// reset walking position
			this.wx = this.sx
			this.wy = this.sy
			this.mh = 0
		}
	}

	walk(oldturtle, isView){
		if(this.view.$inPlace) return

		var align = this._align
		if(align && align[0] !== undefined){ // we are setting/changing alignment
			if(this.$alignX !== align[0] || this.$alignY !== align[1]){ // we should doAlign
				this.doAlign()
			}
		}

		var _w = this._w
		if(typeof _w === 'string'){
			this._w = this.evalw(_w, this.context)
		}
		var _h = this._h
		if(typeof _h === 'string'){
			this._h = this.evalh(_h, this.context)
		}
		var _x = this._x
		if(typeof _x === 'string'){
			this._x = this.evalx(_x, this.context)
		}
		var _y = this._y
		if(typeof _y === 'string'){
			this._y = this.evaly(_y, this.context)
		}
		// process the margin argument type
		var margin = this._margin
		if(typeof margin !== 'object'){
			margin = this.$margin2 || (this.$margin2 = [0,0,0,0])
			margin[0] = margin[1] = margin[2] = margin[3] = this._margin
		}

		// walk it
		var isNaNx = isNaN(this._x)
		var isNaNy = isNaN(this._y)
		if(isNaNx || isNaNy){
			// only wrap now
			if(this._down){ // walk vertically
				if(this.outer && (this.outer._wrap === 2 ||
					this.outer._wrap && !isNaN(this.height) && this.wy + this._h + margin[0] + margin[2] > this.sy + this.height)){
					var dy = this.sy - this.wy
					var dx = this.mh

					if(!isNaNx) dx = 0
					if(!isNaNy) dy = 0
					this.wy = this.sy
					this.wx += this.mh
					this.mh = 0
					// move the body of the wrapped thing
					// but this changes our bounds randomly.
					if(oldturtle && !isView){
						this.view.$moveWritten(oldturtle.$writeStart, dx, dy)
					}
				}
				if(isNaNy){
					this._y = this.wy + margin[0]
					this.wy += (isNaN(this._h)?0:this._h) + margin[0] + margin[2]
				}
				if(isNaNx){
					this._x = this.wx + margin[3]
					// compute new max height
					var nh = this._w +margin[3] + margin[1]
					if(nh > this.mh) this.mh = nh
				}

				if(this.wy > this.y2) this.y2 = this.wy
				var nx = this.wx + nh
				if(nx > this.x2) this.x2 = nx
			}
			else{ // walk horizontally
				if(this.outer && (this.outer._wrap === 2 ||
					this.outer._wrap && !isNaN(this.width) && this.wx + this._w + margin[3] + margin[1] > this.sx + this.width)){
					var dx = this.sx - this.wx 
					var dy = this.mh
					if(!isNaNx) dx = 0
					if(!isNaNy) dy = 0
					this.wx = this.sx
					this.wy += this.mh
					this.mh = 0
					// move the body of the wrapped thing
					// but this changes our bounds randomly.
					if(oldturtle && !isView){
						// ok so what if, we are a view. then we shouldnt move things
						//console.log(oldturtle.view === this.view)
						oldturtle.view.$moveWritten(oldturtle.$writeStart, dx, dy)
					}
				}
				if(isNaNx){
					this._x = this.wx + margin[3]
					this.wx += (isNaN(this._w)?0:this._w) + margin[3] + margin[1]
				}
				if(isNaNy){
					this._y = this.wy + margin[0]
					// compute new max height
					var nh = this._h +margin[0] + margin[2]
					if(nh > this.mh) this.mh = nh
				}
				// compute x bounds
				// check if it wont wrap
				if(this.wx > this.x2) this.x2 = this.wx
				// compute y bounds
				var ny = this.wy + nh
				if(ny > this.y2) this.y2 = ny

			}
		}
		if(this._x < this.x1) this.x1 = this._x
		if(this._y < this.y1) this.y1 = this._y
	}

	lineBreak(){
		this.wx = this.sx
		this.wy += this.mh
		this.mh = 0
	}

	wBound(){
		let padding = this.padding
		return  (isNaN(this.width)?(this.x2 === -Infinity?NaN:(this.x2 - this.sx)):this.width) + padding[3] + padding[1]
	}

	hBound(){
		let padding = this.padding
		return (isNaN(this.height)?(this.y2 === -Infinity?NaN:(this.y2 - this.sy)):this.height) + padding[0] + padding[2]
	}

	end(doBounds){
		var outer = this.outer
		// store our bounds
		outer._w = this.wBound()
		outer._h = this.hBound()
		if(doBounds){
			if(this.x1 < outer.x1) outer.x1 = this.x1
			if(this.y1 < outer.y1) outer.y1 = this.y1
			if(this.x2 > outer.x2) outer.x2 = this.x2
			if(this.y2 > outer.y2) outer.y2 = this.y2
		}
		this.doAlign(true)
	}

	shiftPadding(shift){
		var pad = this._padding
		if(!shift) return
		if(typeof shift === 'number'){
			if(!shift) return
			if(typeof pad === 'number'){
				this._padding = pad + shift
				return
			}
			var out = this.$shiftPadding || (this.$shiftPadding = [0,0,0,0])
			out[0] = pad[0] + shift
			out[1] = pad[1] + shift
			out[2] = pad[2] + shift
			out[3] = pad[3] + shift
			this._padding = out
			return
		}
		var out = this.$shiftPadding || (this.$shiftPadding = [0,0,0,0])
		this._padding = out
		if(typeof pad === 'number'){
			out[0] = pad + shift[0]
			out[1] = pad + shift[1]
			out[2] = pad + shift[2]
			out[3] = pad + shift[3]
			return
		}
		out[0] = pad[0] + shift[0]
		out[1] = pad[1] + shift[1]
		out[2] = pad[2] + shift[2]
		out[3] = pad[3] + shift[3]
	}

	// evaluators of string x/y/w/h
	evalx(str,context){
		var cache = xcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return this.sx + pf
			var code = 'turtle.sx + '+ str
				.replace(/\@/g, 'turtle.width - turtle._w -')
				.replace(/\#/g, '*0.01*(turtle.width - (turtle.wx - turtle.sx) - turtle.$alignDx) - turtle._margin[1] - turtle._margin[3]')
				.replace(/\%/g, '*0.01*(turtle.width) - turtle._margin[1] - turtle._margin[3]')
			cache = xcache[str] = new Function('turtle', 'return '+code)
		}
		var ret = cache.call(context,this)
		return ret
	}

	evaly(str, context){
		var cache = ycache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return this.sy + pf
			var code = 'turtle.sy + '+  str
				.replace(/\@/g, 'turtle.height - turtle._h -')
				.replace(/\#/g, '*0.01*(turtle.height - (turtle.wy-turtle.sy) - turtle.$alignDy)- turtle._margin[0] - turtle._margin[2]')
				.replace(/\%/g, '*0.01*(turtle.height)- turtle._margin[0] - turtle._margin[2]')
			cache = ycache[str] = new Function('turtle', 'return '+code)
		} 
		return cache.call(context,this)
	}

	log(...args){
		console.log(...args)
		return args[0]
	}

	evalw(str, context){
		var cache = wcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return pf
			var code = str
				.replace(/\#/g, '*0.01*(turtle.width - (turtle.wx - turtle.sx) - turtle.$alignDx) - turtle._margin[1] - turtle._margin[3]')
				.replace(/\%/g, '*0.01*(turtle.width) - turtle._margin[1] - turtle._margin[3]')
			//var code = str.replace(/\%/g, '*0.01*(turtle.width ) - turtle.margin[1] - turtle.margin[3]')
			cache = wcache[str] = new Function('turtle', 'return '+code)
		} 
		return cache.call(context,this)
	}

	evalh(str, context){
		var cache = hcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return pf
			var code = str
				.replace(/\#/g, '*0.01*(turtle.height - (turtle.wy-turtle.sy) - turtle.$alignDy)- turtle._margin[0] - turtle._margin[2]')
				.replace(/\%/g, '*0.01*(turtle.height)- turtle._margin[0] - turtle._margin[2]')
			cache = hcache[str] = new Function('turtle', 'return '+code)
		} 
		var r= cache.call(context,this)
		return r
	}
}