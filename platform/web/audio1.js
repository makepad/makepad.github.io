module.exports = require('/platform/service').extend(function audio1(proto, base){
	
	var getUserMedia = (navigator.getUserMedia ||
					navigator.webkitGetUserMedia ||
					navigator.mozGetUserMedia)

	proto.onConstruct = function(){
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

	proto.addChild = function(child){
		this.children.push(child)
		return this.context
	}

	proto.onInit = function(){
		this.initialized = true
		for(var i = 0; i < this.children.length; i++){
			this.children[i].onInit()
		}
		for(var i = 0; i < this.queue.length; i++){
			this.onMessage(this.queue[i])
		}
	}

	// initialize audio on iOS
	proto.onTouchEnd = function(){
		if(this.initialized) return
 		var o = this.context.createOscillator()
 		o.frequency = 500
 		o.connect(this.context.destination)
 		o.start(0)
 		o.stop(0)
 		this.onInit()
	}
	
	proto.onMessage = function(msg){
		if(!msg) return
		if(!this.initialized){
			this.queue.push(msg)
		}
		else base.onMessage.call(this,msg)
	}
	
	proto.user_reset = function(){
		for(var key in this.ids){
			var flow = this.ids[key]
			stopFlow(flow)
			delete this.ids[key]
		}
	}

	proto.user_init = function(msg){
		this.ids[msg.id] = {
			id:msg.id,
			config:msg.config
		}
	}

	function recorderOnAudioProcess(flow, name, e){
		var inBuf = e.inputBuffer
		var outBuf = e.outputBuffer
		// Loop through the output channels (in this case there is only one)
		var data = []
		for (var c = 0; c < outBuf.numberOfChannels; c++) {
			var inp = inBuf.getChannelData(c)
			var outp = outBuf.getChannelData(c)
			for (var s = inBuf.length-1; s>=0; s--) outp[s] = inp[s]
			data.push(inp)
		}

		this.postMessage({
			fn:'onRecorderData',
			id:flow.id,
			node:name,
			data:data
		})
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

	proto.spawnFlow = function(flow, overlay){
		
		// lets spawn all the nodes
		var nodes = flow.nodes = {}
		var flowConfig = flow.config
		for(var name in flowConfig){
			var nodeConfig = flowConfig[name]
			// overlay config vars
			var nodeOverlay = overlay[name]
			if(nodeOverlay){
				nodeConfig = Object.create(nodeConfig)
				for(var key in nodeOverlay){
					nodeConfig[key] = nodeOverlay[key]
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
				node = {config:nodeConfig, type:'gain', audioNode:this.context.createGain()}
			}
			else if(type === 'recorder'){
				node = {config:nodeConfig, type:'recorder', audioNode:this.context.createScriptProcessor(
					nodeConfig.chunk || 512,
					nodeConfig.channels || 2,
					nodeConfig.channels || 2
				)}
				node.audioNode.onaudioprocess = recorderOnAudioProcess.bind(this, flow, name)
			}
			else if(type === 'input'){
				node = {config:nodeConfig, type:'input'}
				getUserMedia.call(navigator, {audio:true}, function(flow, node, stream){
					node.audioNode = this.context.createMediaStreamSource(stream)
					// connect it lazily
					var to = flow.nodes[node.config.to]
					if(!to) console.log("input cannot connect to "+node.config.to)
					else node.audioNode.connect(to.audioNode)
				}.bind(this, flow, node), function(err){
					// error opening input. todo . fix.
				}.bind(this))
			}
			else if(type === 'buffer'){
				node = {config:nodeConfig, start:nodeConfig.start, type:'buffer', audioNode:this.context.createBufferSource()}
				var data = nodeConfig.data
				if(data){
					// lets copy the data into an audiobuffer
					var buffer = this.context.createBuffer(data.length, data[0].length, nodeConfig.rate)
					for(var i = 0; i < data.length; i++){
						buffer.copyToChannel(data[i], i)
					}
					node.audioNode.buffer = buffer
				}
				if(nodeConfig.loop !== undefined) node.audioNode.loop = nodeConfig.loop
				if(nodeConfig.loopStart !== undefined) node.audioNode.loopStart = nodeConfig.loopStart
				if(nodeConfig.loopEnd !== undefined) node.audioNode.loopEnd = nodeConfig.loopEnd
			}
			else if(type === 'biquad'){

			}
			else if(type === 'oscillator'){

			}

			nodes[name] = node
		}
		// then connect and config them all
		for(var name in nodes){
			var node = nodes[name]
			var audioNode = node.audioNode
			if(!audioNode) continue
			// lets apply config vars
			var config = node.config
			var nodeParams = nodeParamDefs[node.type]

			for(var key in nodeParams){
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
		for(var name in nodes){
			var node = nodes[name]
			if(node.start !== undefined){
				node.audioNode.start(node.start)
			}
		}

		flow.started = true
	}

	// lets spawn a flow
	proto.user_start = function(msg){
		var flow = this.ids[msg.id]
		if(flow.started){
			stopFlow(flow)
		}
		this.spawnFlow(flow, msg.overlay)
	}

	function stopFlow(flow){
		// lets terminate the whole thing
		for(var name in flow.nodes){
			var node = flow.nodes[name]
			if(node.audioNode && node.audioNode.disconnect){
				node.audioNode.disconnect()
				node.audioNode = undefined
			}
		}
		flow.started = false
	}

	// ok how do we stop this thing?
	proto.user_stop = function(msg){
		var flow = this.ids[msg.id]
		if(!flow.started) return
		stopFlow(flow)
	}

	/*
	proto.user_createOsc = function(msg){
		var n = this.context.createOscillator()
		this.ids[msg.id] = n
	}

	proto.user_createGain = function(msg){
		var n = this.context.createGain()
		this.ids[msg.id] = n
	}

	proto.user_createRecorder = function(msg){
		var n = this.context.createScriptProcessor(
			msg.chunk,
			msg.channels,
			msg.channels
		)
		this.ids[msg.id] = n
		n.onaudioprocess = function(e){
			var inBuf = e.inputBuffer
			var outBuf = e.outputBuffer
			// Loop through the output channels (in this case there is only one)
			var data = []
			for (var c = 0; c < outBuf.numberOfChannels; c++) {
				var inp = inBuf.getChannelData(c)
				var outp = outBuf.getChannelData(c)
				for (var s = inBuf.length-1; s>=0; s--) outp[s] = inp[s]
				data.push(inp)
			}

			this.postMessage({
				fn:'onRecorderData',
				id:msg.id,
				data:data
			})
		}.bind(this)
	}

	proto.user_createInput = function(msg){
		var ph = this.ids[msg.id] = {queue:[]}

		 var getUserMedia = (navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia)

		getUserMedia.call(navigator, {audio:true}, function(stream){
			if(!this.ids[msg.id]) return
			var n = this.context.createMediaStreamSource(stream)
			this.ids[msg.id] = n 
			if(ph.queue){
				for(var i = 0; i < ph.queue.length; i++){
					this.onMessage(ph.queue[i])
				}
			}
		}.bind(this), function(err){

		})
	}

	proto.user_createPlayer = function(msg){
		var n = this.context.createBufferSource()
		this.ids[msg.id] = n
	}

	proto.user_createBuffer = function(msg){
		var n = this.context.createBuffer(msg.channels, msg.samples, msg.rate)
		this.ids[msg.id] = n
	}

	proto.user_updateBuffer = function(msg){
		var buf = this.ids[msg.id]
		var chans = buf.numberOfChannels
		var o = msg.offset
		for(var c = 0; c < chans; c++){
			var of32 = buf.getChannelData(c)
			var if32 = msg.data[c]
			for(var i = if32.length - 1; i >= 0; i--){
				of32[o+i] = if32[i]
			}
		}
		if(buf.dest){
			buf.dest.buffer = buf
		}
	}

	proto.user_setBuffer = function(msg){
		var dst = this.ids[msg.id]
		if(dst.queue) return dst.queue.push(msg)
		var buf = this.ids[msg.bufferId]
		dst.buffer = buf
		// lets mark the buffer as readonly
		// meaning we need to copy it next updateBuffer

	}

	proto.user_connect = function(msg){
		var src = this.ids[msg.srcId]
		var dst = this.ids[msg.dstId]
		if(src.queue){
			src.queue.push(msg)
			return
		}
		if(!dst)dst = this.context.destination
		src.connect(dst)
	}

	proto.user_startNode = function(msg){
		var dst = this.ids[msg.id]
		if(dst.queue) return dst.queue.push(msg)
		
		if(typeof msg.value !== 'number'){
			if(dst.wasStarted){
				dst.stop()
				dst.wasStarted = false
			}
		}
		else{
			dst.wasStarted = true
			dst.start(msg.value)
		}
	}

	proto.user_setLoop = function(msg){
		var dst = this.ids[msg.id]
		dst.loop = msg.value
	}

	proto.user_setValue = function(msg){
		var dst = this.ids[msg.id]
		if(dst.queue) return dst.queue.push(msg)

		var key = msg.key
		dst[key].value = msg.value
	}*/
})
