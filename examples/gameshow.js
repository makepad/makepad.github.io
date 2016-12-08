new require('styles/dark')
let audio = require('services/audio')
let socket = require('services/socket')
let wav = require('parsers/wav')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.props = {
			winner: - 1,
			page:0
		}
		this.tools = {
			Splash:require('base/view').extend({
				props:{text:'HI'},
				tools:{
					Bg:require('shaders/quad').extend({
						padding:130,
						fillColor:'orange',
						pixel:function() {$
							this.viewport(this.mesh.xy)
							this.translate(.5, .5)
							this.circle(0., 0., .35) //+sin(this.time*8))
							let p = this.pos
							this.shape += 0.05 * abs(sin(atan(p.y, p.x) * 8 + this.time * 8))
							this.fillKeep(this.fillColor)
							this.strokeKeep('#44ffff', .02)
							this.shape += 0.08
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
						outlineWidth:0.04,
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
					this.beginBg({fillColor:this.color})
					this.drawText({text:this.text})
					this.endBg()
				}
			}),
			
		}
	}
	
	constructor() {
		super()
		audio.reset()
		
		this.coinUp = new audio.Flow({buffer1:{data:require('/examples/cash.wav', wav.parse)}})
		this.coinDown = new audio.Flow({buffer1:{data:require('/examples/cow.wav', wav.parse)}})
		this.snds = [
			new audio.Flow({buffer1:{data:require('/examples/horn.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/baby.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/bicycle.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/chicken.wav', wav.parse)}}),
			
		]
		
		var flen = .1 * 44100
		var freqUp = new Float32Array(flen)
		for(let i = 0;i < flen;i ++ ){
			freqUp[i] = ((flen - i) / flen * 0.05)
		}
		// lets set up microphones
		
		this.recFlow = new audio.Flow({
			delay1:{
				to:'output'
			},
			gain1:{
				to:'output',
				gain:1.0,
			},
			gain2:{
				to:'delay1.delayTime',
			},
			buffer1:{
				to:'gain2',
				data:[freqUp],
				loop:true
			},
			input1:{
				to:'gain1',
				device:'Mic1'
			},
			input2:{
				to:'gain1',
				device:'Mic2'
			},
			input3:{
				to:'gain1',
				device:'Mic3'
			}
		})
		
		this.players = [
			{name:"Player1", ctrl:0, buzzer:2, button:1, sound:0, score:0, color:'#c33'},
			{name:"Player2", ctrl:0, buzzer:2, button:2, sound:1, score:0, color:'#3c3'},
			{name:"Player3", ctrl:0, buzzer:2, button:3, sound:2, score:0, color:'#33c'},
			{name:"Player4", ctrl:0, buzzer:2, button:4, sound:3, score:0, color:'#cc3'}
		]
		
		this.questions = [
			{h:"Syntax", q:"Why is null an object"},
			{h:"Promises", q:"What is christmas tree\nprogramming?"},
			{h:"Promises", q:"Why do promises\neat exceptions?"},
			{h:"Generators", q:"What happens if you combine\na generator and a promise?"},
			{h:"Generators", q:"What do generators generate?"},
			{h:"Iterators", q:"Enact iterators with your team"},
			{h:"Iterators", q:"Why are iterators a protocol?"},
			{h:"Arrow functions", q:"Say lambda 5 times real fast"},
			{h:"Arrow functions", q:"What is this?"},
			{h:"Classes", q:"Explain prototypes\nin 2 sentences"},
			{h:"Classes", q:"Are classes prototypes?"},
			{h:"Template literals", q:"Whats literal about\na template literal?"},
			{h:"Template literals", q:"Whats the next biggest\nuse of the backtick"},
			{h:"Modules", q:"What does static analysis mean"},
			{h:"Final Score", q:""},
		]
		
		this.recFlow.start()
		//socket.postMessage({controller:0,buzzer:0,led:true})
		this.show = ""
		
		this.winner =  - 1
		
		socket.onMessage = msg=>{
			if( ! msg.state) return
			// fix player selector based on buzzer
			for(let i = 0;i < this.players.length;i ++ ){
				let player = this.players[i]
				if(player.ctrl == msg.controller && player.buzzer == msg.buzzer && player.button == msg.button) {
					this.playerWin(i)
					break
				}
			}
			
		}
		
		this.page = 0
	}
	
	playerWin(id) {
		if(this.winner !==  - 1) return
		
		this.winner = id
		
		let player = this.players[this.winner]
		
		this.snds[player.sound].play()
		
		socket.postMessage({
			controller:player.ctrl,
			buzzer:player.buzzer,
			led:true
		})
	}
	
	lightsOff() {
		this.winner =  - 1
		for(let i = 0;i < 4;i ++ ){
			socket.postMessage({
				controller:0,
				buzzer:i,
				led:false
			})
		}
	}
	
	playerScore(index, add) {
		if(add > 0) this.coinUp.play()
		else this.coinDown.play()
		let player = this.players[index]
		if(player) player.score += add
		this.redraw()
	}
	
	onKeyDown(e) {
		
		var fake = {q:0, w:1, e:2, r:3}
		if(fake[e.name] !== undefined) {
			return this.playerWin(fake[e.name])
		}
		this.lightsOff()
		if(e.name.indexOf('num') === 0) {
			console.log(e.name, e.name.slice(2))
			this.playerScore(parseInt(e.name.slice(3)) - 1, e.shift? - 1:1)
		}
		if(e.name === 'leftArrow') {
			this.page = max(0, this.page - 1)
		}
		if(e.name === 'rightArrow') {
			this.page = min(this.questions.length, this.page + 1)
		}
	}
	
	onDraw() {
		//for(var i=0;i<1;i++)
		if(this.page == 0) {
			this.drawSplash({id:0, text:'Never mind the\n   Buzzwords'})
		}
		else {
			
			for(let i = 0;i < this.players.length;i ++ ){
				let player = this.players[i]
				this.beginBg({
					align:[0., 1],
					color:player.color,
					margin:5,
					padding:15,
					w:'200'
				})
				this.drawText({
					align:[1, 0],
					fontSize:20,
					order:1,
					text:'' + player.score
				})
				this.drawText({
					fontSize:20,
					align:[0, 0],
					order:1,
					text:player.name
				})
				
				this.endBg()
			}
			this.drawText({
				fontSize:50,
				margin:[0, 0, 0, 40],
				align:[0., 0],
				text:this.questions[this.page - 1].h
			})
			this.lineBreak()
			this.turtle.wy += 40
			this.drawText({
				fontSize:32,
				margin:[0, 0, 0, 40],
				text:this.questions[this.page - 1].q
			})
			
			// draw players points
			let winner = this.players[this.winner]
			if(winner) {
				this.drawSplash({id:1, x:100, y:120, color:winner.color, text:winner.name})
			}
		}
		//this.drawSplash({id:0,text:'hi'+this.show})
	}
}