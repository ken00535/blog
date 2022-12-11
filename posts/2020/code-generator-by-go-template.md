---
title: 自動生成重複代碼：使用 Go 的 Template 
description: 開發軟體時，常常會發現有些函式或方法很類似，如果開發者僅僅寫設定檔，就有程式能根據設定檔來自動產生程式碼，不是很美好的事嗎？在實務上，這類用於產生程式的程式被稱為 Code Generator。本文會用 Callback 的 Generator 當例子，講解如何開發並使用一套 Code Generator。…
date: 2020-11-07
scheduled: 2020-11-07
tags:
  - Go
layout: zh-tw/layouts/post.njk
---

開發軟體時，常常會發現有些函式或方法很類似，例如對 Callback Function 來說，開發者都需要註冊回調函式，並在適當的時機，將資料交給回調函式處理，我們可以將這兩個動作，稱為 OnAction 跟 EmitAction。儘管繼承或組合能讓程式碼重複使用類似的組件，幫助開發者節省時間，但對於較複雜的情況，像是不同類(Class)的函式名稱也要不同時，仍需要仰賴開發者自行編寫。

試著想想，如果開發者僅僅寫設定檔(Config File)，就有程式能根據設定檔來自動產生程式碼，不是很美好的事嗎？這是有的，在實務上，這類用於產生程式的程式被稱為 Code Generator，例如[前面](/posts/2020/go-generic-alter-plan-assert-and-codegen.md)介紹過的 genny。Golang 有內建 generate 這個命令行工具，能幫助開發者將 Code Generator 跟編譯更密切結合在一起。

本文會用 Callback 的 Generator 當例子，講解如何開發並使用一套 Code Generator。需要 Clone 程式碼的，可以到[這裡](https://github.com/ken00535/golang-medium-example)。

## Design a Config File

我們的目標是設計一套程式，可以依照 Config 來產生 Callback Function，Callback Function 能根據 Config，而有不同的名字跟引數型別。對像 Golang 這類強型別又沒有泛型的語言來說，這是很實用的功能。

先看專案結構

```
.
├── Makefile
├── cmd
│   ├── codegen
│   │   └── main.go
│   └── example
├── config
│   └── callback.json
└── go.mod
```

codegen 內的 main.go 是主要程式碼，也就是 Code Generator；而 config 用於放置需要的設定檔。

Config 應該長怎樣呢？我們希望它是一個陣列，這樣就能將每個元素對應到不同的 Callback，元素應該是個物件，包含 Name 跟 Arg 兩個不同的鍵，如果用 JSON 格式來表達，它會長

```json
[
    {
        "EventName": "Click",
        "CallbackArg": "int"
    },
    {
        "EventName": "Move",
        "CallbackArg": "uint32"
    }
]
```

EventName 是 Callback 的名稱；CallbackArg 是 Callback 的引數型別。

來看主程式的部分，在 main.go 中讀進 config，並 Parse 成 Struct

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
    "strings"
    "text/template"
)

type schema struct {
    EventName   string
    CallbackArg string
}

func main() {
    var schemas []schema
    data, err := ioutil.ReadFile("../../config/callback.json")
    if err != nil {
        panic(err)
    }
    err = json.Unmarshal(data, &schemas)
    if err != nil {
        panic(err)
    }
}
```

先建立個 Struct 來對應 config

```go
type schema struct {
    EventName   string
    CallbackArg string
}
```

再來讀檔案

```go
data, err := ioutil.ReadFile("../../config/callback.json")
if err != nil {
    panic(err)
}
```

接著反序列化 JSON，放進 array 中

```go
var schemas []schema
err = json.Unmarshal(data, &schemas)
if err != nil {
    panic(err)
}
```

完成對 config 的讀取。

## Design Template

接著來設計 template，可以把它想像成是個餅乾模具，只要將麵團塞進模具放入烤箱烘烤，等待出爐後就是熱騰騰的餅乾。如果要換口味，也只需要調整麵團的配方，不需要動到模具。對照到程式碼，它可以看成是一段重複的程式碼原型，某些段落可以塞進變數，模板引擎會根據模板來渲染，達到客制化效果。

讓人驚奇的是，Golang 有內建 template，這再次讓人感受到 Golang 在應用開發上的優勢。

在原本的專案下，加入 template

```
.
├── Makefile
├── cmd
│   ├── codegen
│   │   └── main.go
│   └── example
├── config
│   └── callback.json
├── go.mod
└── tmpl
    ├── callbackTemplate.tmpl
    ├── contextTemplate.tmpl
    └── main.tmpl
```

main.tmpl 用於產生主程式；contextTemplate.tmpl 用以產生一個 Struct，內有需要的 callback 函式；callbackTemplate.tmpl 用來產生 callback 的註冊及調用。

先來看要怎麼調用模板引擎，修改 main.go

```go
t := template.Must(template.New("main.tmpl").ParseFiles("../../tmpl/main.tmpl"))
t = template.Must(t.ParseFiles("../../tmpl/callbackTemplate.tmpl"))
t = template.Must(t.ParseFiles("../../tmpl/contextTemplate.tmpl"))
err = t.Execute(os.Stdout, schemas)
if err != nil {
    fmt.Println(err)
}
```

使用 text/template 函式庫，在 ParseFiles 由檔案引入模板，然後用 Execute 來渲染模板，輸出的結果先導到 stdout，顯示於終端機畫面，如果開發者有需要，可以將它再重新導向到檔案中。

要注意 Execute 的第二個引數是 schemas ，這是由 config 中讀出的數據，也是要傳給模板的值。

來看看模板的內容，main.tmpl 是

```go
package main

