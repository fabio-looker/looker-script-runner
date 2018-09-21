const https = require('https');
exports = module.exports = async (req, res) => {
	let clientId = process.env.clientId,
	 	clientSecret = process.env.clientSecret,
		lookerHost = process.env.lookerHost,
		lookerApiPort = process.env.lookerApiPort || "19999",
		model = process.env.model || "embed_api_auth",
		explore = process.env.explore || "auth",
		debug = req.query.debug === "1"
	try{
		//Allow-Origin: * should be fine since the request doesn't mutate anything and the authentication is explicit in the request (i.e., not in a cookie)
		res.set('Access-Control-Allow-Origin', process.env.allowOrigin || "*")
		if(!clientId){
			throw "Function is misconfigured - missing clientId (API credentials)"
			}
		if(!clientSecret){
			throw "Function is misconfigured - missing clientSecret (API credentials)"
			}
		if(!lookerHost){
			throw "Function is misconfigured - missing lookerHost"
			}
		if(!lookerHost.match(/^[^:/?&#@ \n\t]+$/)){
			throw "Function is misconfigured - malformed lookerHost"
			} 
		if(!lookerApiPort.match(/^[0-9]{1,5}$/)){
			throw "Function is misconfigured - malformed lookerApiPort"
			}
		if(!model.match(/^[^:/?&#@ \n\t]+$/)){
			throw "Function is misconfigured - malformed model"
			}
		if(!explore.match(/^[^:/?&#@ \n\t]+$/)){
			throw "Function is misconfigured - malformed explore"
			} 
		if(!req.query.aud){
			return res.status(400).send({error:"Missing required querystring parameter: aud"})
			}
		if(!req.query.exp){
			return res.status(400).send({error:"Missing required querystring parameter: exp"})
			}
		if(!req.query.sub){
			return res.status(400).send({error:"Missing required querystring parameter: sub"})
			}
		if(!req.query.sig){
			return res.status(400).send({error:"Missing required querystring parameter: sig"})
			}
		if(!req.query.sub.match(/^[0-9]+$/)){
			return res.status(400).send({error:"Malformed querystring parameter: sub"})
			}
		if(isNaN(parseInt(req.query.exp))){
			return res.status(400).send({error:"Malformed querystring parameter: exp"})
			}
		if(!(parseInt(req.query.exp)<=Date.now())){
			return res.status(401).send({error:"Claim has expired. (Try starting over)"})
			}
		let adminAuth = await api("POST","login",{queryData:{client_id:clientId,client_secret:clientSecret}})
		if(!adminAuth || !adminAuth.access_token){
			throw {msg:"Unexpected admin auth response",adminAuth}
			}
		let adminToken = adminAuth.access_token
		let authCheck = await api("GET", `queries/models/${model}/views/${explore}/run/json`,{
			token:adminToken,
			queryData:{
				fields:`${explore}.check_claim,${explore}.check`,
				[`f[${explore}.aud]`]:req.query.aud,
				[`f[${explore}.exp]`]:req.query.exp,
				[`f[${explore}.sub]`]:req.query.sub,
				[`f[${explore}.sig]`]:req.query.sig
				}
			})
		if(!authCheck || !authCheck[0] || authCheck[0][`${explore}.check`]===undefined){
			throw {msg:"Unexpected AuthCheck",authCheck}
			}
		if(authCheck[0][`${explore}.check`]!=="Yes"){
			if(debug){console.log(authCheck[0])}
			return res.status(401).send({error:"Invalid or expired signature. Maybe start over and retry."})
			}
		let userAuth = await api("POST", `login/${req.query.sub}`, {token:adminToken})
		if(!userAuth || !userAuth.access_token){
			throw {msg:"Unexpected user auth response",userAuth}
			}
		res.status(200).send(userAuth)
		}
	catch(e){
		console.error(e)
		res.status(parseInt(e.status)||500).send({error: e.message || e.msg || "Internal Server Error"})  
		}
	return
	
	function api(verb,method,{token,queryData={},postData,debug}){
		return new Promise((res,rej)=>{
			let requestConfig = {
				method: verb,
				hostname: lookerHost,
				port: lookerApiPort,
				path: "/api/3.0/"+method+"?"
					+ Object.entries(queryData).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
					,
				headers: {
					...(token?{"Authorization":"token "+token}:{})
					}
				}
			let requestBody = postData===undefined?"":JSON.stringify(postData)
			if(debug){console.log("Request",{...requestConfig,body:requestBody})}
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
	};