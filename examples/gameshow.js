new require('styles/dark')
let audio = require('services/audio')
let socket = require('services/socket')
let wav = require('parsers/wav')

class Base{
	constructor() {}
}

class Example extends Base{
	constructor() {
		super()
		// only available AFTER super!
		this.prop = 10
	}
	
	method() {
		super.method()
	}
	
	get prop() {
		return 10
	}
	
	set prop(v) {
		this._prop = v
	}
	
	static stMethod() {
		//exists as:
		Example.stMethod()
	}
	
	syntax(...rest) {
		const t = 20
		t = 30 //exception
		// let scope bound
		for(let i = 0;i < 10;i++){
			
		}
		// splatting array into arguments
		callSomething(...rest)
		
		// destructuring
		var c = {key:1}
		var {key:varName} = c
		var [a] = c
	}
	
	arrow() {
		// short notation
		[1, 2, 3].map(value=>value + 10)
		
		let longer = (a, b, c) =>{
			this.prop = 10
			return 10
		}
	}
	
	promises() {
		
		let prom = new Promise(resolve, reject=>{
			asyncOp(result=>{
				resolve('my value')
			})
		})
		
		prom.then(result=>{
			return otherProm()
		}, error=>{
			
		}).then(next=>{
			// return of otherProm
		})
		
		//  use of all
		let promises = []
		Promise.all(promises).then(results=>{
			
		})
		
	}
	
	iterators() {
		let a = [1, 2, 3]
		for(let i of a){
			// 1,2,3
		}
	}
	
	generators() {
		
		function *gen() {
			yield 1
			let t = yield 2 //t=10
			yield *[3, 4, 5]
		}
		// direct use:
		var iter = gen()
		iter.next().value
		iter.next(10).value
		//or
		for(let i of gen()){
			// i = 1, 2 
		}
		
		// use with promises
		function *async() {
			yield asyncOp1()
			yield asyncOp2()
			yield asyncOp3()
		}
		asyncStepper(async())
		
	}
	
	literals() {
		// normal templates
		let prop = 10
		// tagged templates
		function tag(strings, ...values) {
			return 'processed'
		}
		var a = `text${prop}text`
		var b = tag`template${value}text`
		var c = 'normal'
	}
	
	modules() {
		module.exports = test
		// export test
		
		const prop = require('module').prop
		// import prop from "module"
		
		// import {a,b} from "module"
		// import * as obj from "module"
	}
	
