module.exports = require('shader').extend(function ArcFontShader(proto, base){

	var types = require('types')
	var painter = require('painter')
	var fontloader = require('loaders/fontloader')

	proto.props = {
		fontTexGeom:{kind:'uniform', type:types.vec2},
		fontItemGeom:{kind:'uniform', type:types.vec2},
		fontSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
	}

	proto.pixel = function(){$

		var nominalSize = ivec2(this.tx1, this.ty1)
		var atlasPos = ivec2(this.tx2, this.ty2)
		var pos = vec2(this.tx1, this.ty1) * this.mesh.xy

		/* isotropic antialiasing */
		var adjust = length(vec2(length(dFdx(pos)), length(dFdy(pos))))*SQRT12
		var field = this.arcSdf(pos, nominalSize, atlasPos) / adjust * 1.4

		this.field = field 
		this.pixelStyle()
		field = this.field - this.boldness

		if(this.mesh.z < 0.5){
			return this.drawShadow(field)
		}
		return this.drawField(field)
	}

	// glyphy shader library
	proto.defines = {
		INFINITY: '1e9',
		EPSILON: '1e-5',
		MAX_NUM_ENDPOINTS: '32'
	}

	proto.structs = {
		arc_t:types.Struct({
			p0:types.vec2,
			p1:types.vec2,
			d:types.float
		}),
		arc_endpoint_t:types.Struct({
			/* Second arc endpoint */
			p:types.vec2,
			/* Infinity if this endpoint does not form an arc with the previous
			 * endpoint.  Ie. a "move_to".  Test with isinf().
			 * Arc depth otherwise.  */
			d:types.float
		}),
		arc_list_t:types.Struct({
			/* Number of endpoints in the list.
			 * Will be zero if we're far away inside or outside, in which case side is set.
			 * Will be -1 if this arc-list encodes a single line, in which case line_* are set. */
			num_endpoints:types.int,

			/* If num_endpoints is zero, this specifies whether we are inside(-1)
			 * or outside(+1).  Otherwise we're unsure(0). */
			side:types.int,
			/* Offset to the arc-endpoints from the beginning of the glyph blob */
			offset:types.int,

			/* A single line is all we care about.  It's right here. */
			line_angle:types.float,
			line_distance:types.float /* From nominal glyph center */
		})
	}

	proto.isInf = function(v){$
		return abs(v) >= INFINITY * .5
	}

	proto.isZero = function(v){$
		return abs(v) <= EPSILON * 2.
	}

	proto.ortho = function(v){$
		return vec2(-v.y, v.x)
	}

	proto.floatToByte = function(v){$
		return int(v *(256. - EPSILON))
	}

	proto.vec4ToBytes = function(v){$
		return ivec4(v *(256. - EPSILON))
	}

	proto.floatToTwoNimbles = function(v){$
		var f = this.floatToByte(v)
		return ivec2(f / 16, int(mod(float(f), 16.)))
	}

	/* returns tan(2 * atan(d)) */
	proto.tan2Atan = function( d){$
		var a = (2. * d)
		var b = (1. - d * d)
		return a/b
	}

	proto.atlasLookup = function(offset, _atlas_pos){$
		var itemgeom = vec2(_atlas_pos.xy) * this.fontItemGeom 
		var offmap = vec2(mod(float(offset), this.fontItemGeom.x), offset / int(this.fontItemGeom.x))
		var pos = (itemgeom + offmap + vec2(.5)) / this.fontTexGeom
		return texture2D(this.fontSampler, pos)
	}

	proto.arcEndpointDecode = function(v, nominal_size){$
		var p =(vec2(this.floatToTwoNimbles(v.a)) + v.gb) / 16.
		var d = v.r
		if(d == 0.) d = INFINITY
		else d = float(this.floatToByte(d) - 128) * .5 / 127.

		return arc_endpoint_t(p * vec2(nominal_size), d)
	}

	proto.arcCenter = function(a){$
		return mix(a.p0, a.p1, .5) +
		 this.ortho(a.p1 - a.p0) /(2. * this.tan2Atan(a.d))
	}

	proto.arcWedgeContains = function(a, p){$
		var d2 = this.tan2Atan(a.d)
		return dot(p - a.p0,(a.p1 - a.p0) * mat2(1,  d2, -d2, 1)) >= 0. &&
		 dot(p - a.p1,(a.p1 - a.p0) * mat2(1, -d2,  d2, 1)) <= 0.
	}

	proto.arcWedgeSignedDistShallow = function(a, p){$
		var v = normalize(a.p1 - a.p0)

		var line_d = dot(p - a.p0, this.ortho(v))// * .1abs on sin(time.sec+p.x)

		if(a.d == 0.){
			return line_d
		}
		var d0 = dot((p - a.p0), v)
		if(d0 < 0.){
			return sign(line_d) * distance(p, a.p0)
		}

		var d1 = dot((a.p1 - p), v)
		if(d1 < 0.){
			return sign(line_d) * distance(p, a.p1)
		}

		var d2 = d0 * d1
		var r = 2. * a.d * d2
		r = r / d2
		if(r * line_d > 0.){
			return sign(line_d) * min(abs(line_d + r), min(distance(p, a.p0), distance(p, a.p1)))
		}

		return line_d + r
	}

	proto.arcWedgeSignedDist = function(a, p){$
		if(abs(a.d) <= .03) return this.arcWedgeSignedDistShallow(a, p)
		var c = this.arcCenter(a)
		return sign(a.d) * (distance(a.p0, c) - distance(p, c))
	}

	proto.arcExtendedDist = function(a, p){$
		/* Note: this doesn't handle points inside the wedge. */
		var m = mix(a.p0, a.p1, .5)
		var d2 = this.tan2Atan(a.d)
		if(dot(p - m, a.p1 - m) < 0.){
			return dot(p - a.p0, normalize((a.p1 - a.p0) * mat2(+d2, -1, +1, +d2)))
		}
		else{
			return dot(p - a.p1, normalize((a.p1 - a.p0) * mat2(-d2, -1, +1, -d2)))
		}
	}

	proto.arcListOffset = function(p, nominalSize){$
		var cell = ivec2(clamp(floor(p), vec2(0.,0.), vec2(nominalSize - 1)))
		return cell.y * nominalSize.x + cell.x
	}

	proto.arcListDecode = function(v, nominalSize){$

		var l = arc_list_t()
		var iv = this.vec4ToBytes(v)

		l.side = 0 /* unsure */

		if(iv.r == 0) { /* arc-list encoded */
			l.offset = (iv.g * 256) + iv.b
			l.num_endpoints = iv.a
			if(l.num_endpoints == 255) {
				l.num_endpoints = 0
				l.side = -1
			}
			else if(l.num_endpoints == 0){
				l.side = 1
			}

		}
		else { /* single line encoded */
			l.num_endpoints = -1
			l.line_distance = float(((iv.r - 128) * 256 + iv.g) - 0x4000) / float(0x1FFF)
											* max(float(nominalSize.x), float(nominalSize.y))
			l.line_angle = float(-((iv.b * 256 + iv.a) - 0x8000)) / float(0x7FFF) * 3.14159265358979
		}
		return l
	}

	proto.arcList = function(p, nominalSize, _atlas_pos){$
		var cell_offset = this.arcListOffset(p, nominalSize)
		var arc_list_data = this.atlasLookup(cell_offset, _atlas_pos)
		return this.arcListDecode(arc_list_data, nominalSize)
	}

	proto.arcSdf = function(p, nominalSize, _atlas_pos){$

		var arc_list = this.arcList(p, nominalSize, _atlas_pos)

		/* Short-circuits */
		if(arc_list.num_endpoints == 0) {
			/* far-away cell */
			return INFINITY * float(arc_list.side)
		}
		if(arc_list.num_endpoints == -1) {
			/* single-line */
			var angle = arc_list.line_angle //+ 90.*time
			var n = vec2(cos(angle), sin(angle))
			return dot(p -(vec2(nominalSize) * .5), n) - arc_list.line_distance
		}

		var side = float(arc_list.side)
		var min_dist = INFINITY
		var closest_arc = arc_t()
		var endpoint = arc_endpoint_t()
		var endpoint_prev = this.arcEndpointDecode(this.atlasLookup(arc_list.offset, _atlas_pos), nominalSize)

		for(var i = 1; i < MAX_NUM_ENDPOINTS; i++){
			if(i >= arc_list.num_endpoints) {
				break
			}

			endpoint = this.arcEndpointDecode(this.atlasLookup(arc_list.offset + i, _atlas_pos), nominalSize)

			var a = arc_t(endpoint_prev.p, endpoint.p, endpoint.d)
			a.p0 = endpoint_prev.p;
			a.p1 = endpoint.p;
			a.d = endpoint.d;

			endpoint_prev = endpoint

			if(!this.isInf(a.d)){

				if(this.arcWedgeContains(a, p)) {
					var sdist = this.arcWedgeSignedDist(a, p)
					var udist = abs(sdist) * (1. - EPSILON)
					if(udist <= min_dist) {
						min_dist = udist

						side = sdist <= 0. ? -1. : +1.
					}
				}
				else {
					var udist = min(distance(p, a.p0), distance(p, a.p1))
					if(udist < min_dist) {
						min_dist = udist
						side = 0. /* unsure */
						closest_arc = a
					}
					else if(side == 0. && udist == min_dist) {
						/* If this new distance is the same as the current minimum,
						* compare extended distances.  Take the sign from the arc
						* with larger extended distance. */
						var old_ext_dist = this.arcExtendedDist(closest_arc, p)
						var new_ext_dist = this.arcExtendedDist(a, p)

						var ext_dist = abs(new_ext_dist) <= abs(old_ext_dist) ?
							old_ext_dist : new_ext_dist

						//#ifdef SDF_PSEUDO_DISTANCE
						/* For emboldening and stuff: */
						min_dist = abs(ext_dist)
						//#endif
						side = sign(ext_dist)
					}
				}
			}
		}

		if(side == 0.) {
			// Technically speaking this should not happen, but it does.  So try to fix it.
			var ext_dist = this.arcExtendedDist(closest_arc, p)
			side = sign(ext_dist)
		}

		return min_dist * side
	}

	proto.pointDist = function(p, nominalSize, _atlas_pos){$
		var arc_list = arc_list(p, nominalSize, _atlas_pos)

		var side = float(arc_list.side)
		var min_dist = INFINITY

		if(arc_list.num_endpoints == 0){
			return min_dist
		}
		var endpoint  = arc_endpoint_t()
		var endpoint_prev = this.arcEndpointDecode(atlas.lookup(arc_list.offset, _atlas_pos), nominalSize)
		for(var i = 1; i < MAX_NUM_ENDPOINTS; i++) {
			if(i >= arc_list.num_endpoints) {
				break
			}
			endpoint = this.arcEndpointDecode(atlas.lookup(arc_list.offset + i, _atlas_pos), nominalSize)
			if(isinf(endpoint.d)) continue
			min_dist = min(min_dist, distance(p, endpoint.p))
		}
		return min_dist
	}

	proto.onextendclass = function(){
		if(this.font && !this.font.fontmap){
			var map = this.font.fontmap = fontloader(this.font)
			// make the texture.
			this.fontTexGeom = [map.texw, map.texh]
			this.fontItemGeom = [map.itemw, map.itemh]
			this.fontSampler = new painter.Texture(painter.RGBA, map.texw, map.texh, map.textureArray)
		}
		Object.getPrototypeOf(base).onextendclass.apply(this, arguments)
	}
})