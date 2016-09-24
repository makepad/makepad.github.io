module.exports = class extends require('base/class'){
	constructor(){
		super()
		this.freeList = []
		this.counter = 1
	}

	alloc(obj){
		var id
		if(this.freeList.length){
			id = this.freeList.pop()
		}
		else{
			id = this.counter++
		}
		this[id] = obj
		return id
	}

	free(id){
		this[id] = undefined
		this.freeList.push(id)
	}
}