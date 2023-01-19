---
title: OAuth 2.0：授權許可
description: 在這篇中，我們要進一步來討論，具體的授權許可是什麼？我們將改由時序的角度出發，探討模型中的物件如何交換訊息。如果覺得這段話太抽象，可以理解成，上一篇介紹了遊戲中的角色與道具，而在這篇，我們將來介紹遊戲的流程與規則。…
date: 2022-11-09
scheduled: 2022-11-09
tags:
  - Web
  - Authorization
  - Security
layout: zh-tw/layouts/post.njk
---

在[前一篇](/posts/2022/oauth-2-0-roles-and-channels)中，我們討論了 OAuth 2.0 的角色與信道，知道 OAuth 2.0 將授權模型劃分為四個角色，讓它們經由前／後端信道交流，完成整個授權許可流程。在這篇中，我們要進一步來討論，具體的授權許可是什麼？我們將改由時序的角度出發，探討模型中的物件如何交換訊息。如果覺得這段話太抽象，可以理解成，上一篇介紹了遊戲中的角色與道具，而在這篇，我們將來介紹遊戲的流程與規則。

底下的介紹會著重在授權碼許可(Authorization Code Grant)跟隱式許可(Implicit Grant)兩種 Web 應用場景的授權許可。至於資源擁有者憑證許可(Resource Owner Password Credentials)跟客戶端憑證許可(Client Credentials)，雖然在 RFC 6749 有提到，但因資安風險較高，需要資源擁有者非常信賴客戶端且沒有其他方式情況下，才會拿來使用。

## Authorization Code Grant

顧名思義，授權碼許可是使用臨時的授權碼(code)來進行許可。授權碼有點像是促銷活動用的代碼，可以用來兌換真正的折扣。在流程中，授權伺服器會經由前端信道將授權碼交給客戶端，客戶端拿到代碼後，用它走後端信道，跟授權伺服器兌換 Token。為了怕有資安問題，授權碼的生命週期往往很短，如果沒有兌換，要很快讓它失效。

透過引入授權碼， OAuth 2.0 將風險分為兩塊，授權碼經由前端信道傳遞，被竊取的風險較高；Token 則經由後端信道傳遞，風險相對低。因此，即使在前端信道的授權碼被竊取了，攻擊者也無法立刻用來兌換 Token，進而避免造成資安問題。

授權碼許可的流程會長這樣

<p align="center">
  <img src="/img/posts/2022/oauth-2-0-authorization-grant/oauth-1.png" />
</p>

在啟動授權的階段(A)，客戶端發現需要授權時，它會回覆 302，將需求轉發到授權伺服器，HTTP 響應內容是

```bash
HTTP/1.1 302 Moved Temporarily
x-powered-by: Express
Location: http://localhost:9001/authorize?response_type=code&client
_id=oauth-client-1&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fcallback
Vary: Accept
```

瀏覽器收到後，依照 Location，發送 GET 給授權伺服器

```bash
GET /authorize?response_type=code&client_id=oauth-client
-1&redirect_uri=http%3A%2F%2Flocalhost%3A9000%
2Fcallback&state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
HTTP/1.1
Host: localhost:9001
```

可以看到這則訊息的 Query Param 有三個參數，分別是

* response_type：該訊息回覆的類型，因為我們要授權碼，這邊要放 “code”
* client_id：客戶端的 ID，用來讓授權伺服器知道請求授權的客戶端
* redirect_uri：重定向地址，授權完成後，授權伺服器會請瀏覽器再轉回這個地址中。

授權伺服器解析請求後，會要求資源擁有者認證與授權(B)。接著，授權服器一樣回覆 302(C)，讓瀏覽器跳轉到客戶端

```bash
HTTP/1.1 302 Found
Location: https://client.example.com/cb?code=SplxlOBeZQQYbYS6WxSbIA
```

其中參數 code 是授權碼。

客戶端再拿授權碼，用 POST 來兌換 Token (D)

```bash
POST /token
Host: localhost:9001
Content-type: application/x-www-form-encoded
Authorization: Basic b2F1dGgtY2xpZW50LTE6b2F1dGgtY2xpZW50LXNlY3JldC0x

grant_type=authorization_code&
redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fcallback&code=8V1pr0rJ
```

裡面有三個參數

* grant_type：許可類型，我們是授權碼許可，填 “authorization_code”
* redirect_uri：(A) 提供的客戶端重定向位置，比對用
* code：授權碼

