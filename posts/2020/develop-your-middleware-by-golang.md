---
title: 訊息的處理架構：路由與中間層模式
description: http 庫對 URL 進行 function 註冊的設計模式，不僅可以使用在後端開發，也能應用於更普遍的情境。對於要對同類型資訊進行不同處理的例子，都可以使用這個設計模式。本文會用 Golang 來開發一個類似 http middleware 的程式，處理自訂的訊息格式，藉由這過程，也順便走一次 http 庫的路由設計原理。…
date: 2020-06-14
scheduled: 2020-06-14
tags:
  - Go
  - Design Pattern
layout: zh-tw/layouts/post.njk
---

進行後端程式開發時，常會使用到 Golang 的 http 標準庫。例如要對某個 URL 進行處理時，會用到

```go
http.Handle("/foo", fooHandler)
```

可以想像，如果沒有 http 庫，就需要使用大量的 if else 來對 URL 判斷，大幅降低程式碼可讀性。http 庫對 URL 進行 function 註冊的設計模式，不僅可以使用在後端開發，也能應用於更普遍的情境。對於要對同類型資訊進行不同處理的例子，都可以使用這個設計模式。

本文會用 Golang 來開發一個類似 http middleware 的程式，處理自訂的訊息格式，藉由這過程，也順便走一次 http 庫的路由設計原理。

## Build a Go Module

依照[前篇](/posts/2020/develop-a-command-line-tool-by-golang)提過的專案目錄結構，我們的使用情境是：(1)有個主程式負責主要邏輯；(2)有關路由跟 middleware 的內部邏輯，使用 package 來處理。因此專案目錄會是

```
project
├── cmd  # main applications for this project.
|   └── main
|      └── main.go
├── pkg  # code that's ok to use by external applications
|   └── route
|      └── route.go
├── scripts
|   └── build_win.bat
|── go.mod
└── README.md
```

go.mod 是由 go moudle 產生出來的文件，這是 Golang 在 1.11 後推出的套件管理工具，讓開發者可以不用依照 GOPATH 的結構來安排專案（原本使用 GOPATH 大約是因為 Google 用 Monorepo 來管理專案，而 Golang 沿襲著 Google 的風格）。

要將當前的專案目錄建立為 Module，只需要用 CLI 寫入

```bash
go mod init router
```

go module 會自動生成 go.mod，記錄模組與相依情況，這裡的 router 是模組名稱，如果這個模組會放到 github，可以用你的 github 網址作為模組名稱，更符合 Golang 的設計

```bash
module router

go 1.14
```

然後，因為專案目錄變得比較複雜了，也建立一個 batch file 來幫忙 build code

```bash
[@echo](http://twitter.com/echo) off

if not exist bin (
    mkdir bin
)

for /f "usebackq" %%i in (`dir /b /on /a:d .\cmd`) do (
    echo %%i
    go build -o ./bin/%%i.exe ./cmd/%%i
)
```

執行這個 batch file 後，會建立 bin 資料夾，並依照 cmd 下所有的資料夾名稱，個別建立執行檔。由於現在有 main.go，會生成對應的 ./bin/main.exe。

## Design Router

在 pkg 下設計一個簡單的路由模組，負責將不同的訊息路由到對應的處理函式，路由器的設計可以長這樣

```go
package route

// Message is message
type Message struct {
    Identification string
    Time           string
    Content        string
    Size           int
}

// Handler is handler
type Handler func(res, req *Message)

// Router is router
type Router struct {
    mux map[string]Handler
}

// NewRouter new a router
func NewRouter() *Router {
    return &Router{
    mux: make(map[string]Handler),
    }
}

// Add a route
func (r *Router) Add(route string, h Handler) {
    var mergedHandler = h
    r.mux[route] = mergedHandler
}

// Run router
func (r *Router) Run(res, req *Message) error {
    route := req.Identification
    handler, exists := r.mux[route]
    if exists {
    handler(res, req)
    }
    return nil
}
```

一段一段來看

首先設計一個訊息格式，視具體的應用需求，用來乘載要處理的資訊。這邊假設訊息格式中帶有辨識用的 Identification，如果是 http，可能是請求資源用的 URL。其他欄位可以是不同的 attribute，例如時間、內容、訊息大小等等。

```go
// Message is message
type Message struct {
    Identification string
    Time           string
    Content        string
    Size           int
}
```

使用 type 的方式，定義訊息的處理函式。

```go
// Handler is handler
type Handler func(res, req *Message)
```

