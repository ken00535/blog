---
title: jwt vs session
description: 
date: 2022-10-22
scheduled: 2022-10-22
tags:
  - Go
layout: zh-tw/layouts/post.njk
draft: true
---

jwt 不安全的點，還有它的應用場景，這篇應該有現成的

好奇問一下登出的功能會怎麼處理？例如說改密碼以後，改密碼前的 JWT 要能讓它無效，但這個 JWT 本身其實沒有過期（expire time 還沒到）

就像你說的，以 JWT 的設計來說，要解過期的話就我所知要嘛就是 token 時間設短，要嘛就是要有個 storage 去記說哪些 token 過期

authentication 有變, token 應該要立即失效喔。想像一下你已經知道你的 pwd 被拿走了，但後端仍允許壞蛋拿之前的 token 進來。

- [Stop using JWT for sessions](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/)
- [以 JSON Web Token 替代傳統 Token](https://yami.io/jwt/)
- [以 JSON Web Token 取代 session](https://medium.com/@leon740727/%E4%BB%A5-json-web-token-%E5%8F%96%E4%BB%A3-session-bae47556dde2)
- [理解 JWT 的使用场景和优劣](https://www.cnkirito.moe/jwt-learn-3/)