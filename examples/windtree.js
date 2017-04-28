new require('styles/dark')
module.exports = require('base/app').extend({
	props       :{autumn:0},
	tools       :{
		Branch:require('shaders/quad').extend({
			path    :0,
			depth   :0,
			leaf    :0,
			tween   :3,
			duration:2.,
			autumn  :0,
			//ease    :[0.2, 10, 0, 0],
			rotate2d:function(v, a) {$
				var ca = cos(a)
				var sa = sin(a)
				
				return vec2(
					v.x * ca - v.y * sa,
					v.x * sa + v.y * ca
				)
			},
			pixel   :function() {$
				if(this.depth > 12.) {
					var d = length(
						this.mesh.xy - vec2(.5)
					) * 2
					var col = mix(mix('#0c0', '#630', this.autumn), '#130', this.leaf)
					return this.premulAlpha(mix(col, vec4(col.rgb, 0), pow(d, 8.)))
				}
				var s = (14. - (this.depth)) * 0.2
				return mix(
					vec4('black'.rgb, 0.),
					'brown',
					sin(this.mesh.y * PI) * s
				)
			},
			vertex  :function() {$
				var depth = int(this.depth)
				
				var f1 = this.fingerPos(0)
				var f2 = this.fingerPos(1)
				
				var pos = vec2(200, 300)
				var scale = vec2(50., 50)
				var dir = vec2(0, -0.8)
				var smaller = vec2(.85, .85)
				var path = this.path
				var nodesize = vec2(1.)
				for(let i = 0;i < 14;i++){
					if(i >= depth) break
					var turnRight = mod(path, 2.)
					var angle = 25.
					if(turnRight > 0.) {
						angle = -1. * angle
					}
					if(i > 6) {
						angle += sin(this.time + 0.02 * pos.x) * 20.
					}
					
					var d1 = max(50. - length(f1 - pos), 0.)
					angle += d1 * 1.
					
					var d2 = max(50. - length(f2 - pos), 0.)
					angle -= d2 * 1.
					//angle+=sin(pos.x+this.time)*2
					
					dir = this.rotate2d(dir, angle * TORAD)
					pos += dir * scale
					scale = scale * smaller
					path = floor(path / 2.)
					if(i > 11) {
						nodesize = vec2(2., 3.)
						pos += vec2((1 - this.autumn) * sin(pos.x * 0.1) * 50. * this.autumn, this.autumn * 300.)
						pos.y = min(380., pos.y)
					}
				}
				
				var m = this.rotate2d(
					vec2(1., 0.3) * (this.mesh.xy * nodesize - vec2(1, 0.5)),
					atan(
						dir.y,
						dir.x
					)
				) + vec2(.0, 0.)
				
				var v = vec4(
					m * scale.xy + pos.xy,
					0.,
					1.
				)
				
				return v * this.viewPosition * this.camPosition * this.camProjection
			}
		})
	},
	onFingerDown:function() {
		this.autumn = 1
		this.redraw()
	},
	onFingerUp  :function() {
		this.autumn = 0
		this.redraw()
	},
	onDraw      :function () {
		var p = this
		//this.drawRect(this.viewGeom)
		function recur(path, depth) {
			p.drawBranch({
				autumn:p.autumn,
				leaf  :random(),
				path  :path,
				depth :depth
			})
			if(depth > 12) return
			recur(path, depth + 1)
			recur(path + pow(2, depth), depth + 1)
		}
		recur(0, 0)
	}
})