這裡是關鍵，授權伺服器需要知道申請 Token 的客戶端是受信任的客戶端，還是有人攔截授權碼後，假扮成客戶端來要 Token。授權伺服器跟客戶端因此會有個約定，在開始整個流程之前，客戶端就要到授權伺服器註冊，取得 Client ID 跟認證憑證。申請授權碼時，客戶端會將 Client ID 放入參數內，這讓授權伺服器可以把 Client ID 跟授權碼綁定，接著在兌換 Token 的步驟，客戶端會將自己的認證憑證放在 Authorization Header 中傳給授權伺服器，讓授權伺服器確認客戶端可信任，而且是兌換通過申請的授權碼。

授權碼只能使用一次，如果被重複使用，授權伺服器要有警覺，授權碼很可能有人盜用了，它應該拒絕核發，並且立刻撤銷之前發送的所有 Token。假設攻擊者搶先兌換到 Token，他的 Token 會因此失效；如果攻擊者是後面才去兌換，他也無法拿到有效 Token。

如果一切正常，授權伺服器確認沒問題後，會將 Token 返回給客戶端(E)，格式沒特別限定，但通常會用 RFC 6750 描述的 Bearer Token

```bash
HTTP 200 OK
Date: Fri, 31 Jul 2015 21:19:03 GMT
Content-type: application/json

{
    "access_token": "987tghjkiu6trfghjuytrghj",
    "token_type": "Bearer"
}
```

## 權限範圍

只講原理有些枯燥。我們來聊點應用情境。在社群媒體註冊的情境中，資源擁有者用現成的社群媒體來簡化註冊的手續，然而他不想透漏更多的個人資訊，例如好友名單，給第三方應用。這就要求授權機制能限定權限範圍(scope)。

在權限範圍相關的操作中，客戶端要向資源擁有者請求指定的權限範圍；授權伺服器要依照資源擁有者的核准，發佈對應範圍的 Token；受保護資源要確認請求是不是在權限範圍內。因此這三個角色都需要知道範圍的定義。

先來看客戶端，修改後，它的請求會是

```bash
HTTP/1.1 302 Moved Temporarily
x-powered-by: Express
Location: http://localhost:9001/authorize?response_type=code&scope=read&client
_id=oauth-client-1&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fcallback
Vary: Accept
```

跟前面比起來，多加入 scope，值是 read，這是個自訂值，代表客戶端需要讀取權限。

然後來看授權伺服器，這邊分為三塊，客戶端在註冊時，應該要把能申請的權限範圍一起註冊進去；在收到客戶端授權申請時，它會將客戶端想要的權限列出來給資源擁有者看，讓資源擁有者確認是否授權；最後，當客戶端要把授權碼兌換成 Token 時，它需要將權限範圍與 Token 綁定。綁定的做法很多，OAuth 2.0 沒有明確規範，最簡單的就是在資料庫建立一個 token 跟 scope 的關係；或者，直接用 JWT 將權限範圍放入 Token 也是個辦法。

如果給出的權限範圍跟客戶端要的不同，授權伺服器在回覆 Token 的同時，也要給出該 Token 實際的權限

```bash
HTTP 200 OK
Date: Fri, 31 Jul 2015 21:19:03 GMT
Content-type: application/json

{
    "access_token": "987tghjkiu6trfghjuytrghj",
    "scope": "read",
    "token_type": "Bearer"
}
```

而受保護資源在收到 Token 時，會確認該 Token 能否存取資源。如果不行，在 HTTP 的慣例中，應該要回覆 401 的狀態碼。

可以發現 OAuth 2.0 的擴充性不錯，只需要多加一個參數，就能完成權限範圍的需求，而且還可以向下相容，充分體現開閉原則(OCP)的特性。但是它也在客戶端、授權伺服器與受保護資源間創造隱性依賴，它們需要同時實現同樣的授權範圍規格，才能正常運作。實務上，授權伺服器與受保護資源間的依賴可能還好，因為通常會由相同的供應商(Provider)開發。然而客戶端在設計前，就得先自行了解一下需要的權限範圍。

## 跨站請求偽造

