function Api({
		token,
		cfnCors, //Host of CORS proxy
		lkrApiHost, //Host of Looker API (including port)
		apiVersion = "3.0"
	}){
	let defaultToken = token
	return async function api(endpoint,{token, qs={}, body}={}){
		let match = endpoint.match("^(GET|POST|PUT|PATCH|DELETE)? ?(.*)$")
		let method = match[1]||"GET"
		let path = match[2]
		let headers = {
				'Authorization':'token '+(token||defaultToken),
				...(body?{'Content-Type': 'application/json; charset=UTF-8'}:{})
			}
		let response = await fetch(
			"https://"+cfnCors+"/"+lkrApiHost
			+"/api"
			+"/"+apiVersion
			+"/"+path
			+(path.includes("?")?"&":"?")
			+Object.entries(qs).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&")
			,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}
			)
		if(!response.ok){throw response.statusText}
		return await response.json()
		}
	}
