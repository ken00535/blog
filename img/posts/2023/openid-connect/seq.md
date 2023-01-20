actor Resource Owner
participant Client
participant Authorization Server

Resource Owner->Client: click login link
Resource Owner<--Client: redirect to authorization ep
Resource Owner->Authorization Server: access authorization ep
Resource Owner<->Authorization Server: authenticate
Resource Owner->Authorization Server: authorize
Resource Owner<--Authorization Server: grant code & redirect to client
Resource Owner->Client: access with code
Client->Authorization Server: token ep with code
Client<-Authorization Server: **(A)** token
Client->Protected Resource: access resource with token
Client<-Protected Resource: **(B)** resource

== 

actor End User
participant Relying Party
participant OpenID Provider

End User->Relying Party: click login link
End User<--Relying Party: redirect to authorization ep
End User->OpenID Provider: access authorization ep
End User<->OpenID Provider: authenticate
End User->OpenID Provider: authorize
End User<--OpenID Provider: grant code & redirect to Relying Party
End User->Relying Party: access with code
Relying Party->OpenID Provider: token ep with code
Relying Party<-OpenID Provider: **(A)** access token & ID token
Relying Party->OpenID Provider: **(B)** access UserInfo with access token
Relying Party<-OpenID Provider: **(C)** UserInfo

==

actor End User
participant Relying Party
participant OpenID Provider

End User->Relying Party: click login link
End User<--Relying Party: redirect to authorization ep
End User->OpenID Provider: access authorization ep
End User<->OpenID Provider: authenticate
End User->OpenID Provider: authorize
End User<--OpenID Provider: grant code & redirect to Relying Party
End User->Relying Party: access with code
Relying Party->OpenID Provider: token ep with code
Relying Party<-OpenID Provider: **(A)** access token & ID token
Relying Party->OpenID Provider: **(B)** access UserInfo with access token
Relying Party<-OpenID Provider: **(C)** UserInfo

==

actor End User
participant Relying Party
participant OpenID Provider

End User->Relying Party: GET /localhost:8080/login
End User<--Relying Party: 302 Location /accounts.google.com/o/oauth2/auth
End User->OpenID Provider: GET /accounts.google.com/o/oauth2/auth
End User<->OpenID Provider: authenticate
End User->OpenID Provider: authorize
End User<--OpenID Provider: 302 Location /localhost:8080/callback
End User->Relying Party: GET /localhost:8080/callback
Relying Party->OpenID Provider: POST /oauth2.googleapis.com/token
Relying Party<-OpenID Provider: 200, access token & ID token
Relying Party->OpenID Provider: GET /openidconnect.googleapis.com/v1/userinfo
Relying Party<-OpenID Provider: 200, userinfo
End User<-Relying Party:302 Location /localhost:8080