var sockets = []

module.exports = function(sock){
    sockets.push(sock)

    sock.onMessage = function(msg){
        try{
            let data = JSON.parse(msg.data)
            console.log("RECEIVED", data)
            sock.send(JSON.stringify({msg:"HELLO"}))
        }
        catch(e){
            console.log(e)
        }
    }
}

function doSomething(){
    let msg = JSON.stringify({
        data:'test'
    })

    for(let i = 0; i < sockets.length; i++){
        sockets[i].send(msg)
    }
}