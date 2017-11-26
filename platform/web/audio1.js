// define a node class
class AudioNode extends require('/platform/kernelclassjs'){
	
	prototype(){
	}

	constructor(){
		super()
	}
}

module.exports = class extends require('/platform/service'){
	
	constructor(...args){
		super(...args)

		this.name = 'audio1'
		// lets create an audio context
		this.parentAudio = this.parent && this.parent.services[this.name]
		this.context = this.parentAudio && this.parentAudio.addChild(this) || new (window.AudioContext || window.webkitAudioContext)()

		this.flows = {}
		this.queue = []
		this.children = []
		if(!this.root.isIOSDevice){
			this.initialized = true
		}

		// pass in the ByteCode API we use
		this.args.audio1 = {
			kernelClassIds:AudioNode.JSCompiler.prototype.kernelClassIds
		}
	}

	addChild(child){
		this.children.push(child)
		return this.context
	}

	onInit(){
		this.initialized = true
		for(let i = 0; i < this.children.length; i++){
			this.children[i].onInit()
		}
		for(let i = 0; i < this.queue.length; i++){
			this.onMessage(this.queue[i])
		}
	}

	// initialize audio on iOS
	onTouchEnd(){
		if(this.initialized) return
 		var o = this.context.createOscillator()
 		o.frequency.value = 500
 		o.connect(this.context.destination)
 		o.start(0)
 		o.stop(0)
 		this.onInit()
	}
	
	onMessage(msg){
		if(!msg) return
		if(!this.initialized){
			this.queue.push(msg)
		}
		else super.onMessage(msg)
	}

	user_compileClass(data){
		// lets make a new class
		class AudioClass extends AudioNode{
		}
	
		AudioClass.prototype.$classId = data.classId
		AudioClass.prototype.$compileClass(data)

		// do something with it
		var x = new AudioClass()
		console.log(x)
		//console.log(x._start(15))
		// compile a class
		// each class has a symbol and a type map
	}
}
