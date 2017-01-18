
module.exports = class extends require('/platform/service'){
	
	constructor(...args){
		super(...args)
		this.name = 'cameras1'
		this.deviceIds = {}
		this.started = {}
	}

	onExternalTexture(tex, external, frameId){
		// update the texture
		var item = this.started[external.id]
		item.isTexture = true
		let video = item.video
		if(video && video.readyState === video.HAVE_ENOUGH_DATA){
			// lets check if our framerate delta is ok
			tex.image = item.video
			tex.updateId = frameId
			// if we have a video we should repaint
		}
		if(item.fps === 60) return true
	}

	user_enumerate(msg){
		navigator.mediaDevices.enumerateDevices().then( infos=>{
			let nameless = 0
			let labels = []
			for(let i = 0; i < infos.length; i++){
				if(infos[i].kind !== 'videoinput') continue
				let label = infos[i].label
				if(!label) label = 'video'+(nameless++)
				labels.push(label)
				this.deviceIds[label] = infos[i].deviceId
			}
			this.postMessage({
				fn:'onEnum',
				id:msg.id,
				labels:labels
			})
		})
	}

	user_stop(msg){
		let old = this.started[msg.id]
		if(!old || !old.video) return
		old.video.pause()
		clearInterval(old.interval)
		this.started[msg.id] = undefined
	}

	user_start(msg){
		function equals(a, b){
			if(typeof a === 'number') return a === b
			if(typeof a !== typeof b) return false
			for(let key in a){
				if(a[key] !== b[key]) return false
			}
			for(let key in b){
				if(a[key] !== b[key]) return false
			}
			return true
		}
	
		let old = this.started[msg.id]
		if(old){
			if(!equals(old.w, msg.w) || !equals(old.h, msg.h) || old.fps !== msg.fps || old.hasOnFrame !== msg.hasOnFrame){
				this.user_stop(msg)
			}
			else return
		}

		let start = msg
		this.started[msg.id] = start

		// if we dont get a name lets just take the default one
		var constraints = {
			audio: false,
			video: true,
		}
		
		if(msg.label){
			constraints.video.deviceId = {exact: this.deviceIds[msg.label]}		
		}

		if(msg.w !== undefined || msg.h !== undefined){
			constraints.video = {width:msg.w,height:msg.h}
		}
		var fps = msg.fps || 60

		navigator.mediaDevices.getUserMedia(constraints).then( stream =>{
			var video = document.createElement("video")
			var canvas = document.createElement("canvas")
			var ctx = canvas.getContext("2d")

			start.video = video

			video.src = URL.createObjectURL(stream)
			var first = true
			video.addEventListener('playing', _=>{
				if(first) first = false
				else return
				let width = video.videoWidth
				let height = video.videoHeight
				let bypass = msg.bypass
				canvas.width = width
				canvas.height= height

				start.interval = setInterval(_=>{
					if(video.readyState === video.HAVE_ENOUGH_DATA){
						if(start.isTexture){ // repaint
							this.worker.services.painter1.requestRepaint()
						}
						if(start.hasOnFrame){ // send the framebuffer
							// lets readpixel the stuff
							ctx.drawImage(video, 0, 0, width, height)
		   					let frame = ctx.getImageData(0, 0, width, height)
		   					// lets transfer to worker
		   					let data = frame.data
		   					// transfer frame to worker
		   					this.postMessage({
		   						fn:'onFrame',
		   						w:width,
		   						h:height,
		   						id:msg.id,
		   						time:Date.now(),
		   						data:data.buffer
		   					},[data.buffer])
		   				}
		   					//console.log(frame)
					}
				}, 1000 / fps)
			}, false)
			video.play()
		}).catch(error=>{
			this.postMessage({
				fn:'onError',
				id:msg.id,
				error:error.toString()
			})
			console.log("Error in starting capture device ", error)
		})
	}
}