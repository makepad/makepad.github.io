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
						outlineWidth:0.0,
						shadowColor:'red',
						shadowOffset:[1., 1],
						dy: - 4.1,
						lineSpacing:0.9,
						outlineColor:'black',
						vertexPos:function(pos) {
							//return pos
							this.pos = pos
							let cen = vec2(this.viewSpace.x * .5, this.viewSpace.y * .5)
							this.scale((abs(sin(this.time)) * 0.8 + 1.5), cen.x, cen.y)
							this.rotate(abs(sin(this.time)) * .5, cen.x, cen.y)
							return this.pos
						},
						pixel2:function() {
							this.viewport(this.mesh.xy)
							var field = ((.75 - texture2D(this.fontSampler, this.textureCoords.xy).r) * 0.5)
							//this.shape=1-sin(this.mesh.x*10.)*10
							this.shape = field
							this.shape -= 0.1
							//this.rect(0.,0.,1.,1.)
							this.fillKeep('white')
							this.stroke('black', 0.06)
							return this.result
						}
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