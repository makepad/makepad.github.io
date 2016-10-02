var http = require('http')
var https = require('https')
var fs = require('fs')
var child_process = require('child_process')
var root = {}
root.platformPath = '/platform/'
root.platform = 'node'

function workerPre(){
	var fs = require('fs')
	// read from it
	var readable = fs.createReadStream(null, {fd: 3});
	// write to it
	var writable = fs.createWriteStream(null, {fd: 3});

	var comm = workerBinaryComm(Buffer)

	readable.on('data', comm.processChunk.bind(comm))

	comm.onMessage = function(msg){
		worker.onMessage(msg)
	}

	worker.postMessage = function(msg, transfer){
		comm.serialize(msg, transfer, writable)
	}
}

function workerBinaryComm(Buffer, bufferSize){
	bufferSize = bufferSize || 16000000
	
	// serialize buffers and offsets
	var su16 = new Uint16Array(bufferSize>>1)
	var su32 = new Uint32Array(su16.buffer)
	var sf64 = new Float64Array(su16.buffer)
	var s32 = 0
	var serializeTransfers = []

	function serializeBinary(value){
		if(typeof value === 'number'){
			su32[s32++] = 1
			if(s32&1) s32 ++
			sf64[s32>>1] = value, s32+=2
			return
		}
		if(typeof value === 'string'){
			su32[s32++] = 2
			var l = value.length
			su32[s32++] = l
			var o = s32<<1
			for(let i = 0; i < l; i++){
				su16[o++] = value.charCodeAt(i)
			}
			if(o&1)o++
			s32 = o>>1
			return
		}
		if(typeof value === 'boolean'){
			su32[so++] = 3
			su32[so++] = value?1:0
			return
		}
		if(typeof value === 'object'){
			if(Array.isArray(value)){
				su32[s32++] = 4
				var l = value.length
				su32[s32++] = l
				for(let i = 0; i < l; i++){
					serializeBinary(value[i])
				}
				return
			}
			else {
				// support ArrayBuffers
				if(value instanceof ArrayBuffer){
					s32[s32++] = 6
					var index = serializeTransfers.indexOf(value)
					if(index === -1) throw new Error('Please transfer all arraybuffers')
					su32[s32++] = index
					return
				}

				var keys = Object.keys(value)
				su32[s32++] = 5
				var l = keys.length
				su32[s32++] = l
				for(let i = 0; i < l; i++){
					var key = keys[i]
					serializeBinary(key)
					serializeBinary(value[key])
				}
				return
			}
		}

		console.log("Cant serialize value type "+typeof value)
	}

	// parse buffers
	var p32 = 0
	var w64 = 0
	var parseWrite = 0
	var parseSize = 0
	var parseTransfers = []
	var pu16 = new Uint16Array(bufferSize>>1)
	var pu32 = new Uint32Array(pu16.buffer)
	var pf64 = new Float64Array(pu16.buffer)

	function parseBinary(){
		var type = pu32[p32++]
		if(type === 1){
			if(p32&1) p32 ++
			var value = pf64[p32>>1]
			p32 += 2
			return value
		}
		if(type === 2){
			var l = pu32[p32++]
			var o = p32<<1
			var s = ''
			for(let i = 0; i < l; i++){
				s += String.fromCharCode(pu16[o++])
			}
			if(o&1) o ++
			p32 = o>>1
			return s
		}
		if(type === 3){
			return pu32[p32++]?true:false
		}
		if(type === 4){
			var l = pu32[p32++]
			var arr = []
			for(let i = 0; i < l; i++){
				arr.push(parseBinary())
			}
			return arr
		}
		if(type === 5){
			var l = pu32[p32++]
			var obj = {}
			for(let i = 0; i < l; i++){
				var key = parseBinary()
				obj[key] = parseBinary()
			}
			return obj
		}
		if(type === 6){
			var index = pu32[p32++]
			return transfersIn[index]
		}
	}
	
	var head32 = new Uint32Array(2)
	var head32buf = Buffer.from(head32.buffer, 0, 8)

	return {
		serialize:function(msg, transfers, stream){
			if(transfers) for(let i = 0; i < transfers.length ; i++){
				var trans = transfers[i]
				head32[0] = trans.byteLength
				head32[1] = 2
				if(u32[0]&7) throw new Error("Please only transfer 8 byte aligned buffers")
				stream.write(head32)
				stream.write(Buffer.from(trans.buffer))
			}
			s32 = 2
			transfersOut = transfers
			serializeBinary(msg)
			if(s32&1) s32 ++
			su32[0] = (s32>>1) - 1
			su32[1] = 1
			stream.write(Buffer.from(su16.buffer, 0, s32<<2))
		},
		processChunk:function(chunk){
			if(chunk.length&7) throw new Error("Cant process non 8 byte aligned chunks")
			var i64 = 0, l64 = chunk.length >> 3
			var rf64 = new Float64Array(chunk.buffer)
			var wf64 = pf64
			var chunkType = 0
			while(i64 < l64){
				for(;i64 < l64;){
					wf64[parseWrite++] = rf64[i64++]
					if(parseSize === 0){
						if(parseWrite>=1){
							parseSize = pu32[0]
							chunkType = pu32[1]
							if(chunkType === 2){
								parseWrite = 0
								wf64 = new Float64Array(parseSize)
							}
						}
					}
					else if((--parseSize) === 0){
						i64++
						break
					}
				} 
				if(parseSize === 0 && chunkType > 0){
					if(chunkType === 1){
						p32 = 2
						var msg = parseBinary()
						this.onMessage(msg)
						parseTransfers.length = 0
					}
					else if(chunkType === 2){
						parseTransfers.push(wf64.buffer)
					}
					parseWrite = 0
					parseSize = 0
					chunkType = 0
				}
			}
		}
	}
}