在前一篇討論前 / 後端信道時，曾經說道前端信道有資安風險，而 CSRF（跨站請求偽造）是其中一種常見的攻擊手法。從字面上來理解，CSRF 指讓瀏覽器向網站發起偽造的請求，從而達到攻擊目的。我們說過瀏覽器是資源擁有者用來跟網路互動的介面，稱為用戶代理，照理講，用戶代理會忠實依照資源擁有者的意向來操作，然而，它畢竟也是種工具，有自己的運行規則。攻擊者可以利用規則中的模糊地帶，讓瀏覽器發出資源擁有者沒意識到的請求。

<p align="center">
  <img src="/img/posts/2022/oauth-2-0-authorization-grant/oauth-2.png" />
</p>

用時序圖來看會比較容易理解。攻擊者先執行 (C.1) 的流程，直接跟授權伺服器互動，拿到授權碼。接著，他誘導資源擁有者使用授權碼跟客戶端互動(C.2)，將授權碼換成 Token，這件事做起來很簡單，只要讓資源擁有者瀏覽惡意頁面，並在頁面中放入

```html
<img src="https://ouauthclient.com/callback?code=ATTACKER_AUTHORIZATION_CODE">
```

瀏覽器會以為這是圖片，自動發出 GET 請求給客戶端，資源擁有者不會知道偽造請求已經默默送出。

我們可能會納悶，即使如此，兌換到的 Token 也是攻擊者的 Token，只能存取攻擊者的受保護資源，應該沒有資源洩漏的問題？是的沒錯，資源擁有者是存取攻擊者的資源，然而他沒有意識到這件事，資源擁有者以為現在存取的是自己的資源，此時任何操作，都會將資訊放入攻擊者的受保護資源中，像是銀行帳戶或密碼。資安風險不是只有在別人存取你的資源時會發生，你存取別人的資源時一樣有資安風險。

要怎麼處理這問題？既然它是 CSRF 的風險，我們就使用 CSRF 的對策來緩解。要點很簡單，我們要讓客戶端知道 (C.2) 的請求不是偽造，能對應到 (A) 的重定向，因此需要在 (A) 跟 (C.2) 中間建立關聯。從上面的流程可以看到，由於 (C.2) 是偽造的，沒有對應的 (A)，只要客戶端比對後查無資料，它就能立即中斷 OAuth 2.0 後續的步驟。

具體來說，修改客戶端 (A) 的重定向

```bash
HTTP/1.1 302 Moved Temporarily
x-powered-by: Express
Location: http://localhost:9001/authorize?response_type=code&scope=read&client
_id=oauth-client-1&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fcallback&
state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
Vary: Accept
```

加入新的參數 state，這個 state 就是 (A) 跟 (C.2) 的關聯，在術語上稱呼為 CSRF Token。

授權伺服器會將授權碼傳給客戶端 (C)，這裡把原本的 state 原封不動附上

```bash
HTTP 302 Found
Location: http://localhost:9000/oauth_callback?code=8V1pr0rJ&state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
```

客戶端收到 (C.2) 的請求後，驗證 state 跟 (A) 是否相同。對攻擊者來說，他偽造的請求將會被客戶端擋下，因為「客戶端的每個請求都能辨識，只要攻擊者不知道辨識方式，他就無法偽造」。

## 錯誤處理

上面的情況都是假設授權流程正常執行。但有可能，在流程中會發生一些與預期不同的狀況，例如第三方應用要取得的資訊是資源擁有者不願意授權的。當面對這些例外狀況，OAuth 2.0 會怎麼處理呢？

這裡的錯誤分為兩種，首先，要是客戶端沒到授權伺服器註冊過，授權伺服器會認為該客戶端是個不可信任來源，既然客戶端是個不可信任來源，就沒必要透過前端信道，轉址回客戶端，取而代之，應該要告訴資源擁有者，他正在使用一個不可信任的客戶端，有資安風險存在。這時 error 的回覆對象會是資源擁有者。

同樣來上個流程圖

<p align="center">
  <img src="/img/posts/2022/oauth-2-0-authorization-grant/oauth-3.png" />
</p>

而如果錯誤是因為資源擁有者拒絕授權，或者因為授權伺服器內部的問題造成。授權伺服器需要告知客戶端原因，讓客戶端能處理錯誤。雖然中間經過資源擁有者，但我們知道，前端信道本質上是客戶端與授權伺服器間的通信，因此這裡的 error 回覆對象會是客戶端。

<p align="center">
  <img src="/img/posts/2022/oauth-2-0-authorization-grant/oauth-4.png" />
</p>