{{ template "contextTemplate.tmpl" . }}
{{ template "callbackTemplate.tmpl" . }}
```

用 {{ action }} 框起來的是模板的 action，可以當成是模板語法，{{ template }} 意思是引入其他模板，在 main.tmpl 引入其他兩個模板； . 是調用程式傳入的參數。

main.tmpl 內的 contextTemplate.tmpl 是另一個子模板，用於產生 struct

```go
// Context can be used to callback
type Context struct {
{{- range . }}
    {{ .EventName }}Callback func({{ .CallbackArg }})
{{- end }}
}
```

其中 range 是模板語言的迴圈，類似 Golang 的 for range； - 是省略 {{}} 前的空白，避免 action 干擾到模板。.EventName 跟 .CallbackArg 是傳入結構底下的欄位，也就是 config 中 EventName 跟 CallbackArg 的值。

經過 contextTemplate.tmpl 後，預期可以生成

```go
// Context can be used to callback
type Context struct {
    ClickCallback func(int)
}
```

Click 跟 int 都是依照傳入參數而建立。

main.tmpl 內的另一個子模板 callbackTemplate.tmpl 用於產生 function

```go
{{- range . }}
// On{{ .EventName }} register a callback function
func (c *Context) On{{ .EventName }}(callback func(arg {{ .CallbackArg }})) {
    c.{{ .EventName }}Callback = callback
}

// Emit{{ .EventName }} emit a callback event
func (c *Context) Emit{{ .EventName }}(arg {{ .CallbackArg }}) {
    c.{{ .EventName }}Callback(arg)
}
{{ end }}
```

經過 callbackTemplate.tmpl 後，可以生成

```go
// OnClick register a callback function
func (c *Context) OnClick(callback func(arg int)) {
    c.clickCallback = callback
}

// EmitClick emit a callback event
func (c *Context) EmitClick(arg int) {
    c.clickCallback(arg)
}
```

如此一來，就完成模板的設計了。

## Add Template Action

儘管 Golang 模板有內建很多 action，但還是可能找不到想要的功能，例如，在 Golang 語法中，Struct Field 的名字首字母如果是大寫，意謂該 Field 是 Public，但另一方面，開發者又會希望 Function Name 要 Follow Camal Method。對應到需求是，如果 EventName 有時能大寫，有時能小寫，那就兩全其美了。

這時就是自定義 action 派上用場的時機了，要加入自定義 action，可以回去修改 main.go，加入

```go
funcLowerCase := template.FuncMap{"lower": strings.ToLower}
t := template.Must(template.New("main.tmpl").Funcs(funcLowerCase).ParseFiles("../../tmpl/main.tmpl"))
```

用 FuncMap 建立一個鍵值對，key 是 action 的名字，value 是 action 的執行內容，這邊使用 strings 下的 ToLower 幫忙做大小寫轉換。

建立後的 func 可以用 Funcs 帶進模板中。

再來修改模板 contextTemplate.tmpl

```go
{{ .EventName | lower }}Callback func({{ .CallbackArg }})
```

| 是 pipeline，可以將前項的輸出跟後項的輸入用管道連接起來，放在這邊，意思是將 EventName 傳給 lower，而 lower 正是剛剛建立的模板 action。

於是渲染效果變成

```go
// Context can be used to callback
type Context struct {
    clickCallback func(int)
}
```

處理好 scope 的問題了。

## Try It

開發完成後，來看看如何使用。

一開始，先用 go run 來驗證程式是否正確

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-golang/codegen/cmd/codegen$ go run main.go
```

得到

```go
package main

// Context can be used to callback
type Context struct {
        clickCallback func(int)
        moveCallback func(uint32)
}

// OnClick register a callback function
func (c *Context) OnClick(callback func(arg int)) {
        c.clickCallback = callback
}
...
```

內容正確！將輸出導出到 context.go 的檔案中

```bash
go run main.go > ./context.go
```

在專案中新增使用的程式

```
.
├── Makefile
├── cmd
│   ├── codegen
│   │   └── main.go
│   └── example
│       └── main.go
├── config
│   └── callback.json
├── go.mod
└── tmpl
    ├── callbackTemplate.tmpl
    ├── contextTemplate.tmpl
    └── main.tmpl
```

example/main.go 的內容是

```go
package main

import "fmt"

func main() {
    printNum := func(num int) {
        fmt.Println(num)
    }
    context := &Context{}
    context.OnClick(printNum)
    context.EmitClick(5)
}
```

使用 Context，並將 Println 註冊為 OnClick 的 callback，使用 EmitClick 將資料發送給 callback，OnClick 收到後就會將資料印出。

在本例中，發送的資料是 5

接著在檔案中加入 go:generate，讓 go generate 可以執行註解內容，產生 context.go

```go
//go:generate bash -c "go run ../codegen/main.go > ./context.go"
```

用

```bash
go generate ./...
```

context.go 就被生出來了。

接著編譯並執行 example

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-golang/codegen$ ./bin/example 
5
```

成功印出 5。

## 小結

Go 命令行工具的 generate 原本是為了方便整合外部工具，讓 Golang 編譯更順利，搭配 template 使用後，變成 Code Generator 的利器。

對於希望簡化程式碼，讓程式碼更具彈性，只要修改 config 即可完成擴充的人來說，Code Generator 會是個不錯的工具。實際上，以 Golang 目前沒有泛型的狀況來看，Code Generator 應該是一條開發捷徑；要注意的是，Code Generator 的用途是面向開發者，如果今天目的是要讓其他人容易使用，應該也要試試看用 Reflect 開發。

## Reference

- [template — The Go Programming Language](https://golang.org/pkg/text/template/)
- [c9s/callbackgen: callbackgen generates callback … — GitHub](https://github.com/c9s/callbackgen)
