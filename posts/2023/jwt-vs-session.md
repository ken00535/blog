---
title: 更好的選擇？用 JWT 取代 Session 的風險
description: 因為 HTTP 是無狀態協定，為了保持使用者狀態，需要後端實作 Session 管理機制。在早期方式中，使用者狀態會跟 HTTP 的 Cookie 綁定，等到有需要的時候，例如驗證身份，就能使用 Cookie 內的資訊搭配後端 Session 來進行。但自從 JWT 出現後，使用者資訊可以編碼在 JWT 內，也開始有人用它來管理使用者身份。前些日子跟公司的資安團隊討論，發現 JWT 用來管理身份認證會有些風險。在這篇文章中，我會比較原本的 Session 管理跟 JWT 的差異，並說明可能的風險所在。...
date: 2023-01-13
scheduled: 2023-01-13
tags:
  - Security
  - Authentication
layout: zh-tw/layouts/post.njk
draft: false
---

因為 HTTP 是無狀態協定，為了保持使用者狀態，需要後端實作 Session 管理機制。在早期方式中，使用者狀態會跟 HTTP 的 Cookie 綁定，等到有需要的時候，例如驗證身份，就能使用 Cookie 內的資訊搭配後端 Session 來進行。但自從 JWT 出現後，使用者資訊可以編碼在 JWT 內，也開始有人用它來管理使用者身份。前些日子跟公司的資安團隊討論，發現 JWT 用來管理身份認證會有些風險。在這篇文章中，我會比較原本的 Session 管理跟 JWT 的差異，並說明可能的風險所在。

## Session 管理

Session 是什麼意思？為什麼需要管理？我們可以從 HTTP 無狀態的特性聊起。所謂的無狀態，翻譯成白話，就是後面請求不會受前面請求的影響。想像現在有個朋友跟你借錢，借他後他卻沒有還，當他下次再跟你借時，你就會不願意答應，這是因為「這個人不會還錢」的狀態已經建立在你的記憶中了。

持有「狀態」有時很有用，你看到一筆請求，不用它多說，就知道它之前做過哪些事；但另一方面，也造成每次請求的結果都受前面影響，變成無法預期。想想一個「有狀態」的人，他對美食很有研究，但當他知道你不能吃牛肉，他可能會避免在你面前談日本和牛有多好吃。無法預期對軟體工程而言是個很高的成本，會影響到軟體的可擴展性，因此 HTTP 無狀態的特性就特別適合網路應用開發。

然而在實務上，偶爾還是需要知道請求背後的狀態，這就不能仰賴 HTTP 幫忙處理，而是要另外建立一套 Session 管理機制。Session 是「具有狀態的一段期間」，當 Session 啟動時，代表要開始記錄狀態，而當 Session 結束時，代表狀態都會被刪除。從後端開發的角度，可以很直覺聯想到，只要把使用者的請求資訊快取起來，不就完成對 Session 的管理了嗎？是的，所以以登入的情境來看，會是

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/session-1.png" />
</p>

使用者輸入帳號密碼，後端驗證後，建立一個 Session 將使用者帳號放進去，並將這個 Session 的 ID 設定在 Cookie 中交給 Client，以後如果請求有帶 Session ID，後端只要依照 Session ID 調出資料，就能知道使用者是誰了。

## Session 帶來的問題

既然 Session 管理這麼簡單，為什麼還要嘗試其他方案？問題還是出在開發成本。我們剛剛說建個 Session 來儲存資訊，但這 Session 要放在哪呢？如果是放在 in-memory object 內，像是 Go 的 map，那當你的系統有 Load Balancer 時就會出現問題

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/load-balancer.png" />
</p>

Load Balancer 會將收到的請求平均發給後端系統，此時，原本請求的 Session 如果是放在 Server A，當 Load Balancer 將下個請求發給 Server B 時，Server B 會因為沒有 Session 的資訊而產生錯誤的結果。

你可能會想說，那再加個快取服務來放 Session，像是 Redis，讓各 Server 去 Redis 讀資料，不就解決問題了？

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/load-balancer-2.png" />
</p>

原則上沒錯，很多現有方案都是用這個解法。但多加系統就是多增加可用性風險，要是 Redis 當機的話呢？為了防止單點失效，要不要把 Redis 做成 Master-Slave Replication？或者，Redis 所在伺服器的 I/O 流量能支援嗎？會不會影響反應時間跟使用者體驗？是否要套用 Cluster 來加速反應？

問題開始變得有些複雜了。

另外，在傳統的 Session 方案中，Session ID 會放在 Cookie，而 Cookie 會在瀏覽器發起請求時自動帶上，這個「自動」就有了 CSRF 的風險。想想你無意中點開惡意網站，你的瀏覽器依照惡意網站的內容發出轉帳請求給銀行，而因為你之前登入過銀行，還保持著 Session，瀏覽器也在請求中「自動」帶上了 Session ID。銀行伺服器收到請求後，認為你已經登入過，就乖乖依照請求轉帳，這樣豈不是很危險？

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/csrf-attack.png" />
</p>

要緩解 CSRF 攻擊，需要實作 CSRF Token 的機制，這當然也是另一項開發成本。

## JWT 如何處理問題？

於是有人開始研究，有沒有機會用 JWT 來實現真正的無狀態，或者至少，在使用者身份上的無狀態。

