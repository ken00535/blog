---
title: Go 命令行工具初體驗：使用標準包開發
description: 最初是在社群活動時接觸到 Golang，前陣子換工作後，新的產品團隊也是使用 Golang 來開發產品，在接觸新語言時覺得有些地方很有意思，好像能看到某種程式語言的變遷，或者說開發方向之類？跟常見的物件導向語言不同，Golang 不強調物件，而且帶有一些函式編程的特色，如果說 C++ 是替 C 補上物件導向的環節，那 Golang 更像是 C 語言的現代版。…
date: 2020-06-06
scheduled: 2020-06-06
tags:
  - Go
layout: zh-tw/layouts/post.njk
---

最初是在社群活動時接觸到 Golang，前陣子換工作後，新的產品團隊也是使用 Golang 來開發產品，在接觸新語言時覺得有些地方很有意思，好像能看到某種程式語言的變遷，或者說開發方向之類？跟常見的物件導向語言不同，Golang 不強調物件，而且帶有一些函式編程的特色，如果說 C++ 是替 C 補上物件導向的環節，那 Golang 更像是 C 語言的現代版。

本篇會簡單介紹如何使用 Golang 來開發一個簡單的命令行工具。我們可以假設一個微服務開發的情境，開發者需要頻繁在開發環境中啟動或關閉微服務，這時它會需要一個工具，能依照需求啟動各個微服務，通常在 Linux，我們會使用 shell script 來做這件事；如果是 Windows，則會使用 power shell 或 batch file；更正式的生產環境，可能會採用容器調度工具。Golang 由於具有跨平台的特性，也可以用在這個情境中。

## Install Golang

開發前，當然要先安裝囉，對於 Windows 的使用者，會建議使用 chocolatey 來安裝

```bash
choco install golang -y
```

安裝好後確認版本

```bash
go version
```

得到

```bash
go version go1.14 windows/amd64
```

由於 Golang 是發展快速的語言，對版本要特別注意，可能前個版本的功能或環境，到下個版本就不同了。

然後，建議開發者的專案目錄可以長這樣

```
project
├── cmd  # main applications for this project.
|   └── main.go
├── pkg  # code that's ok to use by external applications
|   ├── module 1
|   |   └── module.go
|   └── module 2
└── README.md
```

cmd 用來放主要的應用程式，pkg 用來放相關的 lib，更細部的 layout 可以參考相關[連結](https://github.com/golang-standards/project-layout)。因為我們的程式不會很大，這邊先用到 cmd 就可以了。

## Hello World

所有語言的入門款就是 Hello, World，在 cmd/main.go 下加入程式碼，印出第一行文字

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, world")
}
```

package main 是這個 go file 所屬的 module，對於所有的 go file 而言，都會有專屬的模組，方便進行引用；import 則是引用其他的模組，fmt 是 format 的縮寫，是 Go 的標準庫，用來做一些格式化的輸入輸出，可以在相關的[網站](https://pkg.go.dev/fmt?tab=doc)看到說明

> Package fmt implements formatted I/O with functions analogous to C’s printf and scanf. The format ‘verbs’ are derived from C’s but are simpler.

main 是 Go 的保留關鍵字，只要是 func main，就會是程式的入口，概念跟 C 語言的 int main() 相同。

當敲好程式後，可以直接用 go run 來編譯並執行

```bash
go run cmd/main.go
```

將 command-line tool 整合到 language 中，這點就很有現代語言特色，讓開發者更專注心力於開發上。當然，如果只是想要 build 應用程式，也可以使用

```bash
go build -o micro-cli.exe ./cmd
```

執行完後可以看到專案目錄多了一個 micro-cli.exe，執行可以得到

```bash
D:\git\golang-introduction>micro-cli.exe
Hello, world
```

## Exec System Command

接著，我們需要使用 Golang 來執行外部的程式，引入 os/exec 這個模組

```go
func main() {
    fmt.Println("Hello, world")
    noteCmd := exec.Command("notepad")
    noteCmd.Start()
}
```

這樣就能用 Golang 來打開記事本了。

如果除了啟動程式，還需要重新導向該程式的標準輸出到現在的視窗，可以怎麼做？這邊先準備一個文字檔，裡面放要輸出的內容

```md
# README

