

# Basic Implementation
- Fork the repo
	- This will allow you to maintain your own config.json
- Set up Google Cloud
	- Create project
	- Set up BigQuery
		- ...
	- Enable Source Code
		- link to forked repo
	- Set up GCF
	 	- 
- Set up LookML
	- Create a new project
	- Copy the model and dashboard file into your project
	- 
	

# Further Implementation Steps

- Instance administrators should disable all other models from using this connection
- Instance administrators should limit which users can develop in this model/project
 	- Otherwise, developers could:
		- use dev mode LookML to retrieve the current rotating secret
	 	- modify prod LookML controlling which parent URLs are allowed to receive session-granting signatures from other users
- ⚠️ GCP Administrators should externalize the administrative API secret from the Google Cloud Functions' environmental variable.
 	- Otherwise, any GCP Administrator with access to configure the function can retrieve the secret.
	- A subsequent version of the implementation instructions will detail the most convenient way to do this. Likely with a Cloud Storage bucket only readable by a service account.
- Instance administrators may limit which users are able to grant access to a script by including/excluding the embed_api_auth model from the users' roles.
	- To achieve a better UI for unauthorized users, administrators may adapt the model to have a user attribute to control access instead.


# Security Design

- ⚠️ Random number strength - The rotating secret is based on random numbers generated by BigQuery's RAND() function. No information is provided by BigQuery docs regarding the cryptographic strength of this function. On the other hand, the running of this function is only initiated by Looker's PDT regenerator, and not by end users, which may complicate any attempt to exploit weaknesses in these random numbers. 
- User permissions - Looker's role system can be used to limit which Looker users have access to the model that enables this authentication
- Anti click-jacking - The use of a whitelist on the external_url parameter (used as the basis for the linkback) ensures that only approved origins/URLs can receive the result of the click action
- Anti CSRF - The use of a state parameter by the calling page ensures that it cannot be sent authentication claims that it did not request
- Rotating secret - The signing secret is known only to the data warehouse, and it is periodically rotated.


# Other/Future Possible Developments
- Secret known to the auth server - The auth server could also be allowed to keep the signing secret in-memory for faster/no-network verification 
- Audience allowed - The claim may optionally contain an "aud" claim. This would allow certain classes of "privelege escalating" API scripts to confirm that the signature was intended (and approved by the user) for use with this script.
- More frequent secret rotation - With an incremental PDT feature, it would be feasible to rotate the secret much more frequently, since you could keep a copy of the previous secret(s) to be accepted within the margins affored by the token expiration.