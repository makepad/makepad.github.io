module.exports = require('class').extend(function Turtle(proto){

	proto.onconstruct = function(canvas){
		this.canvas = canvas
	}

	proto.eval = function(str){

	}

	proto.begin = function(outer){
		this.outer = outer

		var margin, padding
		if(typeof outer._margin === 'object'){
			margin = this.margin = outer._margin
		}
		else{
			margin = this.margin = this.cachemargin || (this.cachemargin = [0,0,0,0])
			margin[0] = margin[1] = margin[2] = margin[3] = outer._margin
		}
		if(typeof outer._padding === 'object'){
			padding = this.padding = outer._padding
		}
		else{
			padding = this.padding = this.cachepadding || (this.cachepadding = [0,0,0,0])
			padding[0] = padding[1] = padding[2] = padding[3] = outer._padding
		}

		this.align = outer._align || (this.cachealign || (this.cachealign=[0,0]))

		// read the x
		var _x = outer._x, _y = outer._y, _w = outer._w, _h = outer._h

		this.ix = typeof _x === 'string'? this.eval(_x): _x
		this.iy = typeof _y === 'string'? this.eval(_y): _y
	
		if(isNaN(this.ix)) this.ix = outer.wx
		if(isNaN(this.iy)) this.iy = outer.wy

		this.width = typeof _w === 'string'?this.eval(_w):_w - padding[1] - padding[3]
		this.height = typeof _h === 'string'?this.eval(_h):_h - padding[0] - padding[2]

		this.x1 = this.y1 = Infinity
		this.x2 = this.y2 = -Infinity
		this.mh = 0

		// begin walking
		this.sx = this.wx = this.ix + padding[3] + margin[3]
		this.sy = this.wy = this.iy + padding[0] + margin[0]

		this.rangeStart = this.rangeList && this.rangeList.length || 0
	}	

	proto.walk = function(oldturtle){

		var _w = this._w
		if(typeof _w === 'string') this._w = this.eval(_w)
		var _h = this._h
		if(typeof _h === 'string') this._h = this.eval(_h)

		// process the margin argument type
		var margin = this._margin
		if(typeof margin !== 'object'){
			margin = this.cachemargin2 || (this.cachemargin2 = [0,0,0,0])
			margin[0] = margin[1] = margin[2] = margin[3] = this._margin
		}

		// check if we wrap around
		if(!isNaN(this.width) && this.wx + this._w + margin[3] + margin[1] > this.sx + this.width){
			var dx = this.sx - this.wx 
			var dy = this.mh
			this.wx = this.sx
			this.wy += this.mh
			this.mh = 0
			// move the body of the wrapped thing
			if(oldturtle){
				this.canvas.moveRange(oldturtle.rangeStart, dx, dy)
			}
		}
		// walk it
		if(isNaN(this._x) || isNaN(this._y)){
			this._x = this.wx + margin[3]
			this._y = this.wy + margin[0]
			this.wx += this._w + margin[3] + margin[1]
			// compute new max height
			var nh = this._h + margin[0] + margin[2]
			if(nh > this.mh) this.mh = nh
			// compute x bounds
			if(this.wx > this.x2) this.x2 = this.wx
			// compute y bounds
			var ny = this.wy + nh
			if(ny > this.y2) this.y2 = ny
		}
	}

	proto.newline = function(){
		t.wx = t.sx
		t.wy += t.mh
		t.mh = 0
	}

	proto.end = function(){
		var padding = this.padding
		var outer = this.outer

		outer._w = (isNaN(this.width)?(this.x2 - this.sx):this.width) + padding[3] + padding[1]
		outer._h = (isNaN(this.height)?(this.y2 - this.sy):this.height) + padding[0] + padding[2]
		
		// displace by a factor
		var dx = isNaN(this.width)?0:(this.width - (this.x2 - this.sx)) * this.align[0]
		var dy = isNaN(this.width)?0:(this.height - (this.y2 - this.sy)) * this.align[1]
		this.canvas.moveRange(this.rangeStart, dx, dy)		
	}
})