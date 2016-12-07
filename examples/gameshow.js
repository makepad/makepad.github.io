new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Splash:require('base/view').extend({
				props:{text:'HI'},
				tools:{
					Bg:require('shaders/quad').extend({
						padding:130,
						pixel:function() {$
							this.viewport(this.mesh.xy)
							this.translate(.5, .5)
							this.circle(0., 0., .35) //+sin(this.time*8))
							let p = this.pos
							this.shape += 0.05 * abs(sin(atan(p.y, p.x) * 6 + this.time * 4))
							this.fillKeep('orange')
							this.strokeKeep('#700', .02)
							this.shape += 0.04
							this.strokeKeep('red', .03)
							this.blur = 0.2
							this.glow('white', 0.1)
							return this.result
						}
					}),
					Text:require('shaders/text').extend({
						fontSize:32,
						align:[0.5, 0.5],
						boldness:3.,
						outlineWidth:0.02,
						shadowColor:'#0009',
						shadowBlur:0.01,
						shadowOffset:[2., 2],
						dy: - 4.1,
						lineSpacing:0.9,
						outlineColor:'black',
						vertexStyle:function() {
							let b = this.bouncy = abs(sin(this.time))
							this.shadowOffset = vec2(b * 10, b * 10)
						},
						vertexPos:function(pos) {
							//return pos
							this.pos = pos
							let cen = vec2(this.viewSpace.x * .5, this.viewSpace.y * .53)
							this.scale((this.bouncy * 0.8 + 1.5), cen.x, cen.y)
							this.rotate(this.bouncy * .25, cen.x, cen.y)
							return this.pos
						},
					}),
				},
				onDraw:function() {
					this.beginBg()
					this.drawText({text:this.text})
					this.endBg()
				}
			}),
			
		}
	}
	
	onDraw() {
		for(var i = 0;i < 1;i ++ )
		this.drawSplash({id:i, text:'   NEVERMIND\nTHE BUZZWORDS!'})
	}
}