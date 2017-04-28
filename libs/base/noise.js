
// Ported to JS from Stefan Gustavson, Ian McEwan Ashima Arts GLSL noise functions
module.exports =  class Noise{

	cheapNoise2d(inp){$
		return fract(sin(dot(inp.xy ,vec2(12.9898,78.233))) * 43758.5453);
	}

	noise2d(v){$
		var C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439)
		var i  = floor(v + dot(v, C.yy) )
		var x0 = v -   i + dot(i, C.xx)

		var i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0)
		var x12 = x0.xyxy + C.xxzz
		x12.xy -= i1

		i = mod(i, 289.0) // Avoid truncation effects in permutation
		var p = this.permute3(this.permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0 ))

		var m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0)
		m = m*m
		m = m*m

		var x = 2.0 * fract(p * C.www) - 1.0
		var h = abs(x) - 0.5
		var ox = floor(x + 0.5)
		var a0 = x - ox

		m *= (1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ))
		var g = vec3()
		g.x  = a0.x  * x0.x  + h.x  * x0.y
		g.yz = a0.yz * x12.xz + h.yz * x12.yw
		return 130.0 * dot(m, g)
	}

	noise3d(v){$
		var C = vec2(1.0/6.0, 1.0/3.0)
		var D = vec4(0.0, 0.5, 1.0, 2.0)

		// First corner
		var i = floor(v + dot(v, C.yyy))
		var x0 = v - i + dot(i, C.xxx)
		var g = step(x0.yzx, x0.xyz)
		var l = 1.0 - g
		var i1 = min(g.xyz, l.zxy)
		var i2 = max(g.xyz, l.zxy)
		var x1 = x0 - i1 + 1.0 * C.xxx
		var x2 = x0 - i2 + 2.0 * C.xxx
		var x3 = x0 - 1. + 3.0 * C.xxx

		// Permutations
		i = mod(i, vec3(289.0))
		var p = this.permute4(this.permute4(this.permute4( 
			i.z + vec4(0.0, i1.z, i2.z, 1.0))
			+ i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
			+ i.x + vec4(0.0, i1.x, i2.x, 1.0))

		// ( N*N points uniformly over a square, mapped onto an octahedron.)
		var n_ = 1.0/7.0
		var ns = n_ * D.wyz - D.xzx
		var j = p - 49.0 * floor(p * ns.z *ns.z)
	 	var x_ = floor(j * ns.z)
		var y_ = floor(j - 7.0 * x_)
		var x = x_ * ns.x + ns.yyyy
		var y = y_ * ns.x + ns.yyyy
		var h = 1.0 - abs(x) - abs(y)
		var b0 = vec4( x.xy, y.xy )
		var b1 = vec4( x.zw, y.zw )
		var s0 = floor(b0)*2.0 + 1.0
		var s1 = floor(b1)*2.0 + 1.0
		var sh = -step(h, vec4(0.0))
		var a0 = b0.xzyw + s0.xzyw*sh.xxyy
		var a1 = b1.xzyw + s1.xzyw*sh.zzww
		var p0 = vec3(a0.xy, h.x)
		var p1 = vec3(a0.zw, h.y)
		var p2 = vec3(a1.xy, h.z)
		var p3 = vec3(a1.zw, h.w)

		//Normalise gradients
		var norm = this.isqrtT4(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)))
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;

		// Mix final noise value
		var m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), vec4(0.0))
		m = m * m
		return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
			dot(p2,x2), dot(p3,x3) ) )
	}
	
	noise4d(v){$

		var C = vec4(0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958)
		// First corner
		var i  = floor(v + dot(v, vec4(0.309016994374947451)) )
		var x0 = v - i + dot(i, C.xxxx)
		var i0 = vec4()
		var isX = step( x0.yzw, x0.xxx )
		var isYZ = step( x0.zww, x0.yyz )
		i0.x = isX.x + isX.y + isX.z
		i0.yzw = 1.0 - isX
		i0.y += isYZ.x + isYZ.y
		i0.zw += 1.0 - isYZ.xy
		i0.z += isYZ.z
		i0.w += 1.0 - isYZ.z
		var i3 = clamp( i0, 0.0, 1.0 )
		var i2 = clamp( i0-1.0, 0.0, 1.0 )
		var i1 = clamp( i0-2.0, 0.0, 1.0 )
		var x1 = x0 - i1 + C.xxxx
		var x2 = x0 - i2 + C.yyyy
		var x3 = x0 - i3 + C.zzzz
		var x4 = x0 + C.wwww
		// Permutations
		i = mod(i, 289.0 )
		var j0 = this.permute1( this.permute1( this.permute1( this.permute1(i.w) + i.z) + i.y) + i.x)
		var j1 = this.permute4( this.permute4( this.permute4( this.permute4(
			i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
			+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
			+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
			+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ))
		// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
		// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
		var ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0)
		var p0 = snoise4_g(j0,   ip)
		var p1 = snoise4_g(j1.x, ip)
		var p2 = snoise4_g(j1.y, ip)
		var p3 = snoise4_g(j1.z, ip)
		var p4 = snoise4_g(j1.w, ip)
		// Normalise gradients
		var nr = this.isqrtT4(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)))
		p0 *= nr.x
		p1 *= nr.y
		p2 *= nr.z
		p3 *= nr.w
		p4 *= this.isqrtT1(dot(p4,p4))
		// Mix contributions from the five corners
		var m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0)
		var m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)), 0.0)
		m0 = m0 * m0
		m1 = m1 * m1

		return 49.0 * (dot(m0*m0, vec3(dot( p0, x0 ), dot(p1, x1), dot(p2, x2)))
			+ dot(m1*m1, vec2( dot(p3, x3), dot(p4, x4))))
	}

	cell3d(P){$
		var K = 0.142857142857 // 1/7
		var Ko = 0.428571428571 // 1/2-K/2
		var K2 = 0.020408163265306 // 1/(7*7)
		var Kz = 0.166666666667 // 1/6
		var Kzo = 0.416666666667 // 1/2-1/6*2
		var ji = 0.8 // smaller jitter gives less errors in F2
		var Pi = mod(floor(P), 289.0)
		var Pf = fract(P)
		var Pfx = Pf.x + vec4(0.0, -1.0, 0.0, -1.0)
		var Pfy = Pf.y + vec4(0.0, 0.0, -1.0, -1.0)
		var p = this.permute4(Pi.x + vec4(0.0, 1.0, 0.0, 1.0))
		p = this.permute4(p + Pi.y + vec4(0.0, 0.0, 1.0, 1.0))
		var p1 = this.permute4(p + Pi.z) // z+0
		var p2 = this.permute4(p + Pi.z + vec4(1.0)) // z+1
		var ox1 = fract(p1*K) - Ko
		var oy1 = mod(floor(p1*K), 7.0)*K - Ko
		var oz1 = floor(p1*K2)*Kz - Kzo // p1 < 289 guaranteed
		var ox2 = fract(p2*K) - Ko
		var oy2 = mod(floor(p2*K), 7.0)*K - Ko
		var oz2 = floor(p2*K2)*Kz - Kzo
		var dx1 = Pfx + ji*ox1
		var dy1 = Pfy + ji*oy1
		var dz1 = Pf.z + ji*oz1
		var dx2 = Pfx + ji*ox2
		var dy2 = Pfy + ji*oy2
		var dz2 = Pf.z - 1.0 + ji*oz2
		var d1 = dx1 * dx1 + dy1 * dy1 + dz1 * dz1 // z+0
		var d2 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2 // z+1

		var d = min(d1,d2) // F1 is now in d
		d2 = max(d1,d2) // Make sure we keep all candidates for F2
		d.xy = (d.x < d.y) ? d.xy : d.yx // Swap smallest to d.x
		d.xz = (d.x < d.z) ? d.xz : d.zx
		d.xw = (d.x < d.w) ? d.xw : d.wx // F1 is now in d.x
		d.yzw = min(d.yzw, d2.yzw) // F2 now not in d2.yzw
		d.y = min(d.y, d.z) // nor in d.z
		d.y = min(d.y, d.w) // nor in d.w
		d.y = min(d.y, d2.x) // F2 is now in d.y
		return sqrt(d.xy) // F1 and F2
	}

	block3d(P){$
		var K = 0.142857142857
		var Ko = 0.428571428571 // 1/2-K/2
		var K2 = 0.020408163265306// 1/(7*7)
		var Kz = 0.166666666667// 1/6
		var Kzo = 0.416666666667// 1/2-1/6*2
		var ji = 1.0// smaller jitter gives more regular pattern

		var Pi = mod(floor(P), 289.0)
		var Pf = fract(P) - 0.5

		var Pfx = Pf.x + vec3(1.0, 0.0, -1.0)
		var Pfy = Pf.y + vec3(1.0, 0.0, -1.0)
		var Pfz = Pf.z + vec3(1.0, 0.0, -1.0)

		var p = this.permute3(Pi.x + vec3(-1.0, 0.0, 1.0))
		var p1 = this.permute3(p + Pi.y - 1.0)
		var p2 = this.permute3(p + Pi.y)
		var p3 = this.permute3(p + Pi.y + 1.0)
		var p11 = this.permute3(p1 + Pi.z - 1.0)
		var p12 = this.permute3(p1 + Pi.z)
		var p13 = this.permute3(p1 + Pi.z + 1.0)
		var p21 = this.permute3(p2 + Pi.z - 1.0)
		var p22 = this.permute3(p2 + Pi.z)
		var p23 = this.permute3(p2 + Pi.z + 1.0)
		var p31 = this.permute3(p3 + Pi.z - 1.0)
		var p32 = this.permute3(p3 + Pi.z)
		var p33 = this.permute3(p3 + Pi.z + 1.0)

		var ox11 = fract(p11*K) - Ko
		var oy11 = mod(floor(p11*K), 7.0)*K - Ko
		var oz11 = floor(p11*K2)*Kz - Kzo // p11 < 289 guaranteed
		var ox12 = fract(p12*K) - Ko
		var oy12 = mod(floor(p12*K), 7.0)*K - Ko
		var oz12 = floor(p12*K2)*Kz - Kzo
		var ox13 = fract(p13*K) - Ko
		var oy13 = mod(floor(p13*K), 7.0)*K - Ko
		var oz13 = floor(p13*K2)*Kz - Kzo
		var ox21 = fract(p21*K) - Ko
		var oy21 = mod(floor(p21*K), 7.0)*K - Ko
		var oz21 = floor(p21*K2)*Kz - Kzo
		var ox22 = fract(p22*K) - Ko
		var oy22 = mod(floor(p22*K), 7.0)*K - Ko
		var oz22 = floor(p22*K2)*Kz - Kzo
		var ox23 = fract(p23*K) - Ko
		var oy23 = mod(floor(p23*K), 7.0)*K - Ko
		var oz23 = floor(p23*K2)*Kz - Kzo
		var ox31 = fract(p31*K) - Ko
		var oy31 = mod(floor(p31*K), 7.0)*K - Ko
		var oz31 = floor(p31*K2)*Kz - Kzo
		var ox32 = fract(p32*K) - Ko
		var oy32 = mod(floor(p32*K), 7.0)*K - Ko
		var oz32 = floor(p32*K2)*Kz - Kzo
		var ox33 = fract(p33*K) - Ko
		var oy33 = mod(floor(p33*K), 7.0)*K - Ko
		var oz33 = floor(p33*K2)*Kz - Kzo

		var dx11 = Pfx + ji*ox11
		var dy11 = Pfy.x + ji*oy11
		var dz11 = Pfz.x + ji*oz11
		var dx12 = Pfx + ji*ox12
		var dy12 = Pfy.x + ji*oy12
		var dz12 = Pfz.y + ji*oz12
		var dx13 = Pfx + ji*ox13
		var dy13 = Pfy.x + ji*oy13
		var dz13 = Pfz.z + ji*oz13
		var dx21 = Pfx + ji*ox21
		var dy21 = Pfy.y + ji*oy21
		var dz21 = Pfz.x + ji*oz21
		var dx22 = Pfx + ji*ox22
		var dy22 = Pfy.y + ji*oy22
		var dz22 = Pfz.y + ji*oz22
		var dx23 = Pfx + ji*ox23
		var dy23 = Pfy.y + ji*oy23
		var dz23 = Pfz.z + ji*oz23
		var dx31 = Pfx + ji*ox31
		var dy31 = Pfy.z + ji*oy31
		var dz31 = Pfz.x + ji*oz31
		var dx32 = Pfx + ji*ox32
		var dy32 = Pfy.z + ji*oy32
		var dz32 = Pfz.y + ji*oz32
		var dx33 = Pfx + ji*ox33
		var dy33 = Pfy.z + ji*oy33
		var dz33 = Pfz.z + ji*oz33

		var d11 = dx11 * dx11 + dy11 * dy11 + dz11 * dz11
		var d12 = dx12 * dx12 + dy12 * dy12 + dz12 * dz12
		var d13 = dx13 * dx13 + dy13 * dy13 + dz13 * dz13
		var d21 = dx21 * dx21 + dy21 * dy21 + dz21 * dz21
		var d22 = dx22 * dx22 + dy22 * dy22 + dz22 * dz22
		var d23 = dx23 * dx23 + dy23 * dy23 + dz23 * dz23
		var d31 = dx31 * dx31 + dy31 * dy31 + dz31 * dz31
		var d32 = dx32 * dx32 + dy32 * dy32 + dz32 * dz32
		var d33 = dx33 * dx33 + dy33 * dy33 + dz33 * dz33

		var d1a = min(d11, d12)
		d12 = max(d11, d12)
		d11 = min(d1a, d13) // Smallest now not in d12 or d13
		d13 = max(d1a, d13)
		d12 = min(d12, d13) // 2nd smallest now not in d13
		var d2a = min(d21, d22)
		d22 = max(d21, d22)
		d21 = min(d2a, d23) // Smallest now not in d22 or d23
		d23 = max(d2a, d23)
		d22 = min(d22, d23) // 2nd smallest now not in d23
		var d3a = min(d31, d32)
		d32 = max(d31, d32)
		d31 = min(d3a, d33) // Smallest now not in d32 or d33
		d33 = max(d3a, d33)
		d32 = min(d32, d33) // 2nd smallest now not in d33
		var da = min(d11, d21)
		d21 = max(d11, d21)
		d11 = min(da, d31) // Smallest now in d11
		d31 = max(da, d31) // 2nd smallest now not in d31
		d11.xy = (d11.x < d11.y) ? d11.xy : d11.yx
		d11.xz = (d11.x < d11.z) ? d11.xz : d11.zx // d11.x now smallest
		d12 = min(d12, d21) // 2nd smallest now not in d21
		d12 = min(d12, d22) // nor in d22
		d12 = min(d12, d31) // nor in d31
		d12 = min(d12, d32) // nor in d32
		d11.yz = min(d11.yz, d12.xy) // nor in d12.yz
		d11.y = min(d11.y, d12.z) // Only two more to go
		d11.y = min(d11.y, d11.z) // Done! (Phew!)
		return sqrt(d11.xy) // F1, F2
	}

	
	permute1(x){$
		return mod((34.0 * x + 1.0) * x, 289.0)
	}

	permute3(x){$
		return mod((34.0 * x + 1.0) * x, vec3(289.0))
	}

	permute4(x){$
		return mod((34.0 * x + 1.0) * x, vec4(289.0))
	}
	
	isqrtT1(r){$
		return 1.79284291400159 - 0.85373472095314 * r
	}
	
	isqrtT4(r){$
		return vec4(1.79284291400159 - 0.85373472095314 * r)
	}

	snoise4_g(j, ip){$
		var p = vec4()
		p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0
		p.w = 1.5 - dot(abs(p.xyz), vec3(1.0,1.0,1.0))
		var s = vec4(lessThan(p, vec4(0.0)))
		p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www
		return p
	}
}