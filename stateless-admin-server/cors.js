const https = require('https');
exports = module.exports = async (req, res) => {
	try{
		res.set('Access-Control-Allow-Origin', process.env.allowOrigin || "*")
		res.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE")
		res.set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		res.set("Access-Control-Max-Age", "3600")
	  	if (req.method == 'OPTIONS') {
			return res.status(204).send('')
			}
		
		let hostname = req.path.split("/")[1].split(":")[1]
		let pathSegments = req.path.split("/").slice(2) //0 is "", 1 is the function name in Google Cloud Functions
		let originRes = await request(peek({
			method: req.method,
			hostname: pathSegments[0].split(":")[0],
			port: parseInt(pathSegments[0].split(":")[1]),
			path: "/"+pathSegments.slice(1).join("/"),
			query: req.query,
			headers: {
				Authorization: req.headers.Authorization
				},
			body: req.body
		}))
		return res.status(200).json(originRes)
		}
	catch(e){
		console.error(e)
		return res.status(500).send({error:"Unexpected Error"})
		}
	
	function peek(o){if req.query.debug=="1"){console.log(o)}return o}
	function request({
			method,
			hostname,
			port = 443,
			path,
			query = {},
			headers,
			body
		}){
		return new Promise((res,rej)=>{
			let requestConfig = {
				method,
				hostname,
				port,
				path: path
					+ "?"+Object.entries(query).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
					,
				headers
				}
			let req = https.request(requestConfig,
				resp=>{
					let data = '';
					resp.on('data', (chunk) => {data+=chunk;})
					resp.on("error", err => {rej(err.message)})
					resp.on('end', () => {
						try{res(JSON.parse(data))}
						catch(e){rej(e)}
						})
					}
				)
			if(requestBody){req.write(requestBody)}
			req.end()
			})
		}
	}