JWT 本質上是個 Token，只是它具備自描述的特性，能夠乘載資訊，我們可以把它想像成是員工證，你要進入門禁系統，會需要在入口刷員工證，員工證上有姓名跟照片，所以只要看到卡片，就知道這張卡是由誰持有。

在應用中，JWT 會是個編碼過的字串，像是

```bash
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

其中 Payload 解碼後，會是個 JSON 格式的內容，像是

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}
```

JWT 都有經過簽名，可以防止偽造問題。同樣是登入情境，流程變成

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/session-2.png" />
</p>

後端驗證使用者後，簽發一個 JWT，將使用者資訊放在裡面回覆給 Client，Client 後續的請求都會在 Authorization Header 中放入 JWT，後端只需要解碼 JWT，就能得知使用者是誰。

這樣能解掉原本 Session 的問題嗎？客觀來看，因為後端收到的不再只是一個 Session ID，而是帶有使用者資訊的 Token，後端不再需要跟快取請求資訊，從而也就避免了快取系統設計的開發成本；而 JWT 因為是放在特定的 Header 中，瀏覽器也不會自動帶上它，自然也避免 CSRF 的可能性。

## 問題真的解決了嗎？

只是事情沒這麼簡單，JWT 無狀態的特性也帶來資安問題。舉例來說，使用者可能拿到 JWT 後又修改密碼，這時因為 Authentication 有變動，要讓改密碼前的 JWT 無效。在 JWT 的體系中，可以怎麼做呢？

通常 JWT 的內容中有個 `exp` 的欄位，用來標示 JWT 的過期時間，後端解碼 JWT 後，如果發現過期，就會告訴 Client 該 Token 無效。但這需要等待一定的時間，沒辦法立即失效，想像一下你已經知道你的密碼被盜用了，但後端仍允許攻擊者使用之前的 Token，這顯然是個資安漏洞。

除了用 `exp` 外，還有別的方式可以撤銷 Token 嗎？有，當改動密碼時，同時將持有的 JWT 放到快取中，當下次請求進來，先跟快取確認，要是能在快取中查找到 JWT，代表該 JWT 已經失效了

<p align="center">
  <img src="/img/posts/2023/jwt-vs-session/session-3.png" />
</p>

但如此一來，會在 JWT 的方案中引入快取。使用 JWT 的目的就是為了避免快取相關的開發成本，如果使用 JWT 還要用上快取，等於繞了一圈又回到原點，沒有達到原本的效益。

另外，使用 Authorization Header 的確能避免 CSRF，但如果 Client 不是把 JWT 放在 Cookie，會放在哪呢？通常是放在 Local Storage，而只要是 JavaScript，就有機會從 Local Storage 取得資料。例如，攻擊者可以用 XSS 將惡意的 JavaScript 程式碼載入到你的瀏覽器中，惡意程式會上傳 Local Storage 的資訊到攻擊者的指定網站，那麼，攻擊者就可以拿著上傳的 JWT，光明正大存取受保護資源。

相反的，如果放在 Cookie，後端可以在 Set-Cookie 最後設置 HttpOnly，禁止 JavaScript 存取 Cookie，因為瀏覽器會自動帶上 Cookie，JavaScript 也沒有存取的必要，只要確實做好 CSRF Token，就能避免攻擊者發出偽造的請求。

## 小結

前面講了這麼多，到底是要用 JWT 還是不用要呢？從我的觀點，如果要替這篇文章下個結論的話，就是：不要用 JWT 來取代 Session。

Token 的應用場景通常是授權，而且都會有明確的過期時間，像是在 GitHub 上申請 Personal access tokens，讓應用程式不需要帳號密碼，也可以存取 API。但 Session 的目的是保持狀態，且不說 Session 中可能儲存很多除了使用者身份外的資訊，即使只看使用者認證，JWT 也沒辦法保證「使用者在場」（因為它的設計上就是希望使用者不在場也可以運作）。實作 Session 會需要一些成本沒錯，但現在都已經有成熟的解決方案，有些甚至是函式庫直接內建好，開箱即用，權衡兩個方案後，Session 應該會是比較妥當的選擇。

這麼說也不是要大家不要使用 JWT，只要 Follow 幾個原則，JWT 還是後端開發利器：

- 讓 JWT 的生命週期盡量短，如果是長期的，也要設定一個明確的失效時間
- 授權範圍盡可能小，只授權需要的 API
- JWT 需要有撤銷機制，即使洩漏了也能緊急處理

以我自己來講，如果要開發 M2M(Machine-to-machine) 系統，JWT 應該能有不少應用。

最後提醒一下，資安是我相對陌生的領域，如果看完這篇覺得跟你的認知不同，歡迎留言討論，你想的也許是正確的。

## Reference

- [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 6265](https://www.rfc-editor.org/rfc/rfc6265)
- [Stop using JWT for sessions](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/)
- [以 JSON Web Token 替代傳統 Token](https://yami.io/jwt/)
- [以 JSON Web Token 取代 session](https://medium.com/@leon740727/%E4%BB%A5-json-web-token-%E5%8F%96%E4%BB%A3-session-bae47556dde2)
- [理解 JWT 的使用场景和优劣](https://www.cnkirito.moe/jwt-learn-3/)
- [淺談 Session 與 Cookie：一起來讀 RFC](https://blog.huli.tw/2019/08/09/session-and-cookie-part2/)
