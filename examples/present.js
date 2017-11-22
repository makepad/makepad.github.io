new require('styles/dark')

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.props = {
			page:_=module.worker.page || 0
		}
		this.nest = {
			Bg    :{
				padding:[10, 0, 0, 10]
			},
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
						shadowBlur  :8.0,
						shadowSpread:0.,
						shadowOffset:[2., 2],
						dy          :-14.1,
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
			{h:"Why webGL", q:"- Sliders\n- Windtree\n- Circles\n"},
			{h:"Overview", q:"- All in web-browser, mobile\n- Multithreaded\n- Type Inference JS to shaders\n- AST Code editor\n- Class composition\n- Layout\n- Main UI\n- Future\n"},
			{h:"Multithreading", q:"- Main browser thread: renderer\n- Worker 1: Editor\n- Worker 2: User programs\n\n- Commandbuffer trees\n- Recover process\n- Main thread is msg based services\n"},
			{h:"Type inferencing JS", q:"- Class based shaders\n- Typed JS\n", c:'vec4 thisDOTpixel_T(){\n' + 
				'  thisDOTviewport_T_vec2(thisDOTmesh.xy);\n' + 
				'  thisDOTtranslate_T_float_float(0.5,0.5);\n' + 
				'  thisDOTcircle_T_float_float_float(0.0,0.0,0.35);\n' + 
				'  vec2 p = thisDOTpos;\n' + 
				'  thisDOTshape += 0.05 * abs(sin(atan(p.y, p.x) * 8.0 + thisDOTtime * 8.0));\n' + 
				'  thisDOTfillKeep_T_vec4(thisDOTfillColor);\n' + 
				'  thisDOTstrokeKeep_T_vec4_float(vec4(0.26666666666666666,1,1,1),0.02);\n' + 
				'  thisDOTshape += 0.08;\n' + 
				'  thisDOTstrokeKeep_T_vec4_float(vec4(1,0,0,1),0.03);\n' + 
				'  thisDOTblur = 0.2;\n' + 
				'  thisDOTglow_T_vec4_float(vec4(1,1,1,1),0.1);\n' + 
				'  return thisDOTresult;\n' + 
				'}'},
			{h:"AST Code editor", q:"- On key down cycle\n- Parse and runtime errors\n- AST editing tools"},
			{h:"Class composition", q:"- Nested classes compose everything\n- Replacement for CSS\n- GPU animation engine"},
			{h:"Layout engine", q:"- Shop\n- Inline layout engine, in drawflow\n- Can move after, not resize"},
			{h:"Main UI", q:"- PEG code flow\n- Audio editor\n- Packager\n- Recursive\n"},
			{h:"Future", q:"- Finish UI kit\n- Visual editors for AST\n- Audio API\n- Online service makepad.io\n\nTwitter:@rikarends\ngithub: github.com/makepad\nAll apache2/MIT"},
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
			this.drawSplash({id:0, text:'Makepad'})
		}
		else {
			
			this.drawText({
				fontSize:50 * scale,
				margin  :[0, 0, 0, 0],
				align   :[0., 0],
				text    :this.pages[this.page - 1].h
			})
			this.lineBreak()
			this.turtle.wy += 40
			this.drawText({
				fontSize:32 * scale,
				margin  :[0, 0, 0, 0],
				text    :this.pages[this.page - 1].q
			})
			this.turtle.wy += 20
			this.drawText({
				fontSize:20 * scale,
				margin  :[0, 0, 0, 0],
				text    :this.pages[this.page - 1].c
			})
			var end = new Date(2017, 5, 8, 14, 45, 0)
			var t = end.getTime() - Date.now()
			this.drawText({
				fontSize:20 * scale,
				margin  :[0, 10, 10, 40],
				align   :[1., 1.],
				text    :'' + floor((t / 60000) * 10) / 10,
			})
		}
		this.endBg()
		setTimeout(_=>{this.redraw()}, 1000)
	}
}