function workerCleanup(a){
	
	var proc = global.process

	var ignore = {
		setInterval:1,
		clearInterval:1,
		setTimeout:1,
		clearTimeout:1,
		setImmediate:1,
		global:1
	}

	for(let key in global){
		if(!(key in ignore)){
			delete global[key] 
		}
	}

	global.process = {
		nextTick:proc.nextTick
	}

	Object.freeze(global.process)

	global.console = {
		log:function(msg){
			worker.postMessage({
				$:'log',
				msg:msg
			})
		}
	}
	
	delete global.global
}

// creates a worker creator
root.makeWorkerCreator = function(source){
	// lets make a worker.
	return function(){
		try{
		var child = child_process.spawn(process.execPath, [
			'-e',
			'(function(){var worker = {}\n'+workerBinaryComm.toString()+'\n'+workerPre.toString()+'\n'+workerCleanup.toString()+'\workerPre()\n'+source+'\nworkerCleanup()})()'
		],{
			argv0:'',
			stdio:[process.stdin, process.stdout, process.stderr, 'pipe']
		})

		var childStream = child.stdio[3]

		var comm = workerBinaryComm(Buffer)

		childStream.on('data', comm.processChunk.bind(comm))

		comm.onMessage = function(msg){
			if(msg.$ === 'log'){
				console.log(msg.msg)
				return
			}
			worker.onMessage(msg)
		}

		var worker = {
			postMessage:function(msg, transfers){
				// write it
				comm.serialize(msg, transfers, childStream)
			}
		}

		return worker

	}catch(e){
		console.log(e)
	}
	}
}

// watches a file
root.watchFile = function(localFile){
}

// inject a script tag for url
root.showParseError = function(path){
}

var httpHost = 'localhost'
var httpPort = 2001
var httpCachePath = __dirname+'/node/cache/'
var useLocalPlatform = false

function pathExists(path){
	try{
		fs.statSync(path)
		return true
	}
	catch(e){
		return false
	}
}

if(!pathExists(httpCachePath)) fs.mkdirSync(httpCachePath)

// downloads a resource
root.downloadResource = function(localFile, isBinary){

	// if localFile is from platform/ lets use local copy.
	return new Promise(function(resolve, reject){
		if(useLocalPlatform && localFile.indexOf('platform/') === 0){
			var localPath  = __dirname + localFile.slice(8) 
			fs.readFile(localPath, function(err, res){
				if(err) return reject(err)
				resolve(isBinary?new ArrayBuffer(res):String(res))
			})
			return
		}

		var split = localFile.split('/')
		var total = httpCachePath
		for(let i = 0; i < split.length - 1; i++){
			total += split[i]
			if(!pathExists(total)) fs.mkdirSync(total)
			total += '/'
		}
		var cachePath = httpCachePath + localFile
	
		fs.stat(cachePath, function(err, stat){
			var headers = {}
			if(!err){
				headers['if-none-match'] =  stat.mtime.getTime() + '_' + stat.size
			}
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
			http.get({
				host: httpHost,
				port: httpPort,
				path: localFile,
				headers:headers
			},
			function(res){
				//console.log(res)
				if(res.statusCode === 304){ // cached
					fs.readFile(cachePath, function(err, res){
						if(err) return reject(err)
						resolve(isBinary?new ArrayBuffer(res):String(res))
					})
					return
				}
				else if(res.statusCode !== 200) return reject(res.statusCode)

				var str = fs.createWriteStream(cachePath)
				res.pipe(str)

				str.on('finish', function(){
					// lets set the exact timestamp on our file
					if(res.headers.mtime){
						var time = res.headers.mtime / 1000
						fs.utimes(cachePath, time, time)
					}
					fs.readFile(cachePath, function(err, res){
						if(err) return reject(err)
						resolve(isBinary?new ArrayBuffer(res):String(res))
					})
				})
			})
		})
	})
}

// load up boot file
root.downloadResource(root.platformPath+'boot.js').then(function(result){
	// start it up
	try{
		new Function("root", result)(root)
	}
	catch(e){
		root.showParseError(root.platformPath+'boot.js')
		return
	}

	root.onInitApps([{
		main:process.argv[2]
	}])
})
