---
title: 雙向互動的即時訊息：Websocket 入門
description: 在 HTTP 設計之初，網路應用主要是交換文件，因此當提交訊息或更新訊息時，需要刷新整個頁面。但是對需要互動的應用，如果使用 HTTP 傳遞訊息，則需要客戶端頻繁向伺服端輪詢，可想而知會造成客戶端跟伺服端很大的負擔。比較理想的情況是，應該存在一個事件驅動模型，當伺服端有事件發生時，它會主動通知訂閱的客戶端，客戶端再進行更新，而這就是 WebSocket 這套通訊協定誕生的原因。…
date: 2020-08-23
scheduled: 2020-08-23
tags:
  - Node.js
  - Websocket
layout: zh-tw/layouts/post.njk
---

在 HTTP 設計之初，網路應用主要是交換文件，因此當提交訊息或更新訊息時，需要刷新整個頁面，這也導致大量 HTML 被重複傳輸，浪費使用頻寬。後來 AJAX 被提出，讓 HTTP 可以只取得想要的伺服端訊息，同時在沒有重新導向的情況下更新頁面，讓 HTTP 更符合現代網路應用情境。

但是對需要互動的應用，像是聊天室、遊戲、即時狀態監控等等來說，如果使用 HTTP 傳遞訊息，則需要客戶端頻繁向伺服端輪詢(Polling)，有點像客戶端三不五時跟伺服端問說：「你有沒有新資料需要更新的啊？」可想而知會造成客戶端跟伺服端很大的負擔。比較理想的情況是，應該存在一個事件驅動模型，當伺服端有事件發生時，它會主動通知訂閱的客戶端，客戶端再進行更新，而這就是 WebSocket 這套通訊協定誕生的原因。

Websocket 沒有限定語言，但為了簡化操作，後端可以用 node.js，好跟前端的 JavaScript 共用一套函式庫。本文中會使用 node.js 常見的後端框架 Express，並搭配 socket.io，來建立前後端之間的 WebSocket 連線。