this is readme file
```

在 Windows 下，可以使用

```bash
type README.md
```

來輸出檔案內容。我們將 go file 改成

```go
func main() {
    fmt.Println("Hello, world")
    noteCmd := exec.Command("cmd", "/c", "type README.md")
    buf := make([]byte, 1024)
    stdout, _ := noteCmd.StdoutPipe()
    noteCmd.Start()
    stdout.Read(buf)
    os.Stdout.Write(buf)
}
```

先建立一個 byte 的動態儲存陣列（Go 的專門用語叫 slice），大小是 1024，再將 noteCmd 的標準輸出建立 pipeline，連接到建好的陣列中。如此 noteCmd 的輸出就會像水管，源源不絕進到 buf，我們再由 buf 中取值，輸出到 micro-cli.exe 的標準輸出，完成串接。

## Parse Arguments

因為命令行工具需要對應到不同的情境，比如說，有些時候希望輸出 A 檔案的內容，有些時候希望輸出 B 檔案的內容，因此最好有個 option 可以讓人做切換。Golang 的標準庫自帶 argument parser，名稱是 flag，說明可以看[這](https://pkg.go.dev/flag?tab=doc)，用法是

```go
var (
    help     bool
    filename string
)

func init() {
    flag.BoolVar(&help, "h", false, "this is help")
    flag.StringVar(&filename, "r", "", "select your file")
    flag.Usage = usage
}

func main() {
    flag.Parse()
    if help {
    flag.Usage()
    return
    }
    fmt.Println("Hello, world")
    noteCmd := exec.Command("cmd", "/c", "type README.md")
    buf := make([]byte, 1024)
    stdout, _ := noteCmd.StdoutPipe()
    noteCmd.Start()
    stdout.Read(buf)
    os.Stdout.Write(buf)
}

func usage() {
    fmt.Println("Usage: micro-cli [-h] [-r filename]")
    flag.PrintDefaults()
}
```

先看第一部分

```go
var (
    help     bool
    filename string
)

func init() {
    flag.BoolVar(&help, "h", false, "this is help")
    flag.StringVar(&filename, "r", "", "select your file")
    flag.Usage = usage
}
```

用 var 建立兩個全域變數 help 跟 filename，用來儲存 flag 的值，接著在 init 設定 flag。func init 跟 func main 同樣是保留字，當程式進入時，會先執行 init 的內容，之後才進行 main，這用在一些初始化設定很方便。

這邊做了三個初始化設定：(1) 看 h 這個選項是否存在，如果存在，賦值給 help，預設是 false，最後的文字是說明；(2) 看 r 這個選項是否存在，如果存在，賦值給 filename；(3) 將 Usage 這個函數指給 flag.Usage。

再來看第二部分

```go
func main() {
    flag.Parse()
    if help {
    flag.Usage()
    return
    }
    ...
}

func usage() {
    fmt.Println("Usage: micro-cli [-h] [-r filename]")
    flag.PrintDefaults()
}
```

使用 flag.Parse 來解析選項，並實際賦值給前面設定好的變數；使用後，就能運用 help 跟 filename 了，這邊定義，當使用者用了 h 參數，就印出使用說明。使用說明看函式 usage，會先印出使用方法，再用 PrintDefaults 顯示細部設定。

來看看實際執行結果，先看 help

```bash
go run cmd/main.go -h

Usage: micro-cli [-h] [-r filename]
    -h this is help
    -r string
       select your file
