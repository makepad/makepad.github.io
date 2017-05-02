module.exports = function encode16(data, rate) {
	// lets write the header
	var channels = data.length
	var samples = data[0].length
	var size = 4 + 
		8 + 18 + //fmt
		8 + samples * 2 * channels //data
	
	var u16 = new Uint16Array(size >> 1)
	u16[0] = 0x4952 //RIFF
	u16[1] = 0x4646
	u16[2] = size & 0xffff
	u16[3] = (size >> 16) & 0xffff
	u16[4] = 0x4157 //WAVE
	u16[5] = 0x4556
	var o = 6
	//lets write 'fmt ' // size is 18+8
	u16[o + 0] = 0x6d66
	u16[o + 1] = 0x2074
	var chunk = 18
	u16[o + 2] = chunk & 0xffff
	u16[o + 3] = (chunk >> 16) & 0xffff
	o += 4
	u16[o + 0] = 1 //format
	u16[o + 1] = channels
	u16[o + 2] = rate & 0xffff
	u16[o + 3] = (rate >> 16) & 0xffff
	var bps = 2 * channels * rate
	u16[o + 4] = bps & 0xffff
	u16[o + 5] = (bps >> 16) & 0xffff
	u16[o + 6] = 4 //block align
	u16[o + 7] = 16 // 16 bits per sample
	u16[o + 8] = 0 // cb size
	o += 9
	//lets write data
	u16[o + 0] = 0x6164 //data
	u16[o + 1] = 0x6174
	var chunk = samples * 2 * channels
	u16[o + 2] = chunk & 0xffff
	u16[o + 3] = (chunk >> 16) & 0xffff
	o += 4
	for(let i = 0;i < samples;i++){
		for(let c = 0;c < channels;c++){
			var num = data[c][i]
			if(num < 0) u16[o++] = 0x10000 - floor(num * -0x7fff)
			else u16[o++] = floor(num * 0x7fff)
		}
	}
	return u16.buffer
}