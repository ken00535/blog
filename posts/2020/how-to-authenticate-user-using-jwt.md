---
title: 如何驗證使用者身分：使用 JWT
description: 驗證與授權是開發網路應用時一定會遇到的問題。在傳統技術中，使用者會在登入時輸入帳號密碼，Server 驗證無誤後，創建一組 Session ID，Client 後續請求都會帶上 Session ID，方便 Server 檢驗。而 JWT 是自描述的驗證，對比舊方法來說，能降低 Server 的負擔。本文會講解 JWT 的原理並用 Node.js 搭配前端頁面，寫個簡單的網頁應用…
date: 2020-10-31
scheduled: 2020-10-31
tags:
  - Node.js
  - JavaScript
layout: zh-tw/layouts/post.njk
---

驗證與授權是開發網路應用時一定會遇到的問題，前者指的是確認使用者身分，讓 Server 明白請求者是真正的使用者，而不是其他人假冒；後者指的是該使用者有權限進行操作。JWT 處理的主要是前一個問題。

先來看看 JWT 出來前的做法。在傳統技術中，使用者會在登入時輸入帳號密碼，Server 由資料庫驗證無誤後，創建一組 Session ID，放入回應的 Cookie ，Client 後續請求都會在 Cookie 帶上 Session ID，方便 Server 檢驗。

由於只看 Session ID 無法說明使用者身分正確，還需要看該 Session ID 是否有儲存在 Server，而 Server 的數據通常儲存在資料庫，一來一往之間，就會造成 Server 端額外的開銷。JWT 只需要在 Server 儲存一組 Secret，即可對應不同的使用者，對比舊方法來說，能降低 Server 的負擔，已經成為當前主流的網路驗證方案。

