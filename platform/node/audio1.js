module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'audio1'
		this.args.test = '1'
	}
}