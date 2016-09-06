module.exports = require('base/class').extend(function Turtle(proto){

	proto.onConstruct = function(view){
		this.view = view
		this.x1 = this.y1 = Infinity
		this.x2 = this.y2 = -Infinity
		this.mh = 0
	}
	proto.dump = function(){
		return (
		'sx:'+this.sx+
		',sy:'+this.sy+
		',width:'+this.width+
		',height:'+this.height+
		',_x:'+this._x+
		',_y:'+this._y+
		//',ix:'+this.ix+
		//',iy:'+this.iy+
		',wx:'+this.wx+
		',wy:'+this.wy)
	}
	proto.begin = function(outer, dump){

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

		this.align = outer._align || (this.$align || (this.$align=[0,0]))

		// do clipping
		this._turtleClip = outer._turtleClip
		// read the x
		var _x = outer._x, _y = outer._y, _w = outer._w, _h = outer._h
		
		this.width = outer.width
		if(typeof _w === 'string'){
			this._w = (outer._w = this.evalw(_w)) - padding[1] - padding[3]
		}
		else this._w = _w - padding[1] - padding[3]
		if(typeof _x === 'string'){
			this.sx = outer.sx
			_x = (outer._x = this.evalx(_x))
		}
		this.width = this._w

		this.height = outer.height
		if(typeof _h === 'string'){
			this._h = (outer._h = this.evalh(_h)) - padding[0] - padding[2]
		}
		else{
			this._h = _h - padding[0] - padding[2]
		}
		if(typeof _y === 'string'){
			this.sy = outer.sy
			_y = (outer._y = this.evaly(_y))
		}
		this.height = this._h
		this.ix = _x
		this.iy = _y
		//console.log(this.ix, _x)
		if(isNaN(this.ix)) this.ix = outer.wx
		if(isNaN(this.iy)) this.iy = outer.wy

		this.x1 = this.y1 = Infinity
		this.x2 = this.y2 = -Infinity

		this.mh = 0
		// begin walking
		this.sx = this.wx = this.ix + padding[3] + margin[3]
		this.sy = this.wy = this.iy + padding[0] + margin[0]

		this.$writeStart = this.view.$writeList && this.view.$writeList.length || 0
	}	

	proto.walk = function(oldturtle){
		if(this.view.$inPlace) return

		var _w = this._w
		if(typeof _w === 'string'){
			this._w = this.evalw(_w)
		}
		var _h = this._h
		if(typeof _h === 'string'){
			this._h = this.evalh(_h)
		}
		var _x = this._x
		if(typeof _x === 'string'){
			this._x = this.evalx(_x)
		}
		var _y = this._y
		if(typeof _y === 'string'){
			this._y = this.evaly(_y)
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
				if(oldturtle){
					this.view.$moveWritten(oldturtle.$writeStart, dx, dy)
				}
			}
			if(isNaNx) this._x = this.wx + margin[3]
			if(isNaNy) this._y = this.wy + margin[0]
			this.wx += (isNaN(this._w)?0:this._w) + margin[3] + margin[1]
			// compute new max height
			var nh = this._h +margin[0] + margin[2]
			if(nh > this.mh) this.mh = nh
			// compute x bounds
			if(!this._noBounds){
				// check if it wont wrap
				if(this.wx > this.x2) this.x2 = this.wx
				// compute y bounds
				var ny = this.wy + nh
				if(ny > this.y2) this.y2 = ny
			}
		}
		if(!this._noBounds){
			if(this._x < this.x1) this.x1 = this._x
			if(this._y < this.y1) this.y1 = this._y
		}
	}

	proto.lineBreak = function(){
		this.wx = this.sx
		this.wy += this.mh
		this.mh = 0
	}

	proto.end = function(doBounds){
		var padding = this.padding
		var outer = this.outer

		outer._w = (isNaN(this.width)?(this.x2 === -Infinity?NaN:(this.x2 - this.sx)):this.width) + padding[3] + padding[1]
		outer._h = (isNaN(this.height)?(this.y2 === -Infinity?NaN:(this.y2 - this.sy)):this.height) + padding[0] + padding[2]

		if(doBounds){
			if(this.x1 < outer.x1) outer.x1 = this.x1
			if(this.y1 < outer.y1) outer.y1 = this.y1
			if(this.x2 > outer.x2) outer.x2 = this.x2
			if(this.y2 > outer.y2) outer.y2 = this.y2
		}

		if(this.align[0] !== 0 || this.align[1] !== 0){
			var dx = isNaN(this.width)? 0: (this.width - (this.x2 - this.sx)) * this.align[0]
			var dy = isNaN(this.height)? 0: (this.height - (this.y2 - this.sy)) * this.align[1]
			//	dx = this.width - (this.x2 - this.sx  -15)
			if(isNaN(dx) || dx === Infinity) dx = 0
			if(isNaN(dy) || dy === Infinity) dy = 0
			if(dx !== 0 || dy !== 0) this.view.$moveWritten(this.$writeStart, dx, dy)		
		}
	}

	proto.shiftPadding = function(shift){
		var pad = this._padding
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

	var xcache = {}
	proto.evalx = function(str){
		var cache = xcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return this.sx + pf
			var code = 'turtle.sx + '+ str
				.replace(/\@/g, 'turtle.width - turtle._w - turtle.padding[3] -')
				.replace(/\%/g, '*0.01*turtle.width - turtle.margin[1] - turtle.margin[3]')
			cache = xcache[str] = new Function('turtle', 'return '+code)
		}
		var ret = cache.call(this.context,this)
		return ret
	}

	var ycache = {}
	proto.evaly = function(str){
		var cache = ycache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return this.sy + pf
			var code = 'turtle.sy + '+  str
				.replace(/\@/g, 'turtle.height - turtle._h - turtle.padding[0] -')
				.replace(/\%/g, '*0.01*turtle.height - turtle.margin[0] - turtle.margin[2]')
			cache = ycache[str] = new Function('turtle', 'return '+code)
		} 
		return cache.call(this.context,this)
	}

	var wcache = {}
	proto.evalw = function(str){
		var cache = wcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return pf
			var code = str.replace(/\%/g, '*0.01*turtle.width - turtle.margin[1] - turtle.margin[3]')
			cache = wcache[str] = new Function('turtle', 'return '+code)
		} 
		return cache.call(this.context,this)
	}

	var hcache = {}
	proto.evalh = function(str){
		var cache = hcache[str]
		if(!cache){
			var pf = parseFloat(str)
			if(str == pf) return pf
			var code = str.replace(/\%/g, '*0.01*turtle.height - turtle.margin[0] - turtle.margin[2]')
			cache = hcache[str] = new Function('turtle', 'return '+code)
		} 
		var r= cache.call(this.context,this)
		return r
	}
})