定義路由器

```go
// Router is router
type Router struct {
    mux map[string]Handler
}
```

路由器的具體實作是個 hashtable，用 Identification 當 key，處理函式當 value，當請求進來時，直接用 Identification 查出對應的處理函式進行處理。

```go
// NewRouter new a router
func NewRouter() *Router {
    return &Router{
        mux: make(map[string]Handler),
    }
}
```

路由器的建構式，因為 Golang 不是完全的物件導向語言，因此沒有預設的建構式，使用上習慣用 NewType 的函式做為建構式。

```go
// Add a route
func (r *Router) Add(route string, h Handler) {
    var mergedHandler = h
    r.mux[route] = mergedHandler
}

// Run router
func (r *Router) Run(res, req *Message) error {
    route := req.Identification
    handler, exists := r.mux[route]
    if exists {
        handler(res, req)
    }
    return nil
}
```

最後是路由器的關鍵 method。路由器有兩個 method，Add 用來將路由規則跟函式註冊到路由器中；Run 用來執行路由器。當路由器被執行時，它會去查自己的註冊表中有沒有對應的規則，如果有就執行。由於 Run 前會用 Add 將規則都寫進路由器中，message 進來就會進行對應的調用。

## Use Router

來看看在 cmd 下應該如何使用設計好的路由器模組

```go
package main

import (
    "fmt"
    "router/pkg/route"
)

func main() {
    router := route.NewRouter()
    router.Add("hello", helloHandler)
    var res route.Message
    req := route.Message{
        Identification: "hello",
        Content:        "Gopher",
    }
    router.Run(&res, &req)
    fmt.Println(res.Content)
}

func helloHandler(res, req *route.Message) {
    res.Content = req.Content
}
```

先由 pkg/route 引入使用的模組，建構新的路由器，對它進行註冊。假設可以由訊息的 Identification 來 Locate 訊息，則可以用

```go
router.Add("hello", helloHandler)
```

來標明 Identification 是 hello 的訊息，希望用 helloHandler 來處理，而 helloHandler 的內容是

```go
func helloHandler(res, req *route.Message) {
    res.Content = req.Content
}
```

它依照前面 route 模組 Handler 的定義，有兩個引數，分別表示 response 跟 request，helloHandler 會將 request 的 content 複製給 response。因此經過 helloHandler 後，出去的響應會有跟請求相同的內容。

建立一則訊息，Identification 是 hello，Content 是 Gopher，執行路由。

```go
var res route.Message
req := route.Message{
    Identification: "hello",
    Content:        "Gopher",
}
router.Run(&res, &req)
fmt.Println(res.Content)
```

寫好程式先編譯，看看結果

```bash
.\scripts\build_win.bat
.\bin\main.exe

Gopher
```

Content 成功複製給 response 了。

## Add Various Method

假設今天訊息類似 http method 一樣，有好幾種不同的處理方式，希望在進行註冊時，能明確各處理方式，免得出現 Get 寫成 Got 這類無意間拼錯的悲劇，可以怎麼做？

首先，來修改 route 模組，先修改訊息格式，加入 method

```go
type Message struct {
    Identification string
    Method         string
    Time           string
    Content        string
    Size           int
}
```

將 Add 由 public 改為 private，免得誤用，並增加各 method 的 function

```go
// add a route
func (r *Router) add(route string, h Handler) {
    var mergedHandler = h
    r.mux[route] = mergedHandler
}

// Get add a get method pattern
func (r *Router) Get(route string, h Handler) {
    r.add("get:"+route, h)
}

// Put add a put method pattern
func (r *Router) Put(route string, h Handler) {
    r.add("put:"+route, h)
}

// Post add a post method pattern
func (r *Router) Post(route string, h Handler) {
    r.add("post:"+route, h)
}

// Delete add a delete method pattern
func (r *Router) Delete(route string, h Handler) {
    r.add("delete:"+route, h)
}
```

Run 函式改為

```go
func (r *Router) Run(res, req *Message) error {
    route := req.Method + ":" + req.Identification
    handler, exists := r.mux[route]
    if exists {
        handler(res, req)
    }
    return nil
}
```

概念上很單純，就是在 key 上新加個字段，用來分別 method。

使用上則變成

```go
router.Get("hello", helloHandler)
var res route.Message
req := route.Message{
    Identification: "hello",
    Method:         "get",
    Content:        "Gopher",
}
router.Run(&res, &req)
```

