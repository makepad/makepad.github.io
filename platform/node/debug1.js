module.exports = require('/platform/service').extend(function debug1(proto){

	proto.onConstruct = function(){
		this.args.test = '1'
	}

	// service log
	proto.user_log = function(msg){
		console.log("RECEIVED", msg)
	}
})