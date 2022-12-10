---
title: Go 的泛型替代方案：型別斷言與代碼生成
description: 在 The Next Step for Generics 這篇文章中，Golang 有公開泛型的草稿，但至少到 1.15 為止，實務上仍需要仰賴別的方式來達到接近的效果。本篇會分別用型別斷言(type assertion)跟 genny 這套 Golang 開源函式庫，來試著實現一些基本函式，看看 Golang 如何處理泛型問題...
date: 2020-09-19
scheduled: 2020-09-19
tags:
  - Go
layout: zh-tw/layouts/post.njk
---

用函數式編程(Functional Programming)的風格寫程式時，會常常重複使用一些通用函式，舉個例子，假設有個 array，開發者需要從該 array 中篩選符合條件的元素，重新組成新的 array。合理的情況是，如果有個 filter 函式，只需要設定條件，剩下的事情都能交給語言處理。

Golang 的 append 有點這味道，類似 JavaScript 的 push，能新增 slice 中的元素，但 Golang 畢竟不是徹底的函數式語言，內建函式庫中沒有 filter、map、reduce 等等 array 常用的函式。如果想要自行實現，語言的強型別系統會要求開發者在使用前告知對象型別，這等於是對不同的型別都要實現幾乎相同的函式，可想而知不切實際。

同樣是強型別語言，C++ 或 C# 在面對這問題時，是靠著泛型(Generic)來解決；在 [The Next Step for Generics](https://blog.golang.org/generics-next-step) 這篇文章中，Golang 有公開泛型的草稿，但至少到 1.15 為止，實務上仍需要仰賴別的方式來達到接近的效果。本篇會分別用型別斷言(type assertion)跟 genny 這套 Golang 開源函式庫，來試著實現一些基本函式，看看 Golang 如何處理泛型問題。