	WeakMap() {
		let someObj = {}
		var wm = new WeakMap()
		wm.set(someObj, "data")
		wm.get(someObj)
		
		var ws = new WeakSet()
		ws.add(someObj)
		
		var m = new Map()
		m.set("key", value)
		
		var s = new Set()
		s.add("uniquekey")
		s.has("uniquekey") === true
	}
	
}

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.props = {
			winner:-1,
			page  :0
		}
		this.tools = {
			Splash:require('base/view').extend({
				props :{text:'HI'},
				tools :{
					Bg  :require('shaders/quad').extend({
						padding  :130,
						fillColor:'orange',
						pixel    :function() {$
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
						fontSize    :32,
						align       :[0.5, 0.5],
						boldness    :0.,
						outlineWidth:0.04,
						shadowColor :'#0009',
						shadowBlur  :1.0,
						shadowSpread:0.,
						shadowOffset:[2., 2],
						dy          :-4.1,
						lineSpacing :0.9,
						outlineColor:'black',
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
		audio.reset()
		
		this.coinUp = new audio.Flow({buffer1:{data:require('/examples/cash.wav', wav.parse)}})
		this.coinDown = new audio.Flow({buffer1:{data:require('/examples/sad.wav', wav.parse)}})
		this.snds = [
			new audio.Flow({buffer1:{data:require('/examples/horn.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/baby.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/bicycle.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/chicken.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/fart.wav', wav.parse)}}),
			new audio.Flow({buffer1:{data:require('/examples/cow.wav', wav.parse)}}),
		]
		
		var flen = .1 * 44100
		var freqUp = new Float32Array(flen)
		for(let i = 0;i < flen;i++){
			freqUp[i] = ((flen - i) / flen * 0.05)
		}
		// lets set up microphones
		
		this.recFlow = new audio.Flow({
			delay1 :{
				to:'output'
			},
			gain1  :{
				to  :'output',
				gain:1.0,
			},
			gain2  :{
				to:'delay1.delayTime',
			},
			buffer1:{
				to  :'gain2',
				data:[freqUp],
				loop:true
			},
			input1 :{
				to    :'gain1',
				device:'Mic1'
			},
			input2 :{
				to    :'gain1',
				device:'Mic2'
			},
			input3 :{
				to    :'gain1',
				device:'Mic3'
			}
		})
		
		this.teams = [
			{name:"Team1", color:'#7', players:[
				{name:"Player1", ctrl:0, buzzer:1, button:0, sound:0, score:0, color:'#c33'},
				{name:"Player2", ctrl:0, buzzer:2, button:0, sound:1, score:0, color:'#3c3'},
				{name:"Player3", ctrl:0, buzzer:3, button:0, sound:2, score:0, color:'#33c'},
			]},
			{name:"Team2", color:'#6', players:[
				{name:"Player4", ctrl:1, buzzer:0, button:0, sound:3, score:0, color:'#cc3'},
				{name:"Player5", ctrl:1, buzzer:1, button:0, sound:4, score:0, color:'#3cc'},
				{name:"Player6", ctrl:1, buzzer:2, button:0, sound:5, score:0, color:'#c3c'}
			]}
		]
		
		this.controller = {
			ctrl  :0,
			buzzer:0,
			button:0
		}
		this.page = 0
		this.questions = [
			{h:"Classes", q:""},
			{h:"Classes", q:"Explain prototypes\nin 2 sentences"},
			{h:"Classes", q:"Whats classy about prototypes"},
			{h:"Classes", q:"Examples"},
			{h:"Syntax", q:""},
			{h:"Syntax", q:"What is hoisting?"},
			{h:"Syntax", q:"arguments ...what?"},
			{h:"Syntax", q:"Examples"},
			{h:"Arrow functions", q:""},
			{h:"Arrow functions", q:"Say lambda 5 times real fast"},
			{h:"Arrow functions", q:"What is this?"},
			{h:"Arrow functions", q:"Examples"},
			{h:"Promises", q:""},
			{h:"Promises", q:"What is christmas tree\nprogramming?"},
			{h:"Promises", q:"Whats exceptional about a promise?"},
			{h:"Promises", q:"Examples"},
			{h:"Iterators", q:""},
			{h:"Iterators", q:"Act out a for loop"},
			{h:"Iterators", q:"Examples"},
			{h:"Generators", q:""},
			{h:"Generators", q:"Whats the promise of a generator"},
			{h:"Generators", q:"Generate something"},
			{h:"Generators", q:"Examples"},
			{h:"Template literals", q:""},
			{h:"Template literals", q:"Whats literal about\na template literal?"},
			{h:"Template literals", q:"Whats the next biggest\nuse of the backtick"},
			{h:"Template literals", q:"Examples"},
			{h:"Modules", q:""},
			{h:"Modules", q:"How do you analyse static"},
			{h:"Modules", q:"Examples"},
			{h:"Structures", q:""},
			{h:"Structures", q:"Whats weak about a WeakMap"},
			{h:"Structures", q:"Examples"},
			{h:"Final Score", q:""},
		]
		
		this.recFlow.start()
		//socket.postMessage({controller:0,buzzer:0,led:true})
		this.show = ""
		
		this.winner = null
		
		socket.onMessage = msg=>{
			if(!msg.state) return
			console.log(msg)
			let ctrl = this.controller
			if(msg.controller === ctrl.ctrl && msg.buzzer === ctrl.buzzer && msg.button === ctrl.button) {
				this.lightsOff()
				return
			}
			// fix player selector based on buzzer
			for(let t = 0;t < this.teams.length;t++){
				let team = this.teams[t]
				for(let i = 0;i < team.players.length;i++){
					let player = team.players[i]
					if(player.ctrl == msg.controller && player.buzzer == msg.buzzer && player.button == msg.button) {
						this.playerWin(player)
						break
					}
				}
			}
		}
		
		
	}
	
	playerWin(player) {
		if(this.winner !== null) return
		
		this.winner = player
		this.snds[player.sound].play()
		
		socket.postMessage({
			controller:player.ctrl,
			buzzer    :player.buzzer,
			led       :true
		})
	}
	
	lightsOff() {
		this.winner = null
		for(let i = 0;i < 8;i++){
			socket.postMessage({
				controller:floor(i / 4),
				buzzer    :i & 3,
				led       :false
			})
		}
	}
	
	playerScore(player, add) {
		if(add > 0) this.coinUp.play()
		else this.coinDown.play()
		if(player) player.score += add
		this.redraw()
	}
	
	onKeyDown(e) {
		
		var fake = {q:[0, 0], w:[0, 1], e:[0, 2], r:[1, 0], t:[1, 1], y:[1, 2]}
		if(fake[e.name] !== undefined) {
			let id = fake[e.name]
			return this.playerWin(this.teams[id[0]].players[id[1]])
		}
		this.lightsOff()
		if(e.name.indexOf('num') === 0) {
			let id = parseInt(e.name.slice(3)) - 1
			let team = this.teams[floor(id / 3)]
			let player = team && team.players[id % 3]
			if(player) this.playerScore(player, e.shift?-1:1)
		}
		if(e.name === 'leftArrow') {
			this.page = max(0, this.page - 1)
		}
		if(e.name === 'rightArrow') {
			this.page = min(this.questions.length, this.page + 1)
		}
	}
	
	onDraw() {
		var scale = 0.6
		var panel = 300
		//for(var i=0;i<1;i++)
		let team = 0
		for(let t = 0;t < this.teams.length;t++){
			let total = 0
			let team = this.teams[t]
			for(let i = 0;i < team.players.length;i++){
				let player = team.players[i]
				total += player.score
				this.beginBg({
					align  :[t, 1],
					color  :player.color,
					down   :1,
					margin :2,
					padding:7,
					w      :panel * scale
				})
				this.drawText({
					align   :[1, 0],
					fontSize:20 * scale,
					order   :1,
					text    :'' + player.score
				})
				this.drawText({
					fontSize:20 * scale,
					align   :[0, 0],
					order   :1,
					text    :player.name
				})
				
				this.endBg()
			}
			this.beginBg({
				align  :[t, 1],
				down   :1,
				color  :team.color,
				margin :2,
				padding:7 * scale,
				w      :panel * scale
			})
			this.drawText({
				align   :[1, 0],
				fontSize:20 * scale,
				order   :1,
				text    :'' + total
			})
			this.drawText({
				fontSize:20 * scale,
				align   :[0, 0],
				order   :1,
				text    :team.name
			})
			
			this.endBg()
		}
		
		if(this.page == 0) {
			this.drawSplash({id:0, text:' Never Mind\nThe Buzzwords'})
			this.drawText({
				color   :'#7',
				margin  :[0, 0, 0, 10],
				fontSize:16 * scale,
				text    :"Arrow keys for pages\nQ W E R simulate buzzer\n1 2 3 4 add points\nOther keys reset buzzer"
			})
		}
		else {
			
			this.drawText({
				fontSize:50 * scale,
				margin  :[0, 0, 0, 40],
				align   :[0., 0],
				text    :this.questions[this.page - 1].h
			})
			this.lineBreak()
			this.turtle.wy += 40
			this.drawText({
				fontSize:32 * scale,
				margin  :[0, 0, 0, 40],
				text    :this.questions[this.page - 1].q
			})
			
			
		}
		// draw players points
		if(this.winner) {
			this.drawSplash({id:1, color:this.winner.color, text:this.winner.name})
		}
		//this.drawSplash({id:0,text:'hi'+this.show})
	}
}