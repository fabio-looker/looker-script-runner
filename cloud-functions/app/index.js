const fs = require('fs')

exports.app = async (req, res) => {
	try{
		switch(req.path.replace(/\/$/,"")){
			case "":
				res.set("Content-Type","text/html")
				//req.set("Max-Age"?
				res.status(200).send(await read("index.html"))
				break
			case "config":
				res.set("Content-Type","application/json")
				res.status(200).send(await read("config.json"))
				break
			default:
				res.status(404).send(await read("404.html")||"Requested URL does not exist")
				break
			}
		}
	catch(e){
		console.error(e)
		return res.status(500).json({error:"Internal Server Error"})
		}
	
	function read(file){
		return new Promise((res,rej)=>{
				try{fs.readFile(file,res,rej)}catch(e){return}
			})
		}
	}