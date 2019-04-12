Previously, any multi-user application that wanted to interact with Looker had no recourse but to be configured with an administrative Looker secret:

```

[User A] ->
            [ Application / Server          ]
			[  Knows: Looker Admin Secret   ]  -> [Looker Instance]
			[  Must already know/auth users ]
[User B] -> 
```

Among other things, this means that it is not possible to build purely client-side applications, because :

```
[Application Code] -> [ Application / Browser   ]  -?-> [Looker Instance]
					  [ Knows... secret? :(     ]
```

It also meant that it is dubious to build a multi-Looker-instance server-side application, becuase it requires all the Looker instances to entrust a shared/3rd-party service with their secrets:

```
                   [Application / Server                 ]
[Maybe Users?]  -> [  Knows: Looker #1 Admin Secret :-/  ]  -> [ Looker Instance #1 ]
                   [  Knows: Looker #2 Admin Secret :-/  ]
			       [  Doesn't... know who users are or   ]  -> [ Looker Instance #2 ]
                   [    how they should be granted access]
			       [    to which instances               ]
```

So what could you do if you just wanted to build a third party application that leverages Looker in general, but not a specific Looker per deployment? Or doesn't even require deployments and can be used by any Looker user? Not much...

This proof-of-concept uses the OAuth2 Authentication Code with PKCE flow to enable:

```
[Application Code            ]                  -> [Intermediary OAuth Service  ] -> [Looker Instance #1]
[ Can be hosted statically   ]  -> [User 1/App]    [  Knows: Lkr #1 Admin Secret]    [  Knows: its users]
[ Doesn't know users         ]  -> [User 2/App]
[ Doesn't know Looker secrets]                  -> [Intermediary OAuth2 Service ] -> [Looker Instance #2 ]
                                                   [  Knows: Lkn #2 Admin Secret]    [   Knows: its users]   
```

The `sample-login.html` file demonstrates the most basic applic implementation of the standard flow. Real applications may also use a standard library of their choice.

The `index.js` file implements the Intermediary OAuth Service and can be deployed as a Google Cloud Function. Set environmental variables to configure which Application origins it will allow (possibly *) and which Looker instance/secret is should connect with.

The LookML files implement a model and dashboard that present a challenge to the end user via the UI. The Intermediary Oauth Service then verifies the challenge against backend API calls to Looker, to ensure that only users authorized in Looker's UI can receive an access token from the Intermediary OAuth Server. The model requires a BigQuery connection for calculating a rotating secret and hash.