註冊時直接用 Get 來註冊即可。

## Add Middleware

如果現在有個情境，Identification foo 跟 bar 在進行核心的處理前，都需要某種共通的訊息處理，例如記錄運算時間，但 hello 不需要；或者是我們希望將前處理的邏輯跟核心處理邏輯分開，不要讓兩種不同邏輯混雜在一起，又要怎麼進行呢？這時就是 Middleware 派上用場的時刻了。

Middleware 顧名思義，是軟體的中間層，可以想像成是 Request 到核心邏輯，再到 Response 這段的中間夾層。這些中間層可以類似漢堡的結構，你想要加入什麼樣的食材，例如高麗菜、牛肉、酸黃瓜、起司等等，你就多加一層中間層，藉此達到分離與彈性的效果。

![middleware 示意圖](/img/posts/2020/develop-your-middleware-by-golang/middleware.png)*middleware 示意圖*

為了讓 route 模組具有中間層的功能，新增

```go
// Middleware is public middleware
type middleware func(Handler) Handler

// Router is router
type Router struct {
    middlewareChain []middleware
    mux map[string]Handler
}
```

middleware 是中間層的 type，它是個函式，會吃進 Handler 進行包裝後，再吐出包裝後，具有同樣簽名的 Handler。因為 middleware 的存在，可以再執行被包裝的 Handler 前，先執行一些想要的前處理。

Router 的部分也加入 middlewareChain，讓這些 middleware 可以被註冊到路由器中，並進行嵌套式的包裝。

另外，也需要改寫 add，並新增一個 middleware 的註冊函式

```go
// Use add middleware
func (r *Router) Use(m middleware) {
    r.middlewareChain = append(r.middlewareChain, m)
}

// add a route
func (r *Router) add(route string, h Handler) {
    var mergedHandler = h
    for i := len(r.middlewareChain) - 1; i >= 0; i-- {
    mergedHandler = r.middlewareChain[i](mergedHandler)
    }
    r.mux[route] = mergedHandler
}
```

Use 負責將 middleware 加入路由器中；add 中新增一個 for 迴圈，對 Handler 進行包裝。可以看到 for 迴圈會由最後一個加入的 middleware 開始，一層一層將 middleware 包覆到 Handler 上，等全部都包裝完後，放進 route 中。

最後修改 main 的使用方式，加入兩層 middleware

```go
func main() {
    router := route.NewRouter()
    router.Use(cheeseMiddleware)
    router.Use(beefMiddleware)
    router.Get("hello", helloHandler)
    var res route.Message
    req := route.Message{
        Identification: "hello",
        Method:         "get",
        Content:        "Gopher",
    }
    router.Run(&res, &req)
    fmt.Println(res.Content)
}

func helloHandler(res, req *route.Message) {
    fmt.Println("This is core")
    res.Content += req.Content
}

func cheeseMiddleware(next route.Handler) route.Handler {
    return func(res, req *route.Message) {
        res.Content += "cheese "
        fmt.Println("This is cheese")
        next(res, req)
        fmt.Println("This is cheese")
    }
}

func beefMiddleware(next route.Handler) route.Handler {
    return func(res, req *route.Message) {
        res.Content += "beef "
        fmt.Println("This is beef")
        next(res, req)
        fmt.Println("This is beef")
    }
}
```

在進到核心處理邏輯前，先加入一層 cheese，再加入一層 beef，這兩層 middleware 都會印出訊息，並修改 response 的內容。

來看看輸出結果

```bash
.\bin\main.exe

This is cheese
This is beef
This is core
This is beef
This is cheese
cheese beef Gopher
```

夾心 Gopher 完成。

## 小結

http 庫跟 middleware 是現代 Web 開發中常使用的設計模式，跟基本的 if else 相比，route 的邏輯非常乾淨，只需要

```go
router.Use(cheeseMiddleware)
router.Use(beefMiddleware)
router.Get("hello", helloHandler)
```

就能看出程式碼的意圖，無須關注條件判斷。同時，因為 middleware 跟 route 在設計時已經對介面進行定義，其他人在開發時能根據相同的 interface 來設計，擴充性也比 if else 來得要好。

這種以函式為主體，進行嵌套跟處理的模式，就是標準的函數式編程(Functional Programming)，這也是 Golang 相對於傳統語言的一大特色。

## Reference

- [Middleware Patterns in Go](https://drstearns.github.io/tutorials/gomiddleware/)
- [Package http](https://golang.org/pkg/net/http/)
