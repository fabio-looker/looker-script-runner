function Api({
		token,
		cfnCors, //Host of CORS proxy
		lkrApiHost, //Host of Looker API (including port)
		apiVersion = "3.1"
	}){
	let defaultToken = token
	return async function api(endpoint,{token, qs={}, body}={}){
		let match = endpoint.match("^(GET|POST|PUT|PATCH|DELETE)? ?(.*)$")
		let method = match[1]||"GET"
		let fields
		let path = match[2].replace(/\.[^?#]+/, str=>{fields=str.slice(1); return ""})
		let headers = {
				'Authorization':'token '+(token||defaultToken),
				...(body?{'Content-Type': 'application/json; charset=UTF-8'}:{})
			}
		qs = {fields,...qs}
		let response = await fetch(
			(lkrApiHost 
				? "https://"
					+(cfnCors ? cfnCors+"/" : "")
					+lkrApiHost
				: ""
				)
			+"/api"
			+"/"+apiVersion
			+"/"+path
			+(path.includes("?")?"&":"?")
			+Object.entries(qs)
				.filter(([k,v])=>v!==undefined)
				.map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
			,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}
			)
		if(!response.ok){throw response.statusText}
		try{return await response.json()}
		catch(e){return await response.text()}
		}
	}
