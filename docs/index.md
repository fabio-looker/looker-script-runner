

# Basic Implementation

# Security Controls

- ⚠️ The basic implementation has you to store an administrative API secret in a Google Cloud Functions environmental variable. This is not ideal since any GCP Administrator with access to configure the function can retrieve the secret. This secret should be very easily to externalize for an experienced GCP Administrator, and a subsequent version of the implementation instructions will detail the most convenient way to do this.
- Instance administrators can control which users are able to grant access to a script by including/excluding the embed_api_auth model from the users' roles.
	- To achieve a better UI for unauthorized users, administrators may adapt the model to have a user attribute to control access instead.
- Developers can control which parent URLs are allowed to receive  
	- Administrators may accordingly wish to require pull requests to make changes to this model
	- Changes in development mode do not compromise any risk for two reasons (1) ...primarily own token, not other users' tokens, (2) embed works from prod...

# Security Design

- Anti-click jacking

