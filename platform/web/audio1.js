module.exports = class extends require('/platform/service'){
	
	constructor(...args){
		super(...args)
		this.name = 'audio1'
		// lets create an audio context
		this.parentAudio = this.parent && this.parent.services[this.name]
		this.context = this.parentAudio && this.parentAudio.addChild(this) || new (window.AudioContext || window.webkitAudioContext)()
		this.ids = {}
		this.queue = []
		this.children = []
		if(!this.root.isIOSDevice){
			this.initialized = true
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
	
	user_reset(){
		for(let key in this.ids){
			var flow = this.ids[key]
			stopFlow(flow)
			delete this.ids[key]
		}
	}

	user_init(msg){
		this.ids[msg.id] = {
			id:msg.id,
			config:msg.config
		}
	}

	spawnFlow(flow, overlay){
		
		// lets spawn all the nodes
		var nodes = flow.nodes = {}
		var flowConfig = flow.config
		for(let name in flowConfig){
			var conf = flowConfig[name]
			// overlay config vars
			var nodeOverlay = overlay[name]
			if(nodeOverlay){
				conf = Object.create(conf)
				for(let key in nodeOverlay){
					conf[key] = nodeOverlay[key]
				}
			}
			// rip off the number of a node name
			for(var j = 0, l = name.length; j < l; j++){
				var code = name.charCodeAt(j)
				if(code>=48 && code <=57) break
			}

			var type = name.slice(0,j)
			var node

			if(type === 'gain'){
				node = {config:conf, type:'gain', audioNode:this.context.createGain()}
			}
			else if(type === 'recorder'){
				node = {config:conf, type:'recorder', audioNode:this.context.createScriptProcessor(
					conf.chunk || 2048,
					conf.channels || 2,
					conf.channels || 2
				)}
				node.audioNode.onaudioprocess = recorderOnAudioProcess.bind(this, flow, name)
			}
			else if(type === 'input'){
				node = {config:conf, type:'input'}
				getUserMedia.call(navigator, {audio:true}, function(flow, node, stream){
					node.audioNode = this.context.createMediaStreamSource(stream)
					// connect it lazily
					node.stream = stream
					var to = flow.nodes[node.config.to]
					if(!to) console.log("input cannot connect to "+node.config.to)
					else node.audioNode.connect(to.audioNode)
				}.bind(this, flow, node), function(err){
					// error opening input. todo . fix.
				}.bind(this))
			}
			else if(type === 'buffer'){
				var bufsrc = this.context.createBufferSource()
				node = {
					config:conf, 
					start:conf.start, 
					type:'buffer', 
					audioNode:bufsrc
				}
				var data = conf.data
				if(data && data.length && data[0].length){
					// lets copy the data into an audiobuffer
					var buffer = this.context.createBuffer(data.length, data[0].length, Math.max(Math.min(conf.rate,192000),3000))
					for(let i = 0; i < data.length; i++){
						var out = buffer.getChannelData(i)
						var inp = data[i]
						for (var c = 0, cl = inp.length; c < cl; c++){
							out[c] = inp[c]
						}
					}
					bufsrc.buffer = buffer
				}
				if(conf.loop !== undefined) bufsrc.loop = conf.loop
				if(conf.loopStart !== undefined) bufsrc.loopStart = conf.loopStart
				if(conf.loopEnd !== undefined) bufsrc.loopEnd = conf.loopEnd
				if(conf.playbackRate !== undefined) bufsrc.playbackRate.value = conf.playbackRate 
			}
			else if(type === 'biquad'){

			}
			else if(type === 'oscillator'){

			}

			nodes[name] = node
		}
		// then connect and config them all
		for(let name in nodes){
			var node = nodes[name]
			var audioNode = node.audioNode
			if(!audioNode) continue
			// lets apply config vars
			var config = node.config
			var nodeParams = nodeParamDefs[node.type]

			for(let key in nodeParams){
				var value = config[key]
				if(value === undefined) continue
				// set the value. TODO add node param sequencing
				audioNode[key].value = value
			}

			if(config.to === 'output'){
				audioNode.connect(this.context.destination)
			}
			else{
				var to = nodes[config.to]
				if(!to) console.log(name + " cannot connect to "+config.to)
				else audioNode.connect(to.audioNode)
			}
		}
		// we need to start the nodes we are supposed to start
		for(let name in nodes){
			var node = nodes[name]
			if(node.start !== undefined){
				node.audioNode.start(node.start)
			}
		}

		flow.started = true
	}

	// lets spawn a flow
	user_start(msg){
		var flow = this.ids[msg.id]
		if(flow.started){
			stopFlow(flow)
		}
		this.spawnFlow(flow, msg.overlay)
	}

	// ok how do we stop this thing?
	user_stop(msg){
		var flow = this.ids[msg.id]
		if(!flow.started) return
		stopFlow(flow)
	}

	user_trigger(msg){
		var flow = this.ids[msg.id]
		this.spawnFlow(flow, msg.overlay)
	}
}

var getUserMedia = (navigator.getUserMedia ||
				navigator.webkitGetUserMedia ||
				navigator.mozGetUserMedia)

function recorderOnAudioProcess(flow, name, e){
	var inBuf = e.inputBuffer
	var outBuf = e.outputBuffer
	// Loop through the output channels (in this case there is only one)
	var data = []
	for (var c = 0; c < outBuf.numberOfChannels; c++) {
		var inp = inBuf.getChannelData(c)
		var outp = outBuf.getChannelData(c)
		var cpy = new Float32Array(inBuf.length)
		for (var s = inBuf.length-1; s>=0; s--){
			cpy[s] = outp[s] = inp[s]
		}
		data.push(cpy)
	}
	
	// we have to sync this thing to the renderer

	this.postMessage({
		fn:'onRecorderData',
		pileupTime:Date.now(),
		id:flow.id,
		node:name,
		data:data
	})
}

function stopFlow(flow){
	// lets terminate the whole thing
	for(let name in flow.nodes){
		var node = flow.nodes[name]
		if(node.stream){
			// stop any running streams
			var tracks = node.stream.getAudioTracks()
			for(let i = 0;i < tracks.length; i++){
				tracks[i].stop()
			}
		}
		if(node.audioNode && node.audioNode.disconnect){
			node.audioNode.disconnect()
			node.audioNode = undefined
		}
	}
	flow.started = false
}


var nodeParamDefs = {
	gain:{
		gain:1
	},
	buffer:{
		detune:1,
		playbackRate:1
	}
}