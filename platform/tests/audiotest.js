new require('styles/dark')
var audio = require('services/audio')

module.exports = class extends require('base/app'){

	prototype(){
		this.nest = {
			Player:audio.AudioNode.extend({
				nest:{
					Blip:audio.AudioNode.extend({
						init(){
							
						}
						/*
						init(){
							this.osc = new this.Osc()
							this.gain = new this.Gain()
						},
						connect(to = this.output){
							this.gain.connect(to)
							this.osc.connect(this.gain)
						},
						get frequency(){return this.osc.frequency},
						get volume(){return this.gain.gain},
						start(t = 0.){ // type inferred entirely
							this.osc.start(t)
							this.gain.start(t)
						}*/
					})
				},

				notes:Type.struct({ // auto process js objects into structs, automatically becoming an array
					key:Type.float,
					vel:Type.float,
					len:Type.float
				}).array,
				start(t = 0.){
					// what do we do with this.
					this.t = this.Blip()

					// it should define a property t on this
					// with type Blip
					// THIS_SET+nameId + operator + value 
					//this.b.prop = 10
					
					// what is the simplest solution
					// straightup dump it into the ast serialization.


					// valid.. b is now of type Blip
					//var x = this.b 


					// member is not it its the higher level.
					// 
					// NEW_OBJECT + classId + args


					// now b is a pointer-to-a-Blip
					// and these things spawn in ownership pools of this object.
					// we should do the same with textures / buffers / etc

					//return 1.+1.+1.
					// ok so object references, can we stuff those in datastructures?

					//sleep(t)
					//sleep(t) // sleep until t
					//for(var note of this.notes){
						// lets play this note
						// var b = new this.Blip()
						// b.frequency.value = this.freq(note.key)
						// b.volume.value = note.vel
						// b.connect()
						// b.start()
						// // wait for the next note? with duration?
						//sleep(note.len)
					//}
				}
			})
		}
	}

	constructor(){
		super()
		
		this.startPlayer({
			notes:[
				{key:60, vel:1., len:1.},
				{key:62, vel:1., len:1.}
			]
		})
	}

	onDraw(){
	}
}