要告知客戶端錯誤訊息，要用類似授權碼的傳遞方式。將訊息放在 Query Param

```bash
HTTP/1.1 302 Found
Location: https://client.example.com/callback?error=access_denied&error_description=resource_owner_reject&state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
```

有兩個新參數

* error：OAuth 2.0 定義的錯誤代碼，像是 “invalid_request”、“access_denied”、“server_error”，詳細可以參照 RFC 6749 Sec 4.1.2.1。
* error_description：錯誤的詳細資訊，用來給客戶端的開發者除錯。

我們可以看到前端信道跟後端信道的通訊模型有些不同，本質上兩者都是要傳遞訊息，但因為前端信道還需要轉址，占用了 status code 的空間，把 server error 這類原本 5xx 的訊息改成放在 Query 中。

## Implicit Grant

我們已經討論過很多授權碼許可類型的情境，這些情境是建立在角色分離的前提下，但在實務中，有可能同一個實體會身兼多個角色，例如有些應用是用 JavaScript 跑在瀏覽器中，這時瀏覽器既是資源擁有者的用戶代理，也是要求資源的客戶端。角色混合會讓授權碼失去意義，因為即使拿到授權碼，最後還是得由瀏覽器兌換成 Token，安全邊界沒有發揮作用。

隱式許可類型(Implicit Grant)可以當成是授權碼許可類型的簡化版本。既然授權碼無法發揮作用，乾脆省略這個步驟，降低設計成本。在隱式許可中，客戶端直接跟授權伺服器取得 Token，兩者間的通訊只使用前端信道。它的流程圖是

<p align="center">
  <img src="/img/posts/2022/oauth-2-0-authorization-grant/oauth-5.png" />
</p>

請求的內容要稍微修改，response_type 是響應的類型，這裡不再使用 code，改為 token，要求直接回覆 Token，修改後變成

```bash
HTTP/1.1 302 Moved Temporarily
Location: http://localhost:9001/authorize?response_type=token&scope=read&client_id=oauth-client-1&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fcallback&state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
Vary: Accept
```

授權伺服器的回覆也跟著變成

```bash
GET /callback#access_token=987tghjkiu6trfghjuytrghj&token_type=Bearer&state=Lwt50DDQKUB8U7jtfLQCVGDL9cnmwHH1
HTTP/1.1
Host: localhost:9000
```

Token 放在 URL 的錨點(Fragment)回傳，確保該訊息只會在瀏覽器內，不會發送到伺服器。

使用隱式許可，要付出什麼代價呢？很顯然，由於用戶代理跟客戶端成為一體，我們不可能要求客戶端申請 Token 前先到授權伺服器註冊，授權伺服器因此無法判斷客戶端是否能信任。再來，Token 明確地曝露在資源擁有者眼前，攻擊者可以藉由查看資源擁有者的瀏覽器來取得 Token，如果客戶端設計有問題，或是瀏覽器上有其他惡意程式在執行，Token 就有機會被竊取。從安全性的層面來說，隱式許可有它的風險，通常只會用在很限定的情境。

## 小結

這篇以授權碼許可為主，走了一遍授權許可流程。因為要考量資安問題，流程上顯得有些複雜，通常開發者想知道的是，他開發出來的第三方應用，應該如何接入 OAuth 2.0 的流程中？用術語來講，開發客戶端需要有哪些背景知識？

如果不是因為特別原因，建議一律使用授權碼許可類型，它具有最全面的資安設計，能避免 Token 被盜用。另外，開發者應該要讀授權伺服器與受保護資源提供的技術文件，知道如何註冊客戶端並選擇認證憑證，還有受保護資源的 API 需要哪些範圍的存取權限。最後，如果有資安相關的對策，最好盡可能實作，像是加入 state 之類的欄位，畢竟授權是個相對敏感的題目，多點保護總是好的。

希望讀完這篇文後，能幫助讀者釐清 OAuth 2.0 的流程，讓開發者在實際開發前，能知道每個步驟與欄位的用途是什麼。

## Reference

- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [GitHub - oauthinaction/oauth-in-action-code: Source code for OAuth 2 in Action](https://github.com/oauthinaction/oauth-in-action-code/)
- [從簡單到繁複的OAuth2](https://www.ithome.com.tw/voice/129385)
- [讓我們來談談 CSRF](https://blog.huli.tw/2017/03/12/csrf-introduction/)
