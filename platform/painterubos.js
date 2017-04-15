module.exports = function painterUbos(proto){

	proto.onConstructPainterUbos = function(){
	}

	proto.setPainterUbo = function(framebuffer, pick){
		var ubo = this.uboIds[framebuffer.uboId]
		var nameIds = this.nameIds
		this.mat4Ubo(ubo, nameIds.thisDOTfingerInfo, this.fingerInfo)
		this.floatUbo(ubo, nameIds.thisDOTtime, this.repaintTime)
		this.floatUbo(ubo, nameIds.thisDOTpixelRatio, this.args.pixelRatio)
		this.floatUbo(ubo, nameIds.thisDOTpickPass, (pick?1:0))
		return ubo
	}

	proto.floatUbo = function(ubo, nameId, x){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o] = x
	}

	proto.vec2Ubo = function(ubo, nameId, v){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = v[0]
		f32[o+1] = v[1]
	}

	proto.vec2fUbo = function(ubo, nameId, x, y){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = x
		f32[o+1] = y
	}

	proto.vec3Ubo = function(ubo, nameId, v){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = v[0]
		f32[o+1] = v[1]
		f32[o+2] = v[2]
	}

	proto.vec3fUbo = function(ubo, nameId, x, y, z){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = x
		f32[o+1] = y
		f32[o+2] = z
	}

	proto.vec4Ubo = function(ubo, nameId, v){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = v[0]
		f32[o+1] = v[1]
		f32[o+2] = v[2]
		f32[o+3] = v[3]
	}

	proto.vec4fUbo = function(ubo, nameId, x, y, z, w){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = x
		f32[o+1] = y
		f32[o+2] = z
		f32[o+3] = w
	}

	proto.mat4Ubo = function(ubo, nameId, m){
		if(!ubo) return
		var o = ubo.offsets[nameId]
		var f32 = ubo.f32
		f32[o+0] = m[0]
		f32[o+1] = m[1]
		f32[o+2] = m[2]
		f32[o+3] = m[3]
		f32[o+4] = m[4]
		f32[o+5] = m[5]
		f32[o+6] = m[6]
		f32[o+7] = m[7]
		f32[o+8] = m[8]
		f32[o+9] = m[9]
		f32[o+10] = m[10]
		f32[o+11] = m[11]
		f32[o+12] = m[12]
		f32[o+13] = m[13]
		f32[o+14] = m[14]
		f32[o+15] = m[15]
	}

	
}