
var perf 
var perfNow = typeof performance !== 'undefined'? performance: Date 

exports.onRequire = function(args) { 
	var id = args[1] 
	var t = perfNow.now() 
	if(!perf) perf = {} 
	var obj = perf[id] || (perf[id] = {}) 
	if(obj.sample) { 
		var dt = (t - obj.sample) 
		if(!obj.list) obj.list = [dt]
		else obj.list.push(dt) 
		var avg = 0 
		for(var i = 0; i < obj.list.length; i++) avg += obj.list[i] 
		avg = avg / obj.list.length 
		console.log('Perf' + (id? '(' + id + ')': '') + ':' + dt + ' Avg: ' + avg) 
		obj.sample = undefined 
	}
	else obj.sample = t 
}