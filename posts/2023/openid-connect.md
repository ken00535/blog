---
title: OAuth 2.0 的身份認證：OpenID Connect
description: OAuth 2 讓網路服務可以存取第三方的受保護資源，因此，有些開發者進一步利用 OAuth 2 來進行認證。但這中間會存在著一些語義落差，因為 OAuth 2 當初設計目的是「授權」而不是「認證」，兩者關注的焦點會有些不同。OpenID Connect 是基於 OAuth 2 的一套身份認證協定，讓開發者可以在 OAuth 2 授權的基礎上，也加入標準的認證流程。在這篇文章中，我會說明授權跟認證的場景有何差異，並講解 OpenID Connect 如何滿足認證的需要。...
date: 2023-01-20
scheduled: 2023-01-20
tags:
  - Web
  - Authentication
layout: zh-tw/layouts/post.njk
draft: false
---

OAuth 2 讓網路服務可以存取第三方的受保護資源，因此，有些開發者會進一步利用 OAuth 2 來進行使用者認證。但這中間存在著一些語義落差，因為 OAuth 2 當初設計目的是「授權」而不是「認證」，兩者關注的焦點會有些不同。OpenID Connect 是基於 OAuth 2 的一套身份認證協定，讓開發者可以在 OAuth 2 授權的基礎上，再加入標準的認證流程。在這篇文章中，我會說明授權跟認證的場景有何差異，並講解 OpenID Connect 如何滿足認證需求。

因為 OpenID Connect 是建構在 OAuth 2 的基礎上，我會假設這篇文章的讀者已經知道 OAuth 2 的組件與流程，如果你不熟悉，可以先閱讀另外兩篇文章