```

簡單將使用說明與程式結合起來。

接著，修改程式，來讀讀看不同的檔案

```go
func main() {
    flag.Parse()
    if help {
    flag.Usage()
    return
    }
    fmt.Println("Hello, world")
    noteCmd := exec.Command("cmd", "/c", "type "+filename)
    buf := make([]byte, 1024)
    stdout, _ := noteCmd.StdoutPipe()
    noteCmd.Start()
    n, _ := stdout.Read(buf)
    os.Stdout.Write(buf[:n])
}
```

執行

```bash
go run cmd/main.go -r file1
Hello, world
This is file 1

go run cmd/main.go -r file2
Hello, world
This is file 2
```

只要後面帶不同的 filename，就能讀到不同的檔案了

## Read Config

因為每次要讀檔案，都要重新再輸入一次 option，對某些情境實在有點麻煩，想想，如果只有一兩個 option 就算了，假設現在 option 有 10 個，每次啟動程式都要輸入，很容易出現 typo，最好的辦法是將不常更改的 option 放在 config file，使用 config 來設定。

先在專案結構中建立一個 configs 資料夾，用來放設定檔，設定檔格式可以使用 json，但不限制，這邊用 json 格式相對單純而且我比較熟

```
project
├── cmd  # main applications for this project.
|   └── main.go
├── configs
|   └── config.json
├── pkg  # code that's ok to use by external applications
|   ├── module 1
|   |   └── module.go
|   └── module 2
└── README.md
```

內容是

```json
{
    "filename": "file1"
}
```

為讀取 config，要先建立一個對應 config 結構的 struct，好讓程式知道該如何將 config 翻譯成物件

```go
type config struct {
    Filename string `json:"filename"`
}
```

包在反引號 ` 中的文字是 Go 的 tag，它的功用是讓編譯器知道這個 struct 可以對應到 json，在這個例子中，struct config 的 field Filename 對應到 config file 的 filename 欄位。

修改主程式來讀取設定檔

```go
func main() {
    data, _ := ioutil.ReadFile("configs/config.json")
    var fileConfig config
    json.Unmarshal(data, &fileConfig)
    fmt.Println("Hello, world")
    noteCmd := exec.Command("cmd", "/c", "type "+fileConfig.Filename)
    buf := make([]byte, 1024)
    stdout, _ := noteCmd.StdoutPipe()
    noteCmd.Start()
    n, _ := stdout.Read(buf)
    os.Stdout.Write(buf[:n])
}
```

使用 ioutil 來讀取檔案，將讀取到的 byte 資訊用 json.Unmarshal 反序列化，轉成人眼能看懂的結構，或者講更明白，賦值給 fileConfig 這個變數。接著，就能使用 fileConfig 內的 Filename 來讀取檔案了。

觀察執行結果

```bash
go run cmd/main.go
Hello, world
This is file 1
```

好的，不用每次都帶 option 了。

## 小結

用簡單的命令行工具，來當 Golang 的入門熱身，可以看到 Golang 跟 C 語言些相同的地方，例如它們都是靜態語言，可讀性跟可維護性較腳本語言更好，適合開發大型程式。但是 Golang 相對於 C，有幾項優點

* 支援多重回傳值，有效解決 C 語言函式輸入輸出語意模糊的問題
* 標準庫更強大，例如 flags 或是 ioutil，讓開發者能更專注於開發
* 支援垃圾回收，同樣也讓開發者更專注於應用
* 跨平台，這對當前的應用環境很重要，你絕對不希望換個作業系統要重寫一次程式碼
* 工具齊全，有時候有點太齊全了，例如強制性的語法靜態檢查
* 編譯速度快如閃電

作為 Google 力推的程式語言，Golang 可以挖掘的地方還有很多，像是它最重要的賣點 Goroutine，很適合開發高併發程式；它的精簡語法也適合開發微服務。我們可以想像它是因應雲端世代而產生的新工具。

## Reference

- [Standard Go Project Layout](https://github.com/golang-standards/project-layout)
- [A Tour of Go](https://tour.golang.org/list)
