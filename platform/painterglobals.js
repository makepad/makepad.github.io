module.exports = function painterGlobals(proto){

	proto.onConstructPainterGlobals = function(){
		this.globalF32 = new Float32Array(2000)
		this.globalI32 = new Int32Array(2000)
		this.globals = Array(1000)
		this.globalsLen = 0
	}

	proto.setDefaultGlobals = function(pick){
		this.globalsLen = 0
		var nameIds = this.nameIds
		this.mat4Global(nameIds.this_DOT_fingerInfo, this.fingerInfo)
		this.floatGlobal(nameIds.this_DOT_time, this.repaintTime)
		this.floatGlobal(nameIds.this_DOT_pixelRatio, this.args.pixelRatio)
		this.floatGlobal(nameIds.this_DOT_workerId, (pick?-1:1)*this.worker.workerId)
	}

	proto.intGlobal = function(nameId, x){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 10
		i32[o+1] = 2
		i32[o+2] = nameId
		i32[o+3] = x
		var i = this.globalsLen
		globals[i] = nameId
		globals[i+1] = 10
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		this.globalsLen += 5
	}

	proto.floatGlobal = function(nameId, x){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 11
		i32[o+1] = 2
		i32[o+2] = nameId
		f32[o+3] = x
		var i = this.globalsLen
		globals[i] = nameId
		globals[i+1] = 11
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		this.globalsLen += 5
	}

	proto.vec2fGlobal = function(nameId, x, y){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 12
		i32[o+1] = 3
		i32[o+2] = nameId
		f32[o+3] = x
		f32[o+4] = y
		var i = this.globalsLen
		globals[i] = nameId
		globals[i+1] = 12
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		this.globalsLen += 5
	}

	proto.vec4Global = function(nameId, x){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 14
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = x[0]
		f32[o+4] = x[1]
		f32[o+5] = x[2]
		f32[o+6] = x[3]
		var i = globalsLen
		globals[i] = nameId
		globals[i+1] = 14
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		globalsLen += 5
	}

	proto.vec4fGlobal = function(nameId, x, y, z, w){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 14
		i32[o+1] = 5
		i32[o+2] = nameId
		f32[o+3] = x
		f32[o+4] = y
		f32[o+5] = z
		f32[o+6] = w
		var i = this.globalsLen
		globals[i] = nameId
		globals[i+1] = 14
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		this.globalsLen += 5
	}

	proto.mat4Global = function(nameId, m){
		var i32 = this.globalI32//[nameid*10]
		var f32 = this.globalF32//[nameid*10]
		var globals = this.globals
		var o = nameId * 20
		i32[o+0] = 15
		i32[o+1] = 17
		i32[o+2] = nameId
		f32[o+3] = m[0]
		f32[o+4] = m[1]
		f32[o+5] = m[2]
		f32[o+6] = m[3]
		f32[o+7] = m[4]
		f32[o+8] = m[5]
		f32[o+9] = m[6]
		f32[o+10] = m[7]
		f32[o+11] = m[8]
		f32[o+12] = m[9]
		f32[o+13] = m[10]
		f32[o+14] = m[11]
		f32[o+15] = m[12]
		f32[o+16] = m[13]
		f32[o+17] = m[14]
		f32[o+18] = m[15]	
		var i = this.globalsLen
		globals[i] = nameId
		globals[i+1] = 15
		globals[i+2] = i32
		globals[i+3] = f32
		globals[i+4] = o
		this.globalsLen += 5
	}
}