- [OAuth 2.0：角色與信道](https://blog.kenwsc.com/posts/2022/oauth-2-0-roles-and-channels/)
- [OAuth 2.0：授權許可](https://blog.kenwsc.com/posts/2022/oauth-2-0-authorization-grant/)

## 認證 vs 授權

**認證(Authentication)** 是證明身份(identity)的機制，它包含兩個問題：你是誰？你怎麼證明？想想餐廳訂位的例子，你需要告知服務生你的姓名與手機電話，她才會幫你帶位。在網路服務中，這兩個問題最常見的形式是：你的帳號是什麼？密碼是什麼？通常這兩個問題會一起問，以防止惡意人士探查特定的人(identity)是否是服務的使用者。當然，如果只憑單項證明，只要證明洩漏，身份就會被冒用，因此像是銀行開戶，會需要攜帶雙證件，讓身份更為安全，在資安上，這稱為多重要素認證(MFA)。

**授權(Authorization)** 則是授予資源存取權限的機制，它包含的問題是：要開放哪些資源？開放給誰？假設你有物品遺忘在車上，你將車鑰匙給朋友，請他去車上幫忙把東西拿過來。你就開放了車子這項資源，而對象則是你的朋友。授權跟身份不一定有關，像是 Facebook 的動態可以只設為私人消息，只開放給特定的朋友；也可以設為公開消息，讓所有人都看到。如果你只開放給特定的人，顯然在看到你的訊息前，就需要先經過認證了。

以 OAuth 2 的流程來說，Client 會要求使用者授權，讓它可以存取第三方資源。當使用者被導向到 Authorization Server 後，Authorization Server 會先請使用者認證，等確認身份沒問題，就會緊接著要求授權。授權結果會用 Token 交給 Client，讓 Client 可以存取受保護資源。

## OAuth 2 的問題

既然 OAuth 2 的流程有要求使用者認證，也有把授權結果轉成 Token 交給 Client。那為什麼還有問題呢？回到原點，我們來問問 Client 要如何回答認證的兩個問題。首先是「我是誰？」，Client 知道使用者是誰嗎？因為使用者是跟 Authorization Server 認證，Authorization Server 知道使用者的身份，但 Authorization Server 交給 Client 只是個 Token，而依照 OAuth 2 的規範，這個 Token 應該要是不透明的

> Access tokens are credentials used to access protected resources. An access token is a string representing an authorization issued to the client. The string is usually opaque to the client.
>
> 訪問令牌是用來訪問受保護資源的憑證。訪問令牌是個字串，用以表達簽發給 Client 的授權。這個字串通常對 Client 來說不透明。

因此，Client 只知道自己拿到授權，如果要知道是「誰」授權的，它需要用 Access Token 存取有使用者身份的資源，例如跟帳號有關的 API，才能知道使用者身份。

再來，Client 是依據哪項證明，知道跟 Client 互動的是使用者本人呢？它同樣是透過授權結果來得知，如果 Access Token 能拿到使用者資料，代表使用者有經過 Authorization Server 認證，Client 就能把 Access Token 的有效性當成使用者身份的證明。

<p align="center">
  <img src="/img/posts/2023/openid-connect/oidc-1.png"/>
</p>

換句話說，在流程上我們可以看到，Client 需要存取受保護資源來達成認證，而在 OAuth 2 中，沒有規範使用者身份的格式跟存取端點。每家 Provider 的實作可能不同，例如 A 有支援使用者的 email 而 B 沒有；或者 A、B 都支援，但 response body 的字段名稱不同；又或者字段名稱也相同，但存放在不同的 Endpoint 中。這些差異需要 Client 的開發者開發一套中間層處理，也不利於開放認證環境的推廣。

## OpenID Connect

為了讓使用者能用 OAuth 的基礎建設進行認證，OpenID Foundation 設計出 OpenID Connect。因應認證的場景，它定義出兩個新角色，並將它們映射到 OAuth 的角色上

- **OpenID Provider** 負責認證使用者，並提供身份證明給 Relying Party，讓 Relying Party 知道認證發生還有使用者是誰。這可以對照到 OAuth 2 的 Authorization Server 跟 Protected Resource。
- **Relying Party** 從 OpenID Provider 獲得認證憑證與使用者資訊。對照到 OAuth 2 的 Client。

從 OpenID Connect 的角度來看的話，流程變成

<p align="center">
  <img src="/img/posts/2023/openid-connect/oidc-2.png"/>
</p>

前面的流程都相同，主要差異在 (A)、(B)、(C) 的三個步驟。我們說過，OAuth 要求 Token 對 Client 來說是不透明的，可是認證又要求 Relying Party 能夠由 OpenID Provider 回傳的資訊來知道使用者身份，要如何同時滿足這兩個需求呢？答案是，在 OpenID Provider 的回傳中，多加入一個 ID Token，而該 Token 對 Relying Party 來講可讀。如此就能在兼容 OAuth 的前提下，又取得認證資訊。

具體來說，當 Relying Party 跟 OpenID Provider 要求 Token 時，OpenID Provider 站在 Authorization Server 的角度會給出 Access Token，同時，它站在 OpenID Provider 的角度，也會附上 ID Token。在同一個 Response 中會帶有這兩項資訊

```json
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "access_token": "SlAV32hkKG",
  "token_type": "Bearer",
  "refresh_token": "8xLOxBtZp8",
  "expires_in": 3600,
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.ewogImlzc
    yI6ICJodHRwOi8vc2VydmVyLmV4YW1wbGUuY29tIiwKICJzdWIiOiAiMjQ4Mjg5
    NzYxMDAxIiwKICJhdWQiOiAiczZCaGRSa3F0MyIsCiAibm9uY2UiOiAibi0wUzZ
    fV3pBMk1qIiwKICJleHAiOiAxMzExMjgxOTcwLAogImlhdCI6IDEzMTEyODA5Nz
    AKfQ.ggW8hZ1EuVLuxNuuIJKX_V8a_OMXzR0EHR9R6jgdqrOOF4daGU96Sr_P6q
    Jp6IcmD3HP99Obi1PRs-cwh3LO-p146waJ8IhehcwL7F09JdijmBqkvPeB2T9CJ
    NqeGpe-gccMg4vfKjkM8FcGvnzZUN4_KSP0aAp1tOJ1zZwgjxqGByKHiOtX7Tpd
    QyHE5lcMiKPXfEIQILVq0pc_E2DzL7emopWoaoZTF_m0_N0YzFC6g6EJbOEoRoS
    K5hoDalrcvRYLSrQAZZKflyuVCyixEoV9GfNQC3_osjzw2PAithfubEEBLuVVk4
    XUVrWOLrLl0nx7RkKU8NXNHq-rvKMzqg"
}
```

ID Token 是 JWT 的格式，解碼後，內容類似

```json
{
  "iss": "https://server.example.com",
  "sub": "24400320",
  "aud": "s6BhdRkqt3",
  "nonce": "n-0S6_WzA2Mj",
  "exp": 1311281970,
  "iat": 1311280970,
  "auth_time": 1311280969,
  "acr": "urn:mace:incommon:iap:silver"
}
```

其中 `iss` 是 ID Token 的簽核者，可以當成是 OpenID Provider 的名稱，而 `sub` 是簽核者用來標示使用者的唯一碼。`iss` 跟 `sub` 可以組合成一個不重複的 ID，用來辨識使用者。

然而僅僅靠 ID，在應用上仍然稍嫌不夠力，我們在自我介紹時，不會說我是 A123456789，而是會講我的名字是 Ken，居住在台北。這些個人資訊可以給 Relying Party 更充足的訊息，讓它辨識來自不同 OpenID Provider 的相同使用者。為了讓這些資訊的取得有標準可以依循，OpenID Connect 重用 OAuth 2 的 scope 並規範特定的 Endpoint。Relying Party 在向 OpenID Provider 提出授權申請時，可以在 scope 中放入

```bash
scope=openid profile email phone
```

只要該 OpenID Provider 有支援，Relying Party 就能用 Access Token 向 userinfo 端點發出請求

```bash
GET /userinfo HTTP/1.1
Host: server.example.com
Authorization: Bearer SlAV32hkKG
```

並得到使用者的完整資訊

```bash
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sub": "248289761001",
  "name": "Jane Doe",
  "given_name": "Jane",
  "family_name": "Doe",
  "preferred_username": "j.doe",
  "email": "janedoe@example.com",
  "picture": "http://example.com/janedoe/me.jpg"
}
```

## 使用 Google 帳號認證

讓我們實際看一下用 Google 來登入的例子，先給張時序圖，讓大家知道我們需要有哪些 Endpoint

<p align="center">
  <img src="/img/posts/2023/openid-connect/oidc-3.png"/>
</p>

Client 有三個 Endpoint，分別是 `/login`、`/callback` 跟 `/`。使用者進到 `/login` 後，會導向到 OpenID Provider 進行認證與授權，之後導回 `/callback`，接收 ID Token 並綁定 session 後再導到首頁。

跟 OAuth 有關的部分，在[另一篇文章](https://blog.kenwsc.com/posts/2022/oauth-2-0-go-and-google-example/)中有詳細解說，如果不熟的可以翻翻，這邊就不再多說明了。底下會把重點放在實現 OpenID Connect 需要的修改，首先來看端點跟配置

```go
func main() {
    sessions = make(map[string]interface{})
    cfg = NewGoogleOAuthConfig()
    e := gin.New()
    e.GET("callback", OAuth2Callback)
    e.GET("login", Login)
    e.GET("/", GetHomePage)
    e.Run("localhost:8080")
}

func NewGoogleOAuthConfig() *oauth2.Config {
    config := &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        RedirectURL:  "http://localhost:8080/callback",
        Scopes: []string{
            oidc.ScopeOpenID,
            "email",
        },
        Endpoint: google.Endpoint,
    }
    return config
}
```

OpenID Connect 的函式庫使用 [github.com/coreos/go-oidc/v3/oidc](https://pkg.go.dev/github.com/coreos/go-oidc/v3@v3.5.0/oidc)，能替我們降低一些開發成本。在跟 OpenID Provider 要權限前，記得 Scopes 要帶上 `oidc.ScopeOpenID`，我們還想知道 `email`，因此底下也加進去。

接著來到重頭戲 `/callback`，用收到的授權碼兌換 Access Token 跟 ID Token

```go
func OAuth2Callback(ctx *gin.Context) {
    // ...
    token, err := cfg.Exchange(context.Background(), code)
    if err != nil {
        ctx.AbortWithError(http.StatusInternalServerError, err)
        return
    }
    // ...
    provider, _ = oidc.NewProvider(context.TODO(), "https://accounts.google.com")
    verifier := provider.Verifier(&oidc.Config{ClientID: clientID})
    idToken, err = verifier.Verify(ctx, token.Extra("id_token").(string))
    if err != nil {
        ctx.AbortWithError(http.StatusInternalServerError, err)
        return
    }
    userInfo, err := getUserInfo(token)
    if err != nil {
        ctx.AbortWithError(http.StatusInternalServerError, err)
        return
    }
    sid := uuid.NewV4().String()
    sessions[sid] = userInfo
    ctx.SetCookie("sid", sid, 60*60, "", "", false, false)
    ctx.Redirect(http.StatusFound, "http://localhost:8080")
}
```

取得 ID Token 後，先驗證該 Token 沒問題，解碼後內容是

```json
{
  "iss": "https://accounts.google.com",
  "azp": "xxxxxx.apps.googleusercontent.com",
  "aud": "xxxxxx.apps.googleusercontent.com",
  "sub": "104498875333XXXXXXXXXX",
  "email": "kenxxxxx@gmail.com",
  "email_verified": true,
  "at_hash": "2RCplQvBCznJOwok6Yl8GA",
  "iat": 1674159649,
  "exp": 1674163249
}
```

以 ID Token 來說，Google 給的資訊已經夠多了，很多 optional 的欄位都有值，但其他的 Provider 未必會在 ID Token 給出詳細資訊，如果沒看到想要的資訊，可以再由 `/userinfo` 來拿

```go
func getUserInfo(token *oauth2.Token) (map[string]interface{}, error) {
    res, err := client.Get("https://openidconnect.googleapis.com/v1/userinfo")
    if err != nil {
        return nil, err
    }
    defer res.Body.Close()
    var resp map[string]interface{}
    data, _ := ioutil.ReadAll(res.Body)
    json.Unmarshal(data, &resp)
    return resp, nil
}
```

這份資料會先綁定 Session，等到使用者來拿時，再回傳回去

```go
func GetHomePage(ctx *gin.Context) {
    sid, _ := ctx.Cookie("sid")
    userInfo := sessions[sid]
    ctx.JSON(http.StatusOK, userInfo)
}
```

最後得到 Response 中的個人資訊

```json
{
    "email": "kenxxxxx@gmail.com",
    "email_verified": true,
    "picture": "https://lh3.googleusercontent.com/a-/xxxxxx",
    "sub": "104498875333XXXXXXXXXX"
}
```

可以看到要修改的點不多，幾乎都是單純加上 OpenID Connect 的邏輯而已，跟 OAuth 2 的相容性非常好。

## 小結

OpenID Connect 像是 OAuth 2 的擴充，儘管原本 OAuth 2 能做到類似認證的效果，但這是憑藉技術上的手段，而不是原本就在規範中。要知道，OAuth 2 的 Protected Resourece 沒有供應身份端點的義務，如果只是單純的 OAuth 2，客戶端沒辦法保證能做到認證的事。當然實際上，因為常串的 OAuth 2 資源都是 Meta / Microsoft / Amazon / Google 這類大廠，真的要找還是找得到，但這就跟「開放認證協定」不是同一回事了。

OpenID Connect 從規範上補足這件事，如果哪家廠商支援 OpenID Connect，我們可以合理預期，它會有能辨識身份的 ID Token 跟詳細資訊的 userinfo 端點，而身份資訊範圍也能從 OpenID Connect 的 scope 中看到，像是 Google 的 [Discovery document](https://accounts.google.com/.well-known/openid-configuration) 就很明確，能讓開發者在初期就確定能否拿到想要的資訊

```json
{
  // ...
  "scopes_supported": [
    "openid",
    "email",
    "profile"
  ],
  // ...
  "claims_supported": [
    "aud",
    "email",
    "email_verified",
    "exp",
    "family_name",
    "given_name",
    "iat",
    "iss",
    "locale",
    "name",
    "picture",
    "sub"
  ],
  // ...
}
```

希望看完這篇文後，能幫忙釐清 OAuth 2 跟 OpenID Connect 的關係，知道角色間如何對應，也能讓開發者們在開發第三方登入的應用時，更快進入狀況。

## Reference

- [Welcome to OpenID Connect](https://openid.net/connect/)
- [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#page-10)
- [驗證與授權](https://www.ithome.com.tw/voice/134389)
- [每當點選社群帳號登入，背後發生了什麼事？](https://petertc.medium.com/openid-connect-a27e0a3cc2ae)
- [深入淺出 OpenID Connect (一)](https://kimlin20011.medium.com/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA-openid-connect-%E4%B8%80-8701bbf00958)
- [OpenID Connect | Authentication | Google Developers](https://developers.google.com/identity/openid-connect/openid-connect)
- [如何驗證 ID Token 的資訊](https://ithelp.ithome.com.tw/articles/10300937?sc=iThelpR)