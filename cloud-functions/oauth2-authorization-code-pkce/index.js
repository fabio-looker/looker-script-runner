const https = require('https')
const crypto = require('crypto')

let adminClientId = process.env.adminClientId,
	adminClientSecret = process.env.adminClientSecret,
	ownHostPath = process.env.ownHostPath, //Note, due to looker, legal chars are 0-9A-Za-z_$:-/
	ownSecret = process.env.ownSecret, //Used for symmetric encryption/decription of token into code
	lookerHost = process.env.lookerHost,
	lookerUiPort = process.env.lookerUiPort || "443",
	lookerApiPort = process.env.lookerApiPort || "19999",
	model = process.env.model || "embed_api_oauth2",
	dashboard = process.env.model || "auth",
	explore = process.env.explore || "auth",
	corsAllowOrigin = process.env.allowOrigin || "*",
		//Allow-Origin: * should be fine since the token request is already authenticated by virtue
		// of having the code, but configure this if it makes you feel safer. Only 1 value is supported for now
	applicationAllowedClientIds = new RegExp( process.env.applicationAllowedClientIds || ".*"),
	applicationAllowedRedirectUris = process.env.applicationAllowedRedirectUris
		&& new RegExp(process.env.applicationAllowedRedirectUris)
exports.requestHandler = async (req, res) => {
	let debug = req.query.debug === "1" && process.env.allowDebugLogging
	try{
		
		//Server config validation::
		if(!adminClientId){throw "Function is misconfigured - missing adminClientId (API credentials)"}
		if(!adminClientSecret){throw "Function is misconfigured - missing adminClientSecret (API credentials)"}
		if(!ownHostPath){throw "Function is misconfigured - missing ownHostPath"}
		if(!ownSecret){throw "Function is misconfigured - missing ownSecret"}
		if(!ownSecret.match(/^[0-9a-fA-F]{64}$/)){throw "Function is misconfigured - ownSecret must be 64 hex characters"}
		if(!lookerHost){throw "Function is misconfigured - missing lookerHost"}
		if(!lookerHost.match(/^[^:/?&#@ \n\t]+$/)){throw "Function is misconfigured - malformed lookerHost"} 
		if(!lookerUiPort.match(/^[0-9]{0,5}$/)){throw "Function is misconfigured - malformed lookerUiPort"} 
		if(!lookerApiPort.match(/^[0-9]{0,5}$/)){throw "Function is misconfigured - malformed lookerApiPort"}
		if(!model.match(/^[^:/?&#@ \n\t]+$/)){throw "Function is misconfigured - malformed model"}
		if(!explore.match(/^[^:/?&#@ \n\t]+$/)){throw "Function is misconfigured - malformed explore"}
		if(!applicationAllowedRedirectUris){throw "Function is misconfigured - missing applicationAllowedRedirectUris"}
		
		//Routing
		// There are three routes... 
		switch(req.path.split("/").filter(Boolean)[0]){
			//First, the one that we expose to the app for it to direct users to,
			// so we can abstract the proprietary nature of the URL flow into a standard OAuth pattern.
			// It should redirect to a Looker UI, with route #2 as a callback param, so the user can auth in the UI
			case "authorize": return appRequestingAuthorization()
			
			//Then, the one that the Looker UI redirects to, we render callback.html to pass the code to the app
			case "verify": return await presumablyLookerConfirmingLogin()
			
			//Finally the CORS enabled 
			case "token": return appExchangingCodeForToken()
			
			//Err, I meant 4... this helps render an "LookerOpaque" encoded URL in Looker
			case "badge": return lookerRenderingBadge()
			
			default:
				return res.status(400).send("Requested URL does not exist")
			}
		}
	catch(e){
		console.error(e)
		res.status(parseInt(e && e.status)||500).send({error: e && e.message || e && e.msg || "Internal Server Error"})  
		}
	return
	
	function appRequestingAuthorization(){
		/*Request validation*/ {
			if(!req.query.response_type){
				return res.status(400).send({error:"Missing required querystring parameter, 'response_type'. Try 'code'"})
				}
			if(req.query.response_type!='code'){
				return res.status(400).send({error:"Only 'code' response_type is supported"})
				}
			if(!req.query.client_id){
				return res.status(400).send({error:"Missing required querystring parameter: client_id. This is specific to the application/codebase requesting the access."})
				}
			if(!req.query.client_id.match(applicationAllowedClientIds)){
				return res.status(400).send({error:"Unrecognized client_id"})
				}
			if(!req.query.redirect_uri){
				return res.status(400).send({error:"Missing required querystring parameter: redirect_uri. Try https://(your-application)/login"})
				}
			if(!req.query.redirect_uri.match(applicationAllowedRedirectUris)){
				return res.status(400).send({error:"Requested redirect_uri is not allowed"})
				}
			if(req.query.redirect_uri.match(/[?#]/)){
				return res.status(400).send({error:"Redirect_uri cannot contain URL parameters. Use 'state' parameter to opaquely preserve state information instead."})
				}
			if(!req.query.scope){
				return res.status(400).send({error:"Missing required querystring parameter: scope. Try 'full'"})
				}
			if(req.query.scope != 'full'){
				return res.status(400).send({error:"Only 'full' scope is currently supported"})
				}
			if(!req.query.state){
				return res.status(400).send({error:"Missing required querystring parameter: state. This is an unpredictable/random value generated for each authorization flow by the requesting application, which it should use later to validate that a received token was requested by it, and optionally map it back to an application state at the time of the start of the flow."})
				}
			if(!req.query.state){
				return res.status(400).send({error:"Missing required querystring parameter: state"})
				}
			if(!req.query.code_challenge_method){
				return res.status(400).send({error:"Missing required querystring parameter: code_challenge_method. Try 'S256'"})
				}
			if(req.query.code_challenge_method != 'S256'){
				return res.status(400).send({error:"Only 'S256' code_challenge_method is currently supported"})
				}
			if(!req.query.code_challenge){
				return res.status(400).send({error:"Missing required querystring parameter: code_challenge. Try 'S256'"})
				}
			if(!req.query.code_challenge.match(/^[-_0-9a-zA-Z]+$/)){
				return res.status(400).send({error:"Code challenge must be 'base64 url encoded'. See https://tools.ietf.org/html/rfc7636#appendix-A"})
				}
		}
		let interfaceUri = `https://${host(lookerHost,lookerUiPort)}`
			+`/embed/dashboards/${model}::${dashboard}`
			+'?intermediary_url='+encodeURIComponent(lookerUrlEncode(`https://${ownHostPath}`))
			+'&cha='+encodeURIComponent(lookerOpaqueEncode(req.query.code_challenge))
			+'&sta='+encodeURIComponent(lookerOpaqueEncode(req.query.state))
			+'&url='+encodeURIComponent(lookerOpaqueEncode(req.query.redirect_uri))
			+'&allow_login_screen=true'
		res.setHeader('Location',interfaceUri)
		res.status(303).send()
		}
		
	async function presumablyLookerConfirmingLogin(){
		try{
			/*Request validation*/ {
				if(!req.query.cha){return res.status(400).send({error:"Missing required querystring parameter: cha"})}
				if(!req.query.exp){return res.status(400).send({error:"Missing required querystring parameter: exp"})}
				if(!req.query.sta){return res.status(400).send({error:"Missing required querystring parameter: sta"})}
				if(!req.query.sig){return res.status(400).send({error:"Missing required querystring parameter: sig"})}
				if(!req.query.uid){return res.status(400).send({error:"Missing required querystring parameter: uid"})}
				if(!req.query.url){return res.status(400).send({error:"Missing required querystring parameter: url"})}
				if(!req.query.exp.match(/^[0-9]+$/)){return res.status(400).send({error:"Malformed querystring parameter: exp"})}
				if(!req.query.uid.match(/^[0-9]+$/)){return res.status(400).send({error:"Malformed querystring parameter: uid"})}
				if(!req.query.sig.match(/^[0-9a-fA-F]+$/)){return res.status(400).send({error:"Malformed querystring parameter: sig"})}
				if(!lookerOpaqueValid(req.query.sta)){return res.status(400).send({error:"Malformed querystring parameter: sta"})}
				if(!lookerOpaqueValid(req.query.url)){return res.status(400).send({error:"Malformed querystring parameter: url"})}
				if(!lookerOpaqueDecode(req.query.url).match(applicationAllowedRedirectUris)){
					return res.status(400).send({error:"Requested redirect url now allowed"})
					}
				if(!(parseInt(req.query.exp) >= Date.now()/1000)){return res.status(401).send({error:"Claim has expired. (Try starting over)"})}
			}
			let ivPromise = new Promise((res,rej)=>crypto.randomBytes(12,(err,buf)=>err?rej(err):res(buf)))
			let adminAuth = await api("POST","login",{qs:{client_id:adminClientId,client_secret:adminClientSecret}})
			if(!adminAuth || !adminAuth.access_token){throw {msg:"Unexpected admin auth response",adminAuth}}
			let adminToken = adminAuth.access_token
			let authCheck = await api("GET", `queries/models/${model}/views/${explore}/run/json`,{
				token:adminToken,
				qs:{
					fields:`${explore}.check_claim,${explore}.check`,
					[`f[${explore}.cha]`]:req.query.cha,
					[`f[${explore}.exp]`]:req.query.exp,
					[`f[${explore}.sig]`]:req.query.sig,
					[`f[${explore}.sta]`]:req.query.sta,
					[`f[${explore}.uid]`]:req.query.uid,
					[`f[${explore}.url]`]:req.query.url
					}
				})
			if(!authCheck || !authCheck[0] || authCheck[0][`${explore}.check`]===undefined){
				if(debug){console.log(authCheck)}
				throw {msg:"Unexpected AuthCheck",authCheck}
				}
			if(authCheck[0][`${explore}.check`]!=="Yes"){
				if(debug){console.log(authCheck[0])}
				return res.status(401).send({error:"Invalid or expired signature. Maybe start over and retry."})
				}
			let userAuth = await api("POST", `login/${req.query.uid}`, {token:adminToken})
			if(!userAuth || !userAuth.access_token){
				if(debug){console.log(userAuth)}
				throw {msg:"Unexpected user auth response",userAuth}
				}
			let expires = parseInt(Date.now()/1000 + userAuth.expires_in)
			// As suggested at https://github.com/chris-rock/node-crypto-examples/blob/master/crypto-gcm.js
			// https://crypto.stackexchange.com/questions/64738/how-to-apply-iv-and-tag-to-protect-messages-encrypted-using-aes-gcm
			let iv = await ivPromise //.toString('hex') //96 bits, or 24 hex chars
			let message = JSON.stringify([userAuth.access_token,expires,req.query.cha])
			let cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ownSecret,"hex"), iv)
			let cyphertext = cipher.update(message, 'utf8', 'hex') + cipher.final('hex')
			let tag = cipher.getAuthTag()
			let code = [
				iv.toString('hex'),
				tag.toString('hex'),
				cyphertext
				].join('-')
			let url = lookerOpaqueDecode(req.query.url)+"?code="+code
			res.setHeader('Location',url)
			res.status(303).send()
			}
			catch(e){
				if(debug){
					console.error(e)
					console.log("Lengths: ",Buffer.from(ownSecret,"hex").length)
					}
				return res.status(500).send("Unspecified error")
				}
		}
	
	function appExchangingCodeForToken(){
		try{
			res.set('Access-Control-Allow-Origin', corsAllowOrigin = process.env.allowOrigin || "*")
			// grant_type=authorization_code – Indicates the grant type of this token request
			// code – The client will send the authorization code it obtained in the redirect
			// redirect_uri – The redirect URL that was used in the initial authorization request
			// client_id – The application’s registered client ID
			// code_verifier – The code verifier for the PKCE request, that the app originally generated before the authorization request.
			if(req.method=='OPTIONS'){
				res.set('Access-Control-Allow-Methods','POST')
				res.set('Access-Control-Allow-Headers','Content-Type')
				return res.status(204).send()
				}
			if(req.method!='POST'){
				return res.status(400).send({error:"Request method must be POST"})
				}
			if(!req.body.grant_type){
				return res.status(400).send({error:"Missing required querystring parameter, 'grant_type'. Try 'authorization_code'"})
				}
			if(req.body.grant_type!='authorization_code'){
				return res.status(400).send({error:"Only 'authorization_code' grant_type is supported"})
				}
			if(!req.body.code){
				return res.status(400).send({error:"Missing required querystring parameter, 'code'."})
				}
			if(!req.body.redirect_uri){
				return res.status(400).send({error:"Missing required querystring parameter, 'redirect_uri'. (The redirect URL that was used in the initial authorization request)"})
				}
			if(!req.body.redirect_uri.match(applicationAllowedRedirectUris)){
				return res.status(400).send({error:"Specified 'redirect_uri' is not allowed"})
				}
			if(!req.body.client_id){
				return res.status(400).send({error:"Missing required querystring parameter, 'client_id'"})
				}
			if(!req.body.client_id.match(applicationAllowedClientIds)){
				return res.status(400).send({error:"Specified 'client_id' is not recognized"})
				}
			if(!req.body.code_verifier){
				return res.status(400).send({error:"Missing required querystring parameter, 'code_verifier'."})
				}
			let [iv,tag,cyphertext] = req.body.code.split('-')
			let decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ownSecret,"hex"), Buffer.from(iv,"hex"))
			decipher.setAuthTag(Buffer.from(tag,'hex'))
			let plaintext = decipher.update(cyphertext, 'hex', 'utf8') + decipher.final('utf8')
			let [access_token, expires, priorChallengeEncoded] = JSON.parse(plaintext)
			let priorChallenge = lookerOpaqueDecode(priorChallengeEncoded)
			let calculatedChallenged = sha256Base64Url(req.body.code_verifier)
			if(!constantTimeEqual(calculatedChallenged, priorChallenge)){
				if(debug){console.log("code_verifier rejected",{
					priorChallenge,
					receivedVerifier:req.body.code_verifier,
					calculatedChallenged
					})}
				return res.status(400).send({error:"Invalid code_verifier. Refusing to provide authentication."})
				}
			return res.status(200).send({access_token,expires})
			}
		catch(e){
			if(debug){console.error(e)}
			return res.status(500).send("Unspecified error")
			}
		}
	function lookerRenderingBadge(){
		res.setHeader('Content-Type','image/svg+xml')
		res.status(200).send(
			`<svg xmlns="http://www.w3.org/2000/svg">
				<text xmlns="http://www.w3.org/2000/svg" 
					alignment-baseline="middle" text-anchor="middle" 
					x="320" y="10" 
					style="font: 20px sans-serif;background-color:#eee;border:1px solid #ccc;border-radius:2px;color:#436"
				>${encodeXml(urlName(lookerOpaqueDecode(req.query.url||'')))}</text>
			</svg>`
			)
		}
	
	function api(verb,method,{token,qs={},body,debug}={}){
		return new Promise((res,rej)=>{
			let requestConfig = {
				method: verb,
				hostname: lookerHost,
				port: lookerApiPort,
				path: "/api/3.0/"+method
					+ (method.includes("?")?"&":"?")
					+ Object.entries(qs).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
					,
				headers: {
					...(token?{"Authorization":"token "+token}:{})
					}
				}
			let requestBody = body===undefined?"":JSON.stringify(body)
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

function host(domain,port){return (port && 1*port!=443)?(domain+':'+port):domain}
function lookerUrlEncode(str){return (str
	.replace(/\//g,"$s") //Slash
	.replace(/\-/g,"$d") //Dash
	.replace(/\:/g,"$c") //Colon
	)}	
function lookerOpaqueEncode(str){return str.replace(/[^a-zA-Z0-9]/g,ch=>'$'+ch.codePointAt(0).toString(16)+'.')}
function lookerOpaqueDecode(str){return str.replace(/\$[0-9a-fA-F]+\./g,code=>String.fromCodePoint(parseInt(code.slice(1,-1),16)))}
function lookerOpaqueValid(str){
	if(!str.match(/^[$.0-9a-zA-Z]*$/)){return false}
	try {lookerOpaqueDecode(str);return true}
	catch (e) {return false}
	}
function encodeXml(str) {
	return str.replace(/[<>&'"]/g, ch=>"&"+ch.codePointAt(0).toString(16)+";")
	}
function urlName(url){
	let match = url.match(/^(https?:)?(\/\/[^\/?#]+)/)
	if(!match){return "Unknown"}
	if(match[1]=="https:"){return match[2]}
	return match[1]+match[2]
	}
function sha256Base64Url(str) {
	let hasher = crypto.createHash('sha256')
	hasher.update(str,'utf8')
	return hasher.digest().toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
	}
function constantTimeEqual(strA, strB) {
	if(typeof strA!=="string"){throw new Error("String argument required")}
	if(typeof strB!=="string"){throw new Error("String argument required")}
	const aLen = Buffer.byteLength(strA)
	const bLen = Buffer.byteLength(strB)
	const bufA = Buffer.alloc(aLen, 0, 'utf8')
	bufA.write(strA)
	const bufB = Buffer.alloc(aLen, 0, 'utf8') //Yes, aLen
	bufB.write(strB)
	return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen
	}
