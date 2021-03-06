const https = require('https');
exports.cors = async (req, res) => {
	let whitelistOriginsRegex = process.env.whitelistOriginsRegex,
		whitelistServersRegex = process.env.whitelistServersRegex,
		debug = req.query.debug === "1" && process.env.allowDebugLogging
	try{
		res.set('Access-Control-Allow-Origin', 
			whitelistOriginsRegex 
			? req.headers.origin.test(new Regex(whitelistOriginsRegex))
				? req.headers.origin
				: "DENY" 
			: "*")
		res.set("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE")
		res.set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		res.set("Access-Control-Max-Age", "3600")
	  	if (req.method == 'OPTIONS') {
			return res.status(204).send('')
			}
		
		let pathSegments = req.path.split("/").slice(1) 
		let host = pathSegments[0]
		if(whitelistServersRegex && !host.test(new Regex(whitelistServersRegex))){
			return res.status(400).json({error:`Requested remote origin (${host}) is not allowed by function configuration`})
			}
		let hostname = host.split(":")[0]
		let port = parseInt(host.split(":")[1])
		if(debug){console.log("req.headers",req.headers)}
		let originRes = await request(peek({
			method: req.method,
			hostname: pathSegments[0].split(":")[0],
			...(port?{port}:{}),
			path: "/"+pathSegments.slice(1).join("/"),
			query: req.query,
			headers: {
				authorization: req.headers.authorization
				},
			body: req.body
		}))
		return res.status(originRes.status||200).json(originRes.body)
		}
	catch(e){
		console.error(e)
		return res.status(500).json({error:"Internal Server Error"})
		}
	
	function peek(o){if(debug){console.log(o)}return o}
	function request({
			method,
			hostname,
			port,
			path,
			query = {},
			headers,
			body
		}){
		let bodyString = JSON.stringify(body)
		return new Promise((res,rej)=>{
			let requestConfig = {
				method,
				hostname,
				...(port?{port}:{}),
				path: path
					+ (path.includes("?")?"&":"?")
					+ Object.entries(query).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
					,
				headers:{
					...headers,
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(bodyString)
					}
				}
			let req = https.request(requestConfig,
				resp=>{
					let data = '';
					resp.on('data', (chunk) => {data+=chunk;})
					resp.on("error", err => {rej(err.message)})
					resp.on('end', () => {
						try{res({
							...resp,
							...(data?{body: tryJsonParse(data,data)}:{})
							})}
						catch(e){rej(e)}
						})
					}
				)
			//Note: Cloud Functions seems to smartly interpret various body content types & convert to a unified representation
			// But, we don't need to reproduce all those original bodies, since looker only cares about JSON bodies
			if(body!==undefined){req.write(bodyString)}
			req.end()
			})
		}
	}
	
function tryJsonParse(str,dft){
	try{return JSON.parse(str)}catch(e){return dft}
	}