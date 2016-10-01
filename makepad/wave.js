var audio = require('services/audio') 
var wav = require('parsers/wav') 
var painter = require('services/painter') 
var storage = require('services/storage')

module.exports = class Wave extends require('views/draw'){ 
	
	prototype() { 
		
		this.props = { 
			zoom: 200., 
			selStart: 0, 
			selEnd: 0, 
			zoomRange: [2, 1000], 
			zoomScroll: 0, 
			resource:undefined
		} 
		this.tools = {
			Bg:{
				color:'#1'
			},
			Slider: require('tools/slider').extend({ 
				Bg: {moveScroll: 0},
				Knob: {moveScroll: 0}
			}), 
			Button: require('tools/button').extend({ 
				Bg: {moveScroll: 0}, 
				Text: {moveScroll: 0} 
			}), 
			Rect: { 
				color: '#07c7' 
			}, 
			Quad: {color: 'red'}, 
			Grid: require('tools/grid') 
		} 
	} 
	
	constructor(...args) { 
		super(...args) 
		
		//runtime()
		
		audio.reset() 
		this.undoStack = []
		this.redoStack = []
		this.recording = [] 
		this.samples = 0 
		// ok we dont deal in individual nodes we deal in whole flows.
		this.recFlow = new audio.Flow({ 
			gain1: { 
				to: 'output', 
				gain: .0, 
			}, 
			recorder1: { 
				to: 'gain1', 
				chunk: 2048, 
				onData: data=>{
					this.redraw()
					this.recording.push(data)
					this.samples += data[0].length
					this.scopeData = data
				} 
			}, 
			input1: {
				to: 'recorder1',
				device: 'Microphone' 
			} 
		}) 
		
		var out = wav.parse(this.resource.data, true)
		this.recording.push(out.data)
		this.samples = out.data[0].length
		
		this.playFlow = new audio.Flow({ 
			buffer1: { 
				to: 'output', 
				rate: 44100, 
				loop: true, 
				start: 0 
			} 
		}) 
	} 
	
	onScroll(e) { 
		this.redraw() 
	} 
	
	xToTime(x) { 
		return x * this.zoom 
	} 
	
	setZoom(z, x) { 
		var zoom = clamp(z, this.zoomRange[0], this.zoomRange[1]) 
		var x1 = x * this.zoom 
		var x2 = x * zoom 
		this.zoom = zoom 
		this.scrollAtDraw((x1 - x2) / zoom, 0, true) 
	} 
	
	onFingerWheel(e) { 
		var z = this.zoom * (1 + e.yWheel / 1500) 
		this.setZoom(z, e.x) 
	} 
	
	onFingerDown(e) { 
		this.setFocus()
		if(e.pickId) return  
		this.selEnd = 
		this.selStart = clamp(this.xToTime(e.x), 0, this.samples) 
	} 
	
	onFingerMove(e) { 
		if(e.pickId) return  
		let end = this.selEnd = clamp(this.xToTime(e.x), 0, this.samples) 
		if(end < this.selStart) this.selEnd = this.selStart+100, this.selStart = end 
		// lets scroll into view
		this.scrollIntoView(this.selEnd	/ this.zoom,0,0,0)
	} 

	onKeyS(e){
		if(!e.ctrl && !e.meta && !e.alt) return
		// save it
		this.save()
	}

	onKeyZ(e){ // undo
		if(!e.ctrl && !e.meta && !e.alt) return
		this.undo()
	}

	onKeyY(e){ // redo
		if(!e.ctrl && !e.meta && !e.alt) return
		this.redo()
	}

	save(){
		// flatten
		if(this.recording.length>1){
			editWave(this.samples, sam=>sam, true)
		}
		//write it
		var wavout = wav.serialize16(this.recording[0])
		// save it
		storage.save(this.resource.path, wavout)
	}

	undo(){
		var sam = this.undoStack.pop()
		if(!sam) return 
		this.redoStack.push({
			samples:this.samples,
			recording:this.recording
		})
		this.samples = sam.samples
		this.recording = sam.recording
		this.redraw()
		if(!this.undoStack.length){
			this.store.act('undoWave',store=>{
				this.resource.dirty = false
			})
		}
	}

	redo(){
		var sam = this.redoStack.pop()
		if(!sam) return
		this.undoStack.push({
			samples:this.samples,
			recording:this.recording
		})
		this.samples = sam.samples
		this.recording = sam.recording
		this.redraw()
	}

	cut(){
		var s = this.selStart, e = this.selEnd
		this.editWave(this.samples - (this.selEnd - this.selStart), (sample, o, c)=>{
			if(o < s || o > e) { 
				return sample
			}
		})
	}

	fade(){
		var s = this.selStart, e = this.selEnd
		var range = e-s
		this.editWave(this.samples, (sample, o, c)=>{
			if(o > s && o < e) { 
				return sample * pow(1 - ((o - s)/ range), 3) 
			} 
			return sample
		})
	}

	rec(){
		if(this.recFlow.running) this.recFlow.stop()
		else { 
			this.recording.length = 0 
			this.samples = 0 
			this.recFlow.start() 
		} 
		this.redraw() 
	}

	play(){
		if(this.playFlow.running) { 
			this.playFlow.stop() 
			this.redraw() 
			return  
		} 
		if(this.recording.length>1){
			editWave(this.samples, sam=>sam, true)
		}		
		this.playFlow.start({ 
			buffer1: { 
				data: this.recording[0]
			} 
		}) 
		this.redraw() 
	}	

	editWave(newSize, cb, noUndo){
		this.store.act('editWave',store=>{
			this.resource.dirty = true
		})

		let recording = this.recording
		let chans = recording[0]
		let chanCount = chans.length
		let chansNew = []
		for(let c = 0; c < chanCount; c++){
			chansNew.push(new Float32Array(newSize))
		}
		for(let b = 0, w, t, total = 0, write = 0, bl = recording.length; b < bl; b++) { 
			let chansChunk = recording[b]
			for(let c = 0; c < chanCount; c++){
				let input = chansChunk[c]
				let output = chansNew[c]
				w = write, t = total
				for(var i = 0, l = input.length; i < l; i++, t++) { 
					let ret = cb(input[i], t, c)
					if(ret !== undefined) output[w++] = ret
				}
			}
			write = w, total = t
		}
		this.redoStack = []
		if(!noUndo) this.undoStack.push({
			samples:this.samples,
			recording:this.recording
		})
		this.samples = chansNew[0].length 
		this.recording = [chansNew] 
		this.selStart = this.selEnd = 0 
		this.redraw() 
	}

	onDraw() { 
		this.beginBg(this.viewGeom)
		this.beginGrid({ 
			x: 0, 
			y: 60, 
			zoom: this.zoom, 
			w: this.samples / this.zoom, 
			h: 200 
		}) 
		//console.log(10000/this.zoom)
		this.drawRect({ 
			x: (this.selStart) / this.zoom, 
			w: (this.selEnd - this.selStart) / this.zoom, 
			h: '100%' 
		}) 
		
		// lets draw the recording
		if(this.recording) { 
			
			var height = this.turtle.height 
			var scale = this.zoom 
			var smod = floor(scale) 
			var minv = 0, maxv = 0. 
			// we should draw it near the scroll position
			var xmin = this.todo.xScroll - this.$w 
			var xmax = xmin + this.$w * 3 
			var t = 0
			outer:
			for(let c = 0; c < this.recording.length; c++) { 
				var left = this.recording[c][0] 

				// compute xmin to samples
				let i =0
				if((t + left.length) / scale < xmin) { 
					t += left.length 
					continue 
				} 
				else if(t === 0){
					t = i = max(0,floor(xmin*scale))
				}
				for(; i < left.length; i++) { 
					var v = left[i] 
					if(v < minv) minv = v 
					if(v > maxv) maxv = v 
					if(!(t++ % smod) && t / scale > xmin) { 
						this.drawQuad({ 
							color: t > this.selStart && t < this.selEnd? '#7cff': '#26cf', 
							x: t / scale, 
							y: minv * height * .5 + this.turtle.sy + 0.5 * height, 
							w: 1, ///painter.pixelRatio,//t / scale,
							h: (maxv - minv) * height * .5 + 1. //+300
						}) 
						minv = 0 
						maxv = 0 
					} 
					if(t / scale > xmax) break outer 
				} 
			} 
			this.scrollSize(this.samples / scale, 0) 
		} 
		this.endGrid(true) 

		this.drawButton({ 
			text: this.recFlow.running? "Stop": "Rec", 
			onClick: this.rec
		}) 
		this.drawButton({ 
			text: this.playFlow.running? "Stop": "Play", 
			onClick: this.play
		}) 
		this.drawButton({ 
			text: "Cut", 
			onClick: this.cut
		}) 
		this.drawButton({ 
			text: "Fade", 
			onClick: this.fade
		}) 
		this.drawSlider({ 
			onValue: e=>{ 
				this.setZoom(e.value, this.todo.xScroll) 
				this.redraw() 
			}, 
			vertical: false, 
			handleSize: 30, 
			value: this.zoom, 
			step: 0, 
			range: this.zoomRange, 
			w: 100, 
			h: 36 
		}) 
		// lets draw the scope 
		if(this.scopeData) { 
			this.beginGrid({ 
				moveScroll: 0, 
				zoom: this.zoom, 
				w: 100, 
				h: 40 
			}) 
			var left = this.scopeData[0] 
			this.drawLine({sx: 0, sy: 100}) 
			for(let i = 0; i < left.length; i++) { 
				this.drawLine({ 
					space: 2, 
					x: (i / left.length) * 2 - 1, 
					y: left[i] 
				}) 
			} 
			this.endGrid() 
		} 
		
		this.endBg(true)
	} 
}