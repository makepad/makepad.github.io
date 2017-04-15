let service = require('$cameras1')
let painter = require('services/painter')
var enumerates = {}
var cameraId = 1
var cameraIds = {}
var cameraLabels = {}
class Cameras extends require('base/class'){
	prototype(){

		this.Camera = class Camera extends require('base/class'){
			constructor(label){
				super()
				// reuse the camera with the label
				if(cameraLabels[label]){
					this.id = cameraLabels[label]
				}
				else this.id = cameraId++
				this.label = label
				cameraLabels[label] = this.id
				cameraIds[this.id] = this
			}

			start(w, h, fps){
				if(this.started) return console.error('camera already started')
				this.started = true
				this.hasOnFrame = this.onFrame !== undefined
				this.w  = w
				this.h = h
				this.fps = fps
				service.postMessage({
					fn:'start',
					hasOnFrame:this.hasOnFrame,
					id:this.id,
					fps:fps,
					w:typeof w === 'object'?w:{min:w,max:w,ideal:w},
					h:typeof w === 'object'?h:{min:h,max:h,ideal:h}
				})

				this.texture = new painter.Texture({
					w:this.w,
					h:this.h,
					external:{service:'cameras1', id:this.id}
				})
				//console.log(this.external, this.external && {service:'cameras1', id:this.id})
				this.texId = this.texture.texId
			}

			stop(){
			}
		}
	}

	enumerate(){
		var prom = Promise.defer()
		let promiseId = 0
		while(enumerates[promiseId]) promiseId++;
		enumerates[promiseId] = prom
		service.postMessage({
			fn:'enumerate',
			id:promiseId
		})
		return prom
	}
}

module.exports = new Cameras()

service.onMessage = function(msg){
	if(msg.fn === 'onFrame'){
		let cam = cameraIds[msg.id]
		if(cam && cam.onFrame){
			cam.onFrame(msg)
		}
	}
	if(msg.fn === 'onError'){
		let cam = cameraIds[msg.id]
		if(cam && cam.onError){
			cam.onError(msg)
		}
	}
	if(msg.fn === 'onEnum'){
		let prom = enumerates[msg.id]
		enumerates[msg.id] = undefined
		if(prom) prom.resolve(msg.labels)
	}
}