本文會講解 JWT 的原理並用 Node.js 搭配前端頁面，寫個簡單的網頁應用，需要 Clone 程式碼的，可以到[這裡](https://github.com/ken00535/nodejs-medium-example)。

## Introduction

JWT 全名是 JSON Web Token，由字面來看，它是使用 JSON 格式的一組網路應用 Token。Token 可以解釋成代幣，當 Server 確認使用者身分後，會發行一枚代幣給使用者，只要持有這枚代幣的人，Server 都會將它當成正規的使用者看待。

JWT 有兩組不同的實作，分別是 JWS 和 JWE，通常用到的會是 JWS。S 指的是 Signatures，代表這枚 JWT 中有簽章資訊，可用於保證訊息的正確性。它像是鈔票上的浮水印，只要看到浮水印，就知道這張鈔票不是偽鈔。

JWT 可以由三個部份組成，分別是

1. header
2. payload
3. signature/encryption data

Header 承載自我聲明的訊息，例如使用的演算法，用 JSON 來表示的話，會像是

```json
{"alg":"HS256","typ":"JWT"}
```

Payload 則是內容，同樣用 JSON 表示

```json
{"user":"user","iat":1604146546,"exp":1604232946}
```

這兩組會用 Base64 編碼成

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 eyJ1c2VyIjoidXNlciIsImlhdCI6MTYwNDE0NjU0NiwiZXhwIjoxNjA0MjMyOTQ2fQ
```

而 Signature 則會用加密演算法，對前面兩組訊息簽章，得到

```
gGyZTuVLTsibYW2QgUsXIU-66Z7NrqWlRMAyj_qx63s
```

將三組資訊放在一起，用 . 隔開，就成為 JWT 最後的樣子

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidXNlciIsImlhdCI6MTYwNDE0NjU0NiwiZXhwIjoxNjA0MjMyOTQ2fQ.gGyZTuVLTsibYW2QgUsXIU-66Z7NrqWlRMAyj_qx63s
```

由於 Payload 中有紀錄 user 的身分，而該身分又是經由 Server 簽名過的，因此只要看到這枚 JWT，Server 就能知道該請求由真實的使用者發送。

## Implement Server Side

明白原理後，來看看如何實現。既然 JWT 牽涉到 Server 跟 Client 間的訊息交換，就需要分別實現兩邊的程式。

先來看 Server 端，專案架構是

```
.
├── README.md
├── index.js
├── package-lock.json
├── package.json
├── public
│   └── css
│       └── main.css
└── views
    └── index.ejs
```

index.js 負責後端邏輯，public 內放置靜態資源，用於前端。

為開發方便，安裝 node.js 的熱更新套件 nodemon，它可以讓後端程式碼更新時，立即刷新服務

```bash
npm install nodemon -g
```

接著安裝 JavaScript 的 JWT 套件跟 express

```bash
npm install jsonwebtoken --save
npm install express --save
```

使用 express 來處理後端程式

```js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken')

const SECRET = 'secret'

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', function (req, res) {
    const auth = req.header('Authorization')
    if (typeof auth === "undefined") {
        res.render('index', { username: "" });
        return
    }
    token = auth.replace('Bearer ', '')
    try {
        const decoded = jwt.verify(token, SECRET)
        if (decoded.user == "user") {
            res.render('index', {
                username: decoded.user
            });
        }
    } catch {
        res.status(401).render('index', {});
    }
})

app.post('/login', function (req, res) {
    if (req.body.username === "user" && req.body.password === "pass") {
        const token = jwt.sign({ user: req.body.username }, SECRET, { expiresIn: '1 day' })
        res.json({
            token
        });
    } else {
        res.redirect('/');
    }
})

app.get('/content', function (req, res) {
    const auth = req.header('Authorization')
    if (typeof auth === "undefined") {
        res.status(401).send({ error: 'Please authenticate.' })
        console.log(48)
        return
    }
    token = auth.replace('Bearer ', '')
    try {
        const decoded = jwt.verify(token, SECRET)
        if (decoded.user == "user") {
            res.status(200).send({ data: 'Welcome!' })
        }
    } catch {
        res.status(401).send({ error: 'Please authenticate.' })
    }
})

app.listen(8080);
```

這個路由中註冊了兩組 URL，一組用於處理登入，一組用於處理內容獲取。它對應到一個情境：使用者想要登入頁面，他會輸入帳號密碼，這組帳密經 Server 確認無誤後，會簽發 JWT 給 Client，Client 將會拿 JWT 來請求網站內容。

前面先插入 express 的 Middleware，用於處理靜態資源跟 Parse 訊息

```js
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
```

後面註冊路由，負責登入的路由是

```js
app.post('/login', function (req, res) {
    if (req.body.username === "user" && req.body.password === "pass") {
        const token = jwt.sign({ user: req.body.username }, SECRET, { expiresIn: '1 day' })
        res.json({
            token
        });
    } else {
        res.redirect('/');
    }
})
```

假定 user/pass 是正確的帳密，當確認請求正確，使用 jwt.sign 跟 SECRET 來簽名，SECRET 可以是全域的任意值，這裡是 secret 。 expiresIn 用於註明該 JWT 的有效期限是 1 天。

簽名後回覆 token；否則回覆 Fail，告知登入失敗。

註冊獲取內容的路由

```js
app.get('/content', function (req, res) {
    const auth = req.header('Authorization')
    if (typeof auth === "undefined") {
        res.status(401).send({ error: 'Please authenticate.' })
        return
    }
    token = auth.replace('Bearer ', '')
    try {
        const decoded = jwt.verify(token, SECRET)
        if (decoded.user == "user") {
            res.status(200).send({ data: 'Welcome!' })
        }
    } catch {
        res.status(401).send({ error: 'Please authenticate.' })
    }
})
```

由 HTTP 的 Header 中提取 Authorization 的訊息，JWT 會放在該處。拿到後，用 jwt.verify 進行驗證，如果解碼出來的 user 是 user ，返回內容給 Client，否則回覆認證失敗。

最後監聽 8080 Port，提供服務

```js
app.listen(8080);
```

## Implement Client Side

前端的部分分為 HTML、JavaScript 跟 CSS 三塊，HTML 可以用模板引擎渲染後，傳送給瀏覽器。

先來建立 HTML 的模板 views/index.ejs

```html
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" type="text/css" href="./css/main.css">
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
        integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
    <script>
        async function login(username, password) {
            try {
                let res = await axios.post('http://127.0.0.1:8080/login', {
                    username: username,
                    password: password,
                })
                res = await axios.get('http://127.0.0.1:8080/content', {
                    headers: {
                        'Authorization': `Bearer ${res.data.token}`
                    },
                })
                let element = document.querySelector('body');
                element.innerHTML = `<h1 class="welcome">${res.data.data}</h1>`
            } catch (e) {
                console.log(e)
            }
        }
    </script>
</head>

<body class="text-center">
    <form method="post" action="/login" class="form-signin">
        <h1 class="h3 mb-3 font-weight-normal">Please sign in</h1>
        <label for="username" class="sr-only">Username</label>
        <input name="username" type="username" class="form-control" id="username" placeholder="Username">
        <label for="password" class="sr-only">Password</label>
        <input name="password" type="password" class="form-control" id="password" placeholder="Password">
        <div style="height:10px"></div>
        <button type="button" class="btn btn-lg btn-primary btn-block"
            onclick="login(this.form.username.value, this.form.password.value)">Login</button>
    </form>
</body>

</html>
```

前面的 head 處載入 JavaScript 跟 CSS，第一項是自定義的 CSS，這邊不細講，有興趣可以翻 GitHub，二三項是 Bootstrap 跟 axios，可以用 CDN 一併載入

```html
<link rel="stylesheet" type="text/css" href="./css/main.css">
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
        integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
```

因為程式很小，沒必要拆 JavaScript，將 JavaScript 的程式寫在 head，等等再回來看

```html
<script>
    async function login(username, password) {
    ...
</script>
```

來看頁面主體，架構是

```html
<body class="text-center">
    <form method="post" action="/login" class="form-signin">
        <h1 class="h3 mb-3 font-weight-normal">Please sign in</h1>
        <label for="username" class="sr-only">Username</label>
        <input name="username" type="username" class="form-control" id="username" placeholder="Username">
        <label for="password" class="sr-only">Password</label>
        <input name="password" type="password" class="form-control" id="password" placeholder="Password">
        <div style="height:10px"></div>
        <button type="button" class="btn btn-lg btn-primary btn-block"
            onclick="login(this.form.username.value, this.form.password.value)">Login</button>
    </form>
</body>
```

登入頁面上會有一張表單，表單上有兩個 input，可以讓使用者輸入帳號密碼。表單下方會有個 button，當使用者點擊 button 後，會觸發 login 這個函式，函式的參數為兩個 input 的值。

知道頁面有哪些元素後，可以回來看 JavaScript 做了哪些事情

```js
async function login(username, password) {
    try {
        let res = await axios.post('http://127.0.0.1:8080/login', {
            username: username,
            password: password,
        })
        res = await axios.get('http://127.0.0.1:8080/content', {
            headers: {
                'Authorization': `Bearer ${res.data.token}`
            },
        })
        let element = document.querySelector('body');
        element.innerHTML = `<h1 class="welcome">${res.data.data}</h1>`
    } catch (e) {
        console.log(e)
    }
}
```

當使用者案下 button 後，會觸發 login 函式。這邊使用 async/await 來處理非同步邏輯，當 login 被執行時，會向 Server 送出 Post，內容帶有帳號密碼

```js
let res = await axios.post('http://127.0.0.1:8080/login', {
    username: username,
    password: password,
})
```

等到非同步處理完畢後，使用取得的 JWT，用 Get 向 Server 要求內容

```js
res = await axios.get('http://192.168.99.83:8080/content', {
    headers: {
        'Authorization': `Bearer ${res.data.token}`
    },
})
```

拿到內容後，修改 body 的 innerHTML，把原先的元素換掉

```js
let element = document.querySelector('body');
element.innerHTML = `<h1 class="welcome">${res.data.data}</h1>`
```

最後用 try 來處理請求失敗的情形，將它印到 console 上

```js
} catch (e) {
    console.log(e)
}
```

## Operation

設計完成後，來實際操作吧，用 nodemon 打開後端程式

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-nodejs/jwt$ nodemon index.js
[nodemon] 2.0.4
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,json
[nodemon] starting `node index.js`
```

在瀏覽器輸入網址，打開頁面

![](/img/posts/2020/how-to-authenticate-user-using-jwt/jwt-1.png)

可以看到設計好的表單。輸入帳號密碼，點擊 Login，得到歡迎訊息

![](/img/posts/2020/how-to-authenticate-user-using-jwt/jwt-2.png)

打開開發者工具，當送出 /content 的 RESTful API 時，會看到請求有帶後端回覆的 JWT

![](/img/posts/2020/how-to-authenticate-user-using-jwt/jwt-3.png)

如果在 /login 輸入錯誤的帳密，則會看到失敗訊息

![](/img/posts/2020/how-to-authenticate-user-using-jwt/jwt-4.png)

## 小結

JWT 的概念簡單，容易操作，是現在常用到的驗證方法。但只要持有 JWT 的人，Server 都會將它當成合法對象，容易造成一些資安風險。如果因為管理 Token 的需求，而替 Token 設定過期的時間，安全是安全了些，卻會增加使用者驗證的麻煩，是權限管理時需要權衡的部分。

另外 JWS 這項 JWT 實作，為保持訊息對第三方透明，只有驗證訊息的真實性，沒有對訊息加密，只要用 base64 decode 回去，就能取得 header 跟 payload 的資訊，因此敏感資訊記得不要放在 JWT 內喔，以防在在網路上被別人竊取。

## Reference

- [[筆記] 透過 JWT 實作驗證機制](https://medium.com/%E9%BA%A5%E5%85%8B%E7%9A%84%E5%8D%8A%E8%B7%AF%E5%87%BA%E5%AE%B6%E7%AD%86%E8%A8%98/%E7%AD%86%E8%A8%98-%E9%80%8F%E9%81%8E-jwt-%E5%AF%A6%E4%BD%9C%E9%A9%97%E8%AD%89%E6%A9%9F%E5%88%B6-2e64d72594f8)
- [是誰在敲打我窗？什麼是 JWT ？](https://5xruby.tw/posts/what-is-jwt/)
