var audio = require('services/audio') 
var wavdecoder = require('codecs/wavdecoder') 
var wavencoder = require('codecs/wavencoder') 
var painter = require('services/painter') 
var storage = require('services/storage')

module.exports = class Wave extends require('views/draw'){ 
	
	prototype() { 
		
		this.yOverflow = 'none'
		this.props = { 
			zoom: 200., 
			selStart: 0, 
			selEnd: 0, 
			zoomRange: [2, 1000], 
			zoomScroll: 0, 
			resource:undefined
		} 
		let colors = module.style.colors
		this.tools = {
			Bar:require('shaders/quad').extend({
				w:'100%',
				wrap:false,
				color:colors.bgNormal,
				moveScroll:0,
			}),
			Bg:{
				color:colors.bgHi
			},
			Slider: require('views/slider').extend({ 
				Bg: {moveScroll: 0,test:2},
				Knob: {moveScroll: 0}
			}), 
			Button: require('views/button').extend({ 
				Bg: {moveScroll: 0,test:1}, 
				Text: {moveScroll: 0},
				Icon: {moveScroll: 0} 
			}),  
			Rounded: { 
				color: 'Purple700'
			}, 
			Quad: {color: 'red'}, 
			Grid: require('shaders/grid') 
		} 
	} 
	
	constructor(...args) { 
		super(...args) 
		
		//runtime()
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
		
		var out = wavdecoder(this.resource.data, true)
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
	
	onDestroy(){
		this.recFlow.destroy()
		this.playFlow.destroy()
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
		let l = this.toLocal(e)
		var z = this.zoom * (1 + e.yWheel / 1500) 
		this.setZoom(z, l.x) 
	} 
	
	onFingerDown(e) { 
		let l = this.toLocal(e)
		this.setFocus()
		//if(e.pickId) return  
		this.selEnd = 
		this.selStart = clamp(this.xToTime(l.x), 0, this.samples) 
		this.redraw()
	} 
	
	onFingerMove(e) { 
		//if(e.pickId) return  
		let l = this.toLocal(e)
		let end = this.selEnd = clamp(this.xToTime(l.x), 0, this.samples) 
		if(end < this.selStart) this.selEnd = this.selStart+100, this.selStart = end 
		// lets scroll into view
		this.scrollIntoView(this.selEnd	/ this.zoom,0,0,0)
		this.redraw()
	} 

	onKeyS(e){
		if(!e.ctrl && !e.meta && !e.alt) return
		// save it
		this.save(true)
		return true
	}

	onKeyZ(e){ // undo
		if(!e.ctrl && !e.meta && !e.alt) return
		this.undo()
		return true
	}

	onKeyY(e){ // redo
		if(!e.ctrl && !e.meta && !e.alt) return
		this.redo()
		return true
	}

	onKeyA(e){
		if(!e.ctrl && !e.meta && !e.alt) return
		this.selStart = 0
		this.selEnd = this.samples
		this.redraw()
		return true
	}

	onKeyX(e){
		if(!e.ctrl && !e.meta && !e.alt) return
		this.cut()
		return true
	}

	save(toStorage){
		// flatten
		if(this.recording.length>1){
			this.editWave(this.samples, sam=>sam, true)
		}
		//write it
		var wavout = wavencoder(this.recording[0])

		this.app.store.act('changeWave', store=>{
			this.resource.data = wavout
		})

		// save it
		if(toStorage) storage.save(this.resource.path, wavout)
	}

	undo(){
		this.undoRedo(this.undoStack, this.redoStack)
		if(!this.undoStack.length){
			this.app.store.act('undoWave',store=>{
				this.resource.dirty = false
			})
		}
	}

	redo(){
		this.undoRedo(this.redoStack, this.undoStack)
	}

	undoRedo(stack1, stack2){
		var sam = stack1.pop()
		if(!sam) return
		stack2.push({
			samples:this.samples,
			recording:this.recording,
			start:this.selStart,
			end:this.selEnd
		})
		this.samples = sam.samples
		this.recording = sam.recording
		this.selStart = sam.start
		this.selEnd = sam.end
		this.redraw()
		this.onWaveChange()
	}

	cut(){
		var s = this.selStart, e = this.selEnd
		this.editWave(this.samples - (this.selEnd - this.selStart), (sample, o, c)=>{
			if(o < s || o >= e) { 
				return sample
			}
		})
		this.onWaveChange()

	}

	fade(){
		var s = this.selStart, e = this.selEnd
		var range = e-s
		this.editWave(this.samples, (sample, o, c)=>{
			if(o >= s && o < e) { 
				return sample * pow(1 - ((o - s)/ range), 3) 
			} 
			return sample
		})
		this.onWaveChange()

	}

	rec(){
		if(this.recFlow.running){
			this.recFlow.stop()
			this.onWaveChange()
		}
		else { 
			this.undoStack.push({
				samples:this.samples,
				recording:this.recording,
				start:this.selStart,
				end:this.selEnd
			})
			this.selStart = 0
			this.selEnd = 0
			this.recording = []
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
			this.editWave(this.samples, sam=>sam, true)
		}		
		this.playFlow.start({ 
			buffer1: { 
				data: this.recording[0]
			} 
		}) 
		this.redraw() 
	}

	normalize(){
		var minx = 0, maxx = 0
		var s = this.selStart, e = this.selEnd
		this.editWave(this.samples, (sample,o)=>{
			if(o > s && o < e) { 
				if(sample < minx) minx = sample
				if(sample > maxx) maxx = sample
			}
			return sample
		}, true)
		var mul = 1./max(abs(minx), maxx)
		this.editWave(this.samples, (sample,o)=>{
			if(o > s && o < e){
				return sample * mul
			}
			return sample
		})
	}

	onWaveChange(){
		this.save()
	}

	editWave(newSize, cb, noUndo){
		this.app.store.act('editWave',store=>{
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
			recording:this.recording,
			start:this.selStart,
			end:this.selEnd
		})
		this.samples = chansNew[0].length 
		this.recording = [chansNew] 
		this.selStart = this.selEnd = 0 
		this.redraw() 
	}

	onClose(){
		if(this.playFlow.running) { 
			this.playFlow.stop() 
		}
		this.app.closeTab(this)
	}

	onDraw() { 
		this.beginBg({moveScroll:0,w:'100%',h:'100%'})
		this.beginGrid({ 
			x: '0', 
			y: '80', 
			zoom: this.zoom, 
			w: this.samples / this.zoom, 
			h: 200 
		}) 
		//console.log(10000/this.zoom)
		this.drawRounded({ 
			x: (this.selStart) / this.zoom,//+ this.turtle.$xAbs, 
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
			var xmin = this.$mainTodo.xScroll - this.turtle.width
			var xmax = xmin + this.turtle.width * 3 
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
							color: t > this.selStart && t < this.selEnd? '#ccc': '#ccc', 
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

		this.beginBar()

		this.drawButton({ 
			id:'close',
			order:2,
			align:[1,0],
			icon: "close", 
			onClick: this.onClose.bind(this)
		}) 

		this.drawButton({ 
			id:'rec',
			text: this.recFlow.running? "Stop": "Rec", 
			onClick: this.rec.bind(this)
		}) 
		this.drawButton({ 
			id:'play',
			text: this.playFlow.running? "Stop": "Play", 
			onClick: this.play.bind(this)
		}) 
		this.drawButton({ 
			id:'cut',
			text: "Cut", 
			onClick: this.cut.bind(this)
		}) 
		this.drawButton({ 
			id:'undo',
			text: "Undo", 
			onClick: this.undo.bind(this)
		}) 
		this.drawButton({ 
			id:'redo',
			text: "Redo", 
			onClick: this.redo.bind(this)
		}) 
		this.drawButton({ 
			id:'fade',
			text: "Fade", 
			onClick: this.fade.bind(this)
		}) 
		this.drawButton({ 
			id:'norm',
			text: "Norm", 
			onClick: this.normalize.bind(this)
		}) 

		/*
		this.drawSlider({ 
			id:'slide',
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
		}) */
		this.endBar()
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