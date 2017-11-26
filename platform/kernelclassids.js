var Type = module.globals.Type

class KernelClassIds extends require('/platform/class'){
	prototype(){
		var id = 1
		this.astIds = {
			BLOCK_STATEMENT:id++,
			ARRAY_EXPRESSION:id++,
			EXPRESSION_STATEMENT:id++,
			SEQUENCE_EXPRESSION:id++,
			LITERAL_INT:id++,
			LITERAL_FLOAT:id++,
			LITERAL_BOOL:id++,
			ARGUMENT:id++,
			VARIABLE:id++,

			// call types
			THIS_CALL:id++,
			OBJECT_CALL:id++,
			NEW_OBJECT:id++,
			BUILTIN_CALL:id++,

			// property accesses
			THIS_MEMBER:id++,
			OBJECT_MEMBER:id++,
			STRUCT_FIELD:id++,
			VEC_SWIZZLE:id++,
			ARRAY_INDEX:id++,

			THIS_EXPRESSION:id++,

			RETURN_VALUE:id++,
			RETURN_VOID:id++,
			VARIABLE_DECLARATION:id++,
			VARIABLE_DECLARATOR:id++,
			LOGICAL_EXPRESSION:id++,
			BINARY_EXPRESSION:id++,
			ASSIGNMENT_EXPRESSION:id++,
			CONDITIONAL_EXPRESSION:id++,
			UNARY_EXPRESSION:id++,
			UPDATE_EXPRESSION:id++,
			IF_STATEMENT:id++,
			FOR_STATEMENT:id++,
			FOR_OF_STATEMENT:id++,
			WHILE_STATEMENT:id++,
			DOWHILE_STATEMENT:id++,
			BREAK_STATEMENT:id++,
			CONTINUE_STATEMENT:id++,
			//YIELD_EXPRESSION:id++,
			SWITCH_STATEMENT:id++,
			SWITCH_CASE:id++
		}

		var id = 1
		// default symbols for global functions
		this.builtinIds = {
			sin:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			cos:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			tan:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			asin:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			acos:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			atan:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}, {name:'y', typeId:Type.genFloat.id, opt:true}]},
			
			radians:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			degrees:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},

			pow:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			exp:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			log:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			exp2:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			log2:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			sqrt:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			inversesqrt:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			abs:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			sign:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			floor:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			ceil:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			fract:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			mod:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			min:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			max:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			clamp:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'min', typeId:Type.genFloat.id},{name:'max', typeId:Type.genFloat.id}]},
			
			mix:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'a', typeId:Type.genFloat.id},{name:'b', typeId:Type.genFloat.id},{name:'t', typeId:Type.genFloat.id}]},
			step:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'edge', typeId:Type.genFloat.id},{name:'x', typeId:Type.genFloat.id}]},
			smoothstep:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'edge0', typeId:Type.genFloat.id},{name:'edge1', typeId:Type.genFloat.id},{name:'x', typeId:Type.genFloat.id}]},
			
			length:{id:id++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			distance:{id:id++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			dot:{id:id++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			cross:{id:id++, returnTypeId:Type.vec3.id, params:[{name:'x', typeId:Type.vec3.id},{name:'y', typeId:Type.vec3.id}]},
			normalize:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},

			faceforward:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'n', typeId:Type.genFloat.id},{name:'i', typeId:Type.genFloat.id},{name:'nref', typeId:Type.genFloat.id}]},
			reflect:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'i', typeId:Type.genFloat.id},{name:'n', typeId:Type.genFloat.id}]},
			refract:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'i', typeId:Type.genFloat.id},{name:'n', typeId:Type.genFloat.id},{name:'eta', typeId:Type.genFloat.id}]},
			matrixCompMult:{returnTypeId:Type.mat4.id,params:[{name:'a', typeId:Type.mat4.id},{name:'b', typeId:Type.mat4.id}]},

			dFdx:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			dFdy:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			fwidth:{id:id++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},

			texture2DLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'lod', typeId:Type.float.id}]},
			texture2DProjLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'lod', typeId:Type.float.id}]},
			textureCubeLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.samplerCube.id}, {name:'coord', typeId:Type.vec3.id}, {name:'lod', typeId:Type.float.id}]},
			texture2D:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'bias', typeId:Type.float.id, opt:true}]},
			texture2DProj:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'bias', typeId:Type.float.id, opt:true}]},
			textureCube:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.samplerCube.id}, {name:'coord', typeId:Type.vec3.id}, {name:'bias', typeId:Type.float.id, opt:true}]},

			sleep:{id:id++, returnTypeId:Type.void.id, params:[{name:'timeMs', typeId:Type.float.id}]}

			// do we really need these
			/*
			lessThan:id++,
			lessThanEqual:id++,
			greaterThan:id++,
			greaterThanEqual:id++,
			equal:id++,
			notEqual:id++,
			any:id++,
			all:id++,
			not:id++,
			*/
		}

		var id = 1
		this.opIds = {
			'=':id++,
			'+=':id++,
			'-=':id++,
			'/=':id++,
			'*=':id++,
			'+':id++,
			'-':id++,
			'/':id++,
			'*':id++,
			'>>':id++,
			'<<':id++,
			'|':id++,
			'&':id++,
			'++':id++,
			'--':id++,
			'<':id++,
			'>':id++,
			'<=':id++,
			'>=':id++,
			'==':id++,
			'||':id++,
			'&&':id++
		}

		this.opIdToName = {}
		for(var key in this.opIds){
			this.opIdToName[this.opIds[key]] = key
		}

		this.builtinIdToName = {}
		for(var key in this.builtinIds){
			var fn = this.builtinIds[key]
			this.builtinIdToName[fn.id] = key
		}

		this.kernelClassIds = {
			astIds:this.astIds,
			opIds:this.opIds,
			builtinIds:this.builtinIds
		}
	}
}

module.exports = KernelClassIds