想 Clone 程式碼的，可以到[這裡](https://github.com/ken00535/nodejs-medium-example)。

## Create Server

既然是網路應用，首先來建立 Server，node.js 的專案結構是

```
project
├── public
├── index.js
└── README.md
```

初始化專案

```bash
npm init
```

npm 會問你一堆問題，通常按照預設來回答就好

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-nodejs/socket-io$ npm init
This utility will walk you through creating a package.json file.
It only covers the most common items, and tries to guess sensible defaults.

See `npm help json` for definitive documentation on these fields
and exactly what they do.

Use `npm install <pkg>` afterwards to install a package and
save it as a dependency in the package.json file.

Press ^C at any time to quit.
package name: (socket-io) 
version: (1.0.0) 
description: socket.io demo
entry point: (index.js) 
test command: 
git repository: 
keywords: 
author: kenwschen
license: (ISC) MIT
About to write to /home/ken/git/medium-example-nodejs/socket-io/package.json:

{
    "name": "socket-io",
    "version": "1.0.0",
    "description": "socket.io demo",
    "main": "index.js",
    "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "kenwschen",
    "license": "MIT"
}

Is this OK? (yes)
```

回答完後，專案初始化完成。

接著來安裝 express，這是一套 node.js 的 Web 框架，可以用來將不同的 URL 導向不同的資源（用專有名詞來說，可以用來做多路複用），它的官網是
[Express — Node.js web application framework](https://expressjs.com)

安裝方式是

```bash
npm install express --save
```

npm 會將 express 加入 node_modules 中，讓 node 可以調用依賴，專案變成

```
project
├── node_modules
├── public
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

在入口 index.js 中加入內容

```js
const http = require("http");
const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.type('text/plain');
    res.status(200).send('Hello, World.');
})

server = http.createServer(app)
server.listen(8001, () => {
    console.log('Express started')
})
```

前面是引用函式庫，並建立 express instance

```js
const http = require("http");
const express = require('express');
const app = express();
```

再建立 root 的回覆訊息

```js
app.get('/', function (req, res) {
    res.type('text/plain');
    res.status(200).send('Hello, World.');
})
```

當收到 Get / 的 HTTP request 時，response 的形式是純文本；狀態是 200 ok；內容是 “Hello, World.”

最後，監聽 port 8001，如果建立成功，印出訊息

```js
server = http.createServer(app)
server.listen(8001, () => {
    console.log('Express started')
})
```

執行程式

```bash
node index.js
```

在瀏覽器的導航列輸入 [http://127.0.0.1:8001](http://127.0.0.1:8001) 可以看到 “Hello, World.”

## Create WebSocket Server

有了基本 Server 後，再來加入 WebSocket，這邊使用 [Socket.IO]((https://socket.io/docs/)) 這套函式庫

安裝方式是

```bash
npm install socket.io --save
```

改寫 index.js 內容

```js
const http = require("http");
const io = require('socket.io');
const express = require('express');
const app = express();

// ...

var servIo = io.listen(server);
servIo.on('connection', function (socket) {
    setInterval(function () {
        socket.emit('second', { 'second': new Date().getSeconds() });
    }, 1000);
});
```

WebSocket 跟 HTTP Listen 同一個 Port，訂閱 connection 事件，當連線建立時會觸發

```js
servIo.on('connection', function (socket)
```

若是連線成功，則每秒發送當前的秒數到 second 事件中

```js
setInterval(function () {
        socket.emit('second', { 'second': new Date().getSeconds() });
    }, 1000);
```

## Create WebSocket Client

建立完伺服端，接著建立客戶端。客戶端用到的的靜態資源會放在 public 下，因此新增兩個檔案

```
project
├── node_modules
├── public
│   ├── client.js
│   └── socket.html
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

也要讓 express 知道這件事，改寫 index.js

```js
const http = require("http");
const io = require('socket.io');
const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));
```

新增的兩個資源，socket.html 用以描述前端頁面；client.js 用來建立 WebSocket 並改寫 HTML 顯示的資訊。

先來看 HTML

```html
<html>

<head>
    <script src="/socket.io/socket.io.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
</head>

<body>
    <script src="client.js"></script>
    <div id="second"></div>
</body>

</html>
```

引用了 socket.io 的函式庫，還有 jQuery 用來操作 HTML 元素。body 內執行 client.js 的內容，並有一個 div 顯示秒數資訊。

接著看 client.js

```js
var socket = io.connect();

socket.on('second', function (second) {
    $('#second').text(second.second);
});
```

訂閱 second 事件；當收到 second 時，改寫 second 元素中的內容

用瀏覽器打開 http://127.0.0.1:8001/socket.html，叫出剛剛建立的頁面，用 F12 打開瀏覽器的開發者視窗，可以看到資源都被 Get 回來

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-1.png)

其中有個 WebSocket 連線，點選後可以看到伺服器不斷傳送訊息

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-2.png)

前端頁面上的秒數值也會不斷被刷新。

## Monitor WebSocket Packet

我們可以用 WireShark 來觀察 WebSocket 的封包。WebSocket 的交握過程如下圖

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-3.png)

Client 會發起 HTTP Upgrade，要求將 Session 升級為 WebSocket 協定，Server 收到後，會回覆 Client 已經 Upgrade，雙方後續就可以使用 WebSocket 通訊。如果用 WireShark 抓取封包，結果會是

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-4.png)

可以看到一開始是 HTTP，等到雙方交握完成後，就改為 WebSocket。

進一步查看交握的封包內容

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-5.png)

HTTP 中會帶許多 Header，Upgrade 表示要升級的協定；Sec-WebSocket-Key 則是交握用的資訊。Server 收到後會回

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-6.png)

狀態碼是 101，表示協議切換；其中 Sec-WebSocket-Accept 是用 Sec-WebSocket-Key 算出來的值，用來避免跨協議攻擊。

後面 WebSocket 協定包括幀頭跟載荷

![](/img/posts/2020/a-full-duplex-protocol-websocket/ws-7.png)

Fin 的 bit 表示該幀為完結幀，通常 WebSocket 傳送只用到一幀，但也能支援多幀傳送；Opcode 是操作碼，表示內容的類型，通常用於 WebSocket 的傳送都是文本；Payload 是資料內容，可以看到事件名稱跟秒數都在 Payload 中。

## Send Message From Client

由於 WebSocket 是雙向通訊，也可以改寫程式，由前端發訊息給後端，先在 HTML 中建立文本輸入欄位

```html
<body>
    <script src="client.js"></script>
    <div id="second"></div>
    <textarea id="text"></textarea>
</body>
```

改寫 client.js

```js
$(document).ready(function () {
    $('#text').keypress(function (e) {
        socket.emit('client_data', String.fromCharCode(e.charCode));
    });
});
```

在前端載入完成時註冊一個 function，當文本輸入欄位被輸入新的值，這個值就會立刻傳送回後端。

接著改寫 index.js

```js
servIo.on('connection', function (socket) {
    setInterval(function () {
        socket.emit('second', { 'second': new Date().getSeconds() });
    }, 1000);

    socket.on('client_data', function (data) {
        console.log(data);
    });
});
```

訂閱 client_data，當收到前端回傳的資料，用 console.log() 印出。

這樣就能完成雙向通訊了。

## 小結

隨著 Web 領域的發展，WebSocket 已經是非常常見的應用了，畢竟現在的網路應用越來越接近桌面程式，前後端的互動更加頻繁，有些時候必須仰賴 WebSocket 才能滿足即時性的需求。像是開發設備前端，如果只使用單純的 AJAX，由於瀏覽器不可能每秒都跟後端取資料，拿到的數據不免有可能會失真，無法正確反映瞬間峰值，這時就是改用 WebSocket 的時機點。

## Reference

- [express](https://expressjs.com/)
- [socket.io](https://socket.io/docs/)
- [Node.js、Express、Socket.io 入门](https://www.cnblogs.com/sword-successful/p/4987124.html)
- [Node.js 實作 The F2E_ChatRoom (1) 環境建置](https://w3c.hexschool.com/blog/e2d9c79d)
