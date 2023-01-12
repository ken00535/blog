participant Client
participant Server

Client->Server: Login with username and password
Server->Server: Save user information with session ID
Server->Client: Set session ID to cookie
Client->Server: Send request with cookie

==

participant Client
participant Server

Client->Server: Login with username and password
Server->Server: Issue JWT
Server->Client: Return JWT at response payload
Client->Server: Send request with authentication header

==

