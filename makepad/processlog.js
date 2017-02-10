var types = require('base/log').types

class Log extends require('base/view'){
	
	prototype() {
		this.props = {
			w:'100%',
			h:'100#',
			padding:5,
			resource:null,
			overflow:'scroll',
			tail:true
		}
		this.order = 2,
		this.tools = {
			Bg:require("shaders/bg").extend({
				color:module.style.colors.bgNormal
			}),
			Text: require('shaders/codetext').extend({
				font: require('fonts/ubuntu_monospace_256.font'),
				order:3,
			}),
		} 

		var colors = module.style.colors

		this.styles = {
			$boldness: 0.,
			$color: '#fff',
			$italic: 0,
			$head: 0,
			$tail: 0,
			whitespace:{},
			curly:{},
			Object:{
				$color:colors.codeObject,
				curly:{},
				colon:{},
				key:{alignLeft:0,alignRight:1.},
				commaClose:{$tail:1},
				bracket:{},
				member:{}
			},
			Array:{
				$color:colors.codeObject,
				commaClose:{$tail:1},
				bracket:{}
			},
			Function:{
				$color:colors.codeFunction,
				function:{},
				comma:{$tail:1},
				parenLeft:{},
				parenRight:{$tail:1}
			},
			Value:{
				undefined:{
					global:{$color:colors.codeGlobal, $boldness:0.2}
				},
				regexp:{
					$color:colors.codeString
				}, 
				object:{
					$color:colors.codeObject
				},
				num:{
					$color:colors.codeNumber
				},
				boolean:{
					$color:colors.codeBoolean
				},
				string:{
					$color:colors.codeString
				},
			},
		} 
	} 
	
	constructor(...args){
		super(...args)
	}
	
	onDestroy(){

	}

	drawLine(item){

	}

	deserializeLog(buf, isObjectKey, skipObj){
		var type = buf.u32[buf.off++]
		if(type === types.ref){
			var r = buf.u32[buf.off++]
			var uid = buf.u32[r + 2]
			if(this.writeText('<'+uid+'>', this.styles.Value.undefined)>buf.MAXTEXT) return true
			return
		}
		if(type === types.undefined){
			if(this.writeText('undefined', this.styles.Value.undefined)>buf.MAXTEXT) return true
			return
		}
		if(type === types.null){
			if(this.writeText('null', this.styles.Value.object)>buf.MAXTEXT) return true
			return
		}
		if(type === types.number){
			if(buf.off&1)buf.off++
			var s = String(buf.f64[buf.off>>1])
			if(this.writeText(s, this.styles.Value.num)>buf.MAXTEXT) return true
			buf.off += 2
			return
		}
		if(type === types.boolean){
			if(buf.u32[buf.off++]){
				if(this.writeText('true', this.styles.Value.boolean)>buf.MAXTEXT) return true
				return 
			}
			if(this.writeText('false', this.styles.Value.boolean)>buf.MAXTEXT) return true
			return
		}
		if(type === types.string){
			var l = buf.u32[buf.off++]
			var u16 = buf.u16
			var o = buf.off<<1
			var str = isObjectKey?"":"'"
			for(var i = 0; i < l; i++){
				str += String.fromCharCode(u16[o++])
			}
			if(o&1) o++
			buf.off = o>>1
			if(!isObjectKey) str += "'"
			else str += ":"
			//console.log(str)
			if(this.turtle.$propOffset + str.length > buf.MAXTEXT){
				str = str.slice(this.MAXTEXT - this.turtle.$propOffset)
			}
			if(this.writeText(str, isObjectKey?this.styles.Object.key:this.styles.Value.string)>this.MAXTEXT) return true
			return
		}
		if(type === types.function){
			if(this.writeText('function', this.styles.Function.function)>buf.MAXTEXT) return true
			var l = buf.u32[buf.off++]
			var o = buf.off<<1
			o += l
			if(o&1) o++
			buf.off = o>>1
			return
		}
		if(type === types.array){
			var skip = buf.u32[buf.off++]
			var id = buf.u32[buf.off++]
			var len = buf.u32[buf.off++]
			
			if(len === 0){
				if(this.writeText('[]', this.styles.Array.bracket)>buf.MAXTEXT) return true
			}
			else{
				if(skipObj){
					buf.off = skip
					if(this.writeText('[.]', this.styles.Array.bracket)>buf.MAXTEXT) return true
					return
				}
				// write array..
				if(this.writeText('[', this.styles.Array.bracket)>buf.MAXTEXT) return true
				for(var i = 0; i < len; i++){
					if(this.deserializeLog(buf, false, true)) return true
					if(i !== len - 1) if(this.writeText(',', this.styles.Array.commaClose)>buf.MAXTEXT) return true		
				}
				if(this.writeText(']', this.styles.Array.bracket)>buf.MAXTEXT) return true				
			}
			return
		}
		if(type === types.storeproxy){
			return this.deserializeLog(buf, null, true)
		}
		if(type === types.object){
			var skip = buf.u32[buf.off++]
			var id = buf.u32[buf.off++]

			// lets skip the prototype
			var proto = buf.u32[buf.off++]

			if(proto === types.object){
				// skip it
				//console.log("SKIP PROTO")
				buf.off = buf.u32[buf.off++]
			}
			else if(proto === types.ref){
				buf.off++
			}

			if(this.writeText('{', this.styles.Object.curly)>buf.MAXTEXT) return true

			var l = buf.u32[buf.off++]
			if(l && skipObj){
				if(this.writeText('.', this.styles.Object.colon)>buf.MAXTEXT) return true
				buf.off = skip
			}
			else{
				for(i = 0;i < l; i++){
					if(this.deserializeLog(buf, true)) return true
					if(this.deserializeLog(buf, null, true)) return true
					if(i < l - 1) this.writeText(', ', this.styles.Object.commaClose)
				}
			}
			if(this.writeText('}', this.styles.Object.curly)>buf.MAXTEXT) return true
			return
		}
	}

