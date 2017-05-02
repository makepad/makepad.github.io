module.exports = function decode(buffer, normalize) {
	var u16 = new Uint16Array(buffer)
	var u8 = new Uint8Array(buffer)
	var len = u16.length
	if(u16[0] !== 0x4952) return false // "RIFF"
	if(u16[1] !== 0x4646) return false
	var size = (u16[3] << 16) | u16[2]
	// size is byteLength - 8
	if(u16[4] !== 0x4157) return false // "WAVE"
	if(u16[5] !== 0x4556) return false
	// lets iterate all chunks
	var o = 6
	var fmt = {}
	var data = []
	while(o < len){
		var chunkType = String.fromCharCode(u16[o] & 0xff) + 
			String.fromCharCode(u16[o] >> 8 & 0xff) + 
			String.fromCharCode(u16[o + 1] & 0xff) + 
			String.fromCharCode(u16[o + 1] >> 8 & 0xff)
		var chunkSize = (u16[o + 3] << 16) | u16[o + 2]
		o += 4
		if(chunkType === 'fmt ') {
			fmt.audioFormat = u16[o + 0]
			fmt.numChannels = u16[o + 1]
			fmt.sampleRate = (u16[o + 3] << 16) | u16[o + 2]
			fmt.byteRate = (u16[o + 5] << 16) | u16[o + 4]
			fmt.blockAlign = u16[o + 6]
			fmt.bitsPerSample = u16[o + 7]
		}
		else if(chunkType === 'data') {
			if(fmt.audioFormat === 1) {
				var cs = (fmt.bitsPerSample / 8)
				var skip = (fmt.bitsPerSample / 8) * fmt.numChannels
				var samples = chunkSize / skip
				for(let c = 0;c < fmt.numChannels;c++){
					var f32 = new Float32Array(samples)
					var co = c * cs + (o << 1)
					data.push(f32)
					if(fmt.bitsPerSample === 8) {
						for(let i = 0;i < samples;i++){
							var f = i * skip + co
							var num = u8[f]
							var v = f32[i] = (num & 0x80?((num & 0x7f) - 0x80):num) / 0x80
						}
					}
					else if(fmt.bitsPerSample === 16) {
						for(let i = 0;i < samples;i++){
							var f = i * skip + co
							var num = (u8[f + 1] << 8) | u8[f]
							var v = f32[i] = (num & 0x8000?((num & 0x7fff) - 0x8000):num) / 0x8000
						}
					}
					else if(fmt.bitsPerSample === 24) {
						for(let i = 0;i < samples;i++){
							var f = i * skip + co
							var num = (u8[f + 2] << 16) | (u8[f + 1] << 8) | u8[f]
							var v = f32[i] = (num & 0x800000?((num & 0x7fffff) - 0x800000):num) / 0x800000
						}
					}
					else if(fmt.bitsPerSample === 32) { //float?
						
					}
				}
				if(normalize) {
					var minv = 0, maxv = 0
					for(let c = 0;c < fmt.numChannels;c++){
						var f32 = data[c]
						for(let i = 0;i < samples;i++){
							var v = f32[i]
							if(v < minv) minv = v
							if(v > maxv) maxv = v
						}
					}
					var mul = 1 / max(-minv, maxv)
					for(let c = 0;c < fmt.numChannels;c++){
						var f32 = data[c]
						for(let i = 0;i < samples;i++){
							f32[i] *= mul
						}
					}
				}
			}
		}
		else {}
		o += ceil(chunkSize / 2) // make sure we word align
	}
	return {
		rate:fmt.sampleRate,
		data:data
	}
}

exports.normalize = function(data) {
	var minv = 0, maxv = 0
	for(let c = 0;c < data.length;c++){
		var chan = data[c]
		for(let i = 0;i < chan.length;i++){
			var v = chan[i]
			if(v < minv) minv = v
			if(v > maxv) maxv = v
		}
	}
	var mul = 1 / max(-minv, maxv)
	for(let c = 0;c < data.length;c++){
		var chan = data[c]
		for(let i = 0;i < chan.length;i++){
			chan[i] *= mul
		}
	}
}