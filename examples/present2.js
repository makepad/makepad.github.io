new require('styles/dark')

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.props = {
			page:_=module.worker.page || 0
		}
		this.nest = {
			Splash:require('base/view').extend({
				props :{text:'HI'},
				nest :{
					Bg  :require('shaders/quad').extend({
						padding  :130,
						fillColor:'orange',
						//dump     :1,
						pixel    :function() {$
							this.viewport(this.mesh.xy)
							this.translate(.5, .5)
							this.circle(0., 0., .35) //+sin(this.time*8))
							let p = this.pos
							this.shape += 0.05 * abs(sin(atan(p.y, p.x) * 8 + this.time * 1))
							this.fillKeep(this.fillColor)
							this.strokeKeep('#44ffff', .02)
							this.shape += 0.08
							this.strokeKeep('blue', .03)
							this.blur = 0.1
							this.glow('white', 0.1)
							return this.result
						}
					}),
					Text:require('shaders/text').extend({
						font        :require('fonts/ubuntu_monospace_256.font'),
						fontSize    :62,
						align       :[0.5, 0.5],
						boldness    :0.,
						outlineWidth:0.04,
						color       :'#ffffffff',
						shadowColor :'#00000099',
						shadowBlur  :1.0,
						shadowSpread:0.,
						shadowOffset:[2., 2],
						dy          :-4.1,
						lineSpacing :0.9,
						outlineColor:'#000000ff',
						vertexStyle :function() {$
							let b = this.bouncy = abs(sin(this.time))
							this.shadowOffset = vec2(b * 10, b * 10)
						},
						vertexPos   :function(pos) {$
							//return pos
							this.pos = pos
							let cen = vec2(this.viewSpace.x * .5, this.viewSpace.y * .53)
							this.scale((this.bouncy * .8 + 1.5), cen.x, cen.y)
							this.rotate(this.bouncy * .25, cen.x, cen.y)
							return this.pos
						},
					}),
				},
				onDraw:function() {
					this.beginBg({fillColor:this.color})
					this.drawText({text:this.text})
					this.endBg()
				}
			}),
			
		}
	}
	
	constructor() {
		super()
		/*
		Makepad
		
		*/
		this.pages = [
			{h:"What is a computer", q:"- A very fast fileclerk\n"},
			{h:"What computes?", q:"- a Central Processing Unit (CPU)\n- a Graphics Processing Unit (GPU)"},
			{h:"How do we program them?", q:"- Programming languages\n - JavaScript\n - Java\n - Python\n - Ruby"},
			{h:"What is the web", q:"- Network of computers with\n- Servers (databases, etc)\n- Clients (webbrowser)"},
			{h:"What is JS", q:"- Programming language that runs in the browser"}
		]
	}
	
	onKeyDown(e) {
		if(e.name === 'leftArrow') {
			this.page = max(0, this.page - 1)
		}
		if(e.name === 'rightArrow') {
			this.page = min(this.pages.length, this.page + 1)
		}
		
		module.worker.page = this.page
		this.redraw()
	}
	
	onDraw() {
		this.beginBg({
			color:'#1e191eff',
			w    :'100%',
			h    :'100%'
		})
		var scale = 0.6
		var panel = 300
		_=this.page
		if(this.page == 0) {
			this.drawSplash({id:0, text:'JavaScript'})
		}
		else {
			
			this.drawText({
				fontSize:50 * scale,
				margin  :[0, 0, 0, 40],
				align   :[0., 0],
				text    :this.pages[this.page - 1].h
			})
			this.lineBreak()
			this.turtle.wy += 40
			this.drawText({
				fontSize:32 * scale,
				margin  :[0, 0, 0, 40],
				text    :this.pages[this.page - 1].q
			})
			this.turtle.wy += 20
			this.drawText({
				fontSize:20 * scale,
				margin  :[0, 0, 0, 40],
				text    :this.pages[this.page - 1].c
			})
		}
		this.endBg()
	}
}