	onScroll(e) { 
		this.tail = false
		this.parent.tail = false
		this.redraw() 
	}

	onDraw() {
		this.drawBg({
			w:'100%',
			h:'100%',
			moveScroll:0
		})
		//this.beginBg()	
		this.$fastTextChunks = []
		this.$fastTextStyles = []
		this.$fastTextFontSize = 10

		var tproto = this.Text.prototype
		var lineHeight = tproto.lineSpacing * this.$fastTextFontSize
		var charWidth = tproto.font.fontmap.glyphs[32].advance * this.$fastTextFontSize
		// how would we virtual viewport this thing?
		var logs = this.resource && this.resource.processes && this.resource.processes[0].logs.__unwrap__
		if(logs){
			// lets set the viewspace
			this.scrollSize(charWidth * 1000, lineHeight *(logs.length))
			// lets scroll to the bottom
			// be sure to start at yScroll and stop when > size
			var ypos = 0
			var height = this.turtle.height
			var scroll = this.todo.yScroll

			// compute the start i and end i
			var iStart = max(0,floor(scroll / lineHeight)-10)
			var iEnd = min(iStart + ceil(height / lineHeight)+20, logs.length)
			
			if(this.tail){
				// how do we scroll to the bottom?
				this.todo.scrollTo(undefined,(logs.length+1)* lineHeight- this.turtle.height, -1)
			}

			// how do we see if a scrollbar is at the bottom?
			this.turtle.wy = iStart * lineHeight

			// lets write callstack position here
			for(var i = iStart; i < iEnd; i++){
				var log = logs[i]
				if(!log || !log.data) continue
				// lets draw what we logged
				// all primitive values instead of object
				var item = log.stack && log.stack.stack && log.stack.stack[1]
				var lid = item.path.lastIndexOf('/')
				this.writeText(item.path.slice(lid+1)+':', this.styles.Function)
				this.writeText(item.line+' ', this.styles.Value.regexp)
				var buf = {
					MAXTEXT:(this.lengthText() || 0) + 1000,
					str:'',
					max:256,
					off:0,
					size:log.data.byteLength>>2,
					u32: new Uint32Array(log.data),
					f64: new Float64Array(log.data),
					u16: new Uint16Array(log.data),
				}
				this.deserializeLog(buf)
				this.writeText('\n', this.styles.Value.undefined)
			}
		}
		//this.endBg()
	}
}

module.exports = class extends require('base/view'){
	prototype(){
		this.tools = {
			Log:Log,
			Button: require('stamps/button').extend({
				order:4,
			}),
			Bg:require('shaders/quad').extend({
				w:'100%',
				padding:[0,5,0,5],
				wrap:false,
				color:module.style.colors.bgNormal
			})
		}
		this.props = {
			w:'100%',
			h:'100%',
			tail:true,
			resource:null,
		}
	}

	constructor(...args){
		super(...args)
		this.log = new this.Log(this,{resource:this.resource})
	}
	
	onTrash(){
		// send new init message to worker
		this.store.act("clearLog",store=>{
			this.resource.processes[0].logs.length = 0
		})
	}

	onTailToggle(btn){
		this.tail = btn.toggled
	}

	onDraw(){
		//this.beginBg({
		//})
		
		this.drawButton({
			id:'play',
			icon:'trash-o',
			align:[1,0],
			onClick:this.onTrash
		})

		this.drawButton({
			id:'close',
			align:[1,0],
			icon:'level-down',
			margin:[2,10,0,0],
			toggle:true,
			toggled:this.tail,
			onClick:this.onTailToggle
		})
		//this.endBg()
		//this.lineBreak()
		this.log.draw(this,{x:0,y:0,tail:this.tail})
	}
}