需要 Clone 程式碼的，可以到[這裡](https://github.com/ken00535/golang-medium-example)。

## Establish a Filter Function

專案結構如下

```
project
├── cmd
│   └── genny
│       └── main.go
├── pkg
│   └── genny
│       └── genny.go
├── scripts
├── go.mod
├── Makefile
└── README.md
```

先來看 pkg 內的 genny.go

```go
package genny

// Filter filter slice
func Filter(source []int, callback func(int) bool) []int {
    var out []int
    for _, element := range source {
    if callback(element) {
    out = append(out, element)
    }
    }
    return out
}
```

我們的目標是設計 Filter 函式，該函式可用來篩選 slice。使用者傳入 slice 跟 callback function，遍歷 slice，使用 callback 看結果。如果 callback 結果是 true，代表 element 符合篩選的條件，將 element 加入新的 slice，最後將新的 slice 傳送回去。

因為 Golang 是強型別語言，在設計函式時需要宣告參數型別，在上面的設計中，型別是 int，這也代表該函式只能用於 int[]。

來看 cmd 中的使用方式

```go
package main

import (
    "example/pkg/genny"
    "fmt"
)

func main() {
    num := []int{1, 3, 5, 7, 9, 11}
    // filter by static filter
    num = genny.Filter(num, func(element int) bool {
    if element < 6 {
        return true
    }
    return false
    })
    fmt.Println(num)
}
```

有個 slice，其中包含 {1,3,5,7,9,11}，判斷條件是 element 小於 6，就將它放到新的 slice 中。執行結果是

```bash
ken@DESKTOP:~/git/medium-example-golang$ ./bin/genny 
[1 3 5]
```

這樣就能完成 slice 的篩選。

## Using Type Assertion

如前面提到的，Filter 函式因為需要宣告型別，只能用於 int[]。實際情境裡，開發者可能會需要用到 string[]、float32[]，或者是自己定義的 struct[]。為每個型別個別開發 Filter，會造成大量重複代碼，修改時也要一個一個改，很花功夫。

Golang 可以用型別斷言來解決這問題。在 Golang 中，所有型別的基本型別都是 interface{}，類似 C 語言的 void。interface{} 可以容納任意型別，同時它有 var.(type)，讓開發者可以動態判斷變數型別。

修改 pkg，新增 FilterWithInterface

```go
// FilterWithInterface filter slice
func FilterWithInterface(source interface{}, callback func(interface{}) bool) interface{} {
    var outInt []int
    var outFloat32 []float32
    switch source.(type) {
    case []int:
        for _, element := range source.([]int) {
            if callback(element) {
                outInt = append(outInt, element)
            }
        }
        return outInt
    case []float32:
        for _, element := range source.([]float32) {
            if callback(element) {
                outFloat32 = append(outFloat32, element)
            }
        }
        return outFloat32
    }
    return nil
}
```

將引數型別改成 interface{}

```go
switch source.(type) {
case []int:
//...
case []float32:
//...
}
```

用 source.(type) 取得 source 的型別，並用 switch case 來進行對應處理

```go
for _, element := range source.([]int) {
    if callback(element) {
        outInt = append(outInt, element)
    }
}
return outInt
```

對於 []int 的例子，在使用時用型別斷言，指定該型別是 []int。可以把型別斷言想像成是強制轉型，斷言後語言會用 []int 來處理該變數。要特別注意的是，由於是動態判斷，它會跳過編譯器靜態檢查，如果出現型別錯誤，不會在編譯期報警，而是要到執行期才會告知。儘管 interface{} 有更高的自由度，但也會增加除錯的代價。

通常用型別斷言會搭配 switch 或斷言檢查，避免程式直接 panic，switch 前面看過了，而斷言檢查的語法是

```go
if v, ok := v.(int); !ok{
    fmt.Println("hey guys! you enter a wrong type!")
}
```

ok 如果是 true，表示型別轉換正確；反之有錯誤。

因為 pkg 修改了，cmd 也要有對應修改，改成

```go
num := []int{1, 3, 5, 7, 9, 11}
num2 := []float32{1.0, 3.0, 5.0, 7.0, 9.0, 11.0}
var out interface{}

// filter by int filter
out = genny.FilterWithInterface(num, func(element interface{}) bool {
    if element.(int) < 6 {
        return true
    }
    return false
})
fmt.Println(out.([]int))

// filter by float filter
out = genny.FilterWithInterface(num2, func(element interface{}) bool {
if element.(float32) < 6 {
        return true
    }
    return false
})
fmt.Println(out.([]float32))
```

建立 2 個 slice，1 個是 int，1 個是 float32。可以看到 FilterWithInterface 能處理這兩個不同型別的 Case。

## Using genny to Implement

型別斷言的問題是會引入執行期錯誤，同時產生多餘的開銷。在 C++ 中，會用 template 來處理類似情況，例如

```cpp
template <typename T>
T Filter(T arr, [=](auto element)){
}
```

像這類可以處理泛用型別的語法，稱為泛型。

因為要處理泛用型別，編譯時會需要做許多檢查，連帶會降低編譯速度，考量到這點，Golang 沒將泛型放進設計中。

> Generics may well be added at some point. We don’t feel an urgency for them.
> …
> Generics are convenient but they come at a cost in complexity in the type system and run-time… Meanwhile, Go’s built-in maps and slices, plus the ability to use the empty interface to construct containers mean in many cases it is possible to write code that does what generics would enable, if less smoothly.

至少在設計層面，Golang 建議用 interface{} 頂著。

好的，官方沒有工具，但如果開發者還是想要泛型怎麼辦？genny 的設計思維是，開發者可以提供函式原型(proto-type)，再使用 Code Generator 依照原型產生函式。相對原本方案要開發者一個一個處理類型，genny 用工具自動生成，省掉手動時間。

genny 的 GitHub 在[這裡](https://github.com/cheekybits/genny)。

使用前，安裝 genny 的命令行工具

```bash
go get github.com/cheekybits/genny
```

在 pkg 下新增 genny 的原型檔 source.go

```
project
├── cmd
│   └── genny
│       └── main.go
├── pkg
│   └── genny
│       ├── source.go
│       └── genny.go
├── scripts
├── go.mod
├── Makefile
└── README.md
```

內容是

```go
package genny

import "github.com/cheekybits/genny/generic"

// NOTE: this is how easy it is to define a generic type
type Something generic.Type

//FilterWithSomething filter Something type
func FilterWithSomething(source []Something, callback func(Something) bool) []Something {
    var out []Something
    for _, element := range source {
        if callback(element) {
            out = append(out, element)
        }
    }
    return out
}
```

引入 genny 專案

```go
import "github.com/cheekybits/genny/generic"
```

宣告泛用類型

```go
type Something generic.Type
```

跟類型有關的地方，都改為 Something

```go
//FilterWithSomething filter Something type
func FilterWithSomething(source []Something, callback func(Something) bool) []Something {
    var out []Something
    for _, element := range source {
        if callback(element) {
            out = append(out, element)
        }
    }
    return out
}
```

genny 產生程式碼時，會自動將關鍵字換掉，改為需要的類型。

使用命令行來執行

```bash
genny -in ./pkg/genny/source.go -out ./pkg/genny/gencode.go gen "Something=int,string,float32"
```

-in 是輸入；-out 是輸出；gen 後面接要替換的關鍵字與類型，這邊將 Something 換成 int、string、float32。

執行後產出 gencode.go，內容是

```go
// This file was automatically generated by genny.
// Any changes will be lost if this file is regenerated.
// see [https://github.com/cheekybits/genny](https://github.com/cheekybits/genny)

package genny

//FilterWithInt filter int type
func FilterWithInt(source []int, callback func(int) bool) []int {
    var out []int
    for _, element := range source {
        if callback(element) {
            out = append(out, element)
        }
    }
    return out
}

//FilterWithString filter string type
func FilterWithString(source []string, callback func(string) bool) []string {
    var out []string
    for _, element := range source {
        if callback(element) {
            out = append(out, element)
        }
    }
    return out
}

//FilterWithFloat32 filter float32 type
func FilterWithFloat32(source []float32, callback func(float32) bool) []float32 {
    var out []float32
    for _, element := range source {
        if callback(element) {
            out = append(out, element)
        }
    }
    return out
}
```

函式自動生成！得到 3 個新函式，FilterWithInt、FilterWithString、FilterWithFloat32。

回去修改 cmd，改為

```go
out = genny.FilterWithInt(num, func(element int) bool {
    if element < 6 {
        return true
    }
    return false
})
```

跟 Step 1 用法相同，只是名稱變成 FilterWithInt。

## Add go generate

用 Code Gen 的問題是需要執行命令行，在協作專案中，開發者可能不知道同伴用哪些指令來產生程式碼，這些資訊應該要能納入版本管理，讓 Code Gen 有跡可循。這時可以用 go generate。

go generate 是 Golang 內建的工具，它可以用來調用命令行指令，可以看成是 Golang 底下的 shell，用於協調 Golang 跟其他程式的互動。當執行 go generate 時，Golang 會去看專案底下的 .go 檔有沒有 go generate 的註解，如果有就依照註解來執行。

具體來說，修改 pkg 的 source.go，加入

```go
package genny

// ...

//go:generate genny -in ./source.go -out ./gencode.go gen "Something=int,string,float32"

// ...
type Something generic.Type
```

在 shell 輸入

```bash
go generate ./...
```

Golang 讀到 go:generate 開頭的註解，就會執行後面的命令，如果像我一樣，習慣用 Make 來編譯的話，可以將 Makefile 改成

```makefile
all: ${OUT_DIR} ${FILES_OUT:=.exe}

${OUT_DIR}/%:
    go generate ./... 
    go build -o $(@) ./cmd/$(basename ${[@F](http://twitter.com/F)})
```

在 go build 前執行 go generate，就能串起編譯流程。

## 小結

比較幾個方案，我自己是傾向用型別斷言。開發者調用函式時，不用思考需要用 FilterWithString 還是 FilterWithFloat32，看起來更直覺，也更接近 C++ 的泛型。相對的，缺點是不知道傳入的型別，容易引發執行期錯誤；genny 則是嘗試用 Golang 的基本語法，解決掉泛型的問題。

嚴格說來，兩種解法都不能取代真正的泛型。在注重生產力的現代語言環境中，沒有泛型真的是件頗奇怪的事。我猜 Golang 看重編譯速度，應該還是跟 Monorepo 的管理方式有關？

## Reference

- [The Next Step for Generics](https://blog.golang.org/generics-next-step)
- [Frequently Asked Questions (FAQ)](https://golang.org/doc/faq#generics)
- [https://github.com/cheekybits/genny](https://github.com/cheekybits/genny)
