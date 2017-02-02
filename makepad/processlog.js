var types = require('base/log').types
var codeStyles = 
module.exports = class Wave extends require('base/view'){
	
	prototype() {
		this.props = {
			w:'100%',
			resource:null,
			overflow:'scroll'
		} 
		this.tools = {
			Bg:require("shaders/bg").extend({

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
				regexp: {
					$color:colors.codeString
				}, 
				object: {
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
	
	constructor(...args) { 
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
			buf.off = skip
			if(len === 0){
				if(this.writeText('[]', this.styles.Array.bracket)>buf.MAXTEXT) return true
			}
			else{
				if(skipObj) if(this.writeText('[.]', this.styles.Array.bracket)>buf.MAXTEXT) return true
				// write array..

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

	onDraw() {
		//this.beginBg()	

		this.$fastTextChunks = []
		this.$fastTextStyles = []
		this.$fastTextFontSize = 8

		var tproto = this.Text.prototype
		var lineHeight = tproto.lineHeight * this.$fastTextFontSize
		var charWidth = tproto.font.fontmap.glyphs[32].advance * this.$fastTextFontSize
		// how would we virtual viewport this thing?
		var logs = this.resource && this.resource.processes && this.resource.processes[0].logs.__unwrap__
		if(logs){
			// lets set the viewspace
			this.scrollSize(charWidth * 1000, lineHeight *logs.length)
			
			// lets write callstack position here

			// do a viewport ont he logs
			// offset coordinates/

			for(var i = 0; i < logs.length; i++){
				var log = logs[i]
				if(!log.data) continue
				// lets draw what we logged
				// all primitive values instead of object
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