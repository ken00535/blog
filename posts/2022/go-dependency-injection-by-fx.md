---
title: 用 Fx 來替 Go 依賴注入吧
description: 相信平常開發時，即使沒真的用到，也會聽別人提起「依賴注入」的概念。我們都知道依賴注入的目的是解耦模組間的依賴，但具體來說，依賴注入應該要怎麼進行呢？Go 對於依賴注入有什麼比較好的實踐呢？這篇就來談談 Go 相關的依賴注入話題。…
date: 2022-09-04
scheduled: 2022-09-04
tags:
  - Go
layout: zh-tw/layouts/post.njk
---

相信平常開發時，即使沒真的用到，也會聽別人提起「依賴注入」的概念。我們都知道依賴注入的目的是解耦模組間的依賴，但具體來說，依賴注入應該要怎麼進行呢？Go 對於依賴注入有什麼比較好的實踐呢？這篇就來談談 Go 相關的依賴注入話題。

## 常見的實踐方式

講到依賴注入，從 OOP 的觀點來看，可以回到 Martin Fowler 的 SOLID 原則，其中的 Dependency Inversion Principle 落實到編程中，就是依賴注入。James Grenning 曾經簡單扼要說明 DIP 原則的出發點

> Martin tells us that high-level modules shouldn’t depend on low-level modules.

這裡，高層級的模組指的是商業邏輯的實現。依賴反轉原則之所以重要，在於它隔離了抽象與實作，高階層只定義抽象，所以可以快速完成。而低階再視高階需求來完成實作，讓抽換修改的彈性增加。重點會放在如何去定義抽象，而不是定義實作。

假設我們有個模組，稱為 app，負責商業邏輯；而有另一個模組，稱為 db，負責底層實現，那麼，依賴注入的用法會類似這樣

```go
package main

import (
    "playground/internal/app"
    "playground/internal/db"
)

func main() {
    db := db.NewDatabase()
    app := app.NewApp(db)
    app.Run()
}
```

很單純吧，先後建立兩個實例，app 實例包含 db 實例，兩個實例間透過 interface 來溝通，在 main func 進行組合。組合完成後，就可以呼叫 app.Run 來執行程式。

具體來看 app 跟 db 的 New func 是

```go
package app

import "playground/internal/entity"

type app struct {
    db entity.DatabaseInterface
}

func NewApp(db entity.DatabaseInterface) *app {
    return &app{db: db}
}

func (a *app) Run() {
    a.db.Save()
}
```

重點是 arg 需要使用 interface 來定義，同樣的，db 的 return 也要使用 interface

```go
package db

import "playground/internal/entity"

type database struct{}

func NewDatabase() entity.DatabaseInterface {
    return &database{}
}

func (d *database) Save() {}
```

可以理解成，把實例從原本的模組搬出來，再搬進去 app 中，給 app 呼叫。在這過程中，app 不需要知道原本的樣子，只需要知道呼叫的方式。

## 框架的用途

雖然依賴注入的概念很單純，但當依賴的項目變多時，管理上會慢慢變得棘手。在剛剛的例子中，只有 app 依賴 db，假設現在 app 需要爬 10 不同的網站的資料，每個網站需要一套解析資料的邏輯呢？或者，依賴內又存在依賴關係，像是 A -> B -> C，成為 chain 的結構呢？如果依賴不僅存在於啟動，也要在結束程式時，套用 Graceful shutdown 的方式依照順序來結束呢？當你面對複雜的應用情境，就是框架出馬的時候了。

有些框架會內建依賴注入，像是 Angular

> 元件應該把諸如從伺服器獲取資料、驗證使用者輸入或直接往控制檯中寫日誌等工作委託給各種服務。透過把各種處理任務定義到可注入的服務類別中，你可以讓它被任何元件使用。 透過在不同的環境中注入同一種服務的不同提供者，你還可以讓你的應用更具適應性。
>
> Angular 不會強迫你遵循這些原則。Angular 只會透過依賴注入來幫你更容易地將應用邏輯分解為服務，並讓這些服務可用於各個元件中。

這裡引入另一個重要的概念，SRP，依賴注入可以將 Component 中跟責任無關的輔助邏輯分離開來，讓元件專注於元件本身，從而提高可用性。這不是強制的，開發者仍然應該視自己的專案選擇技術實踐，框架提供的是「選擇」，而不是限制開發者的自由。

當然，作為一個標榜「simple」的語言，Golang 同樣沒有內建框架，但這並不意味著開發者需要自造輪子，常用的依賴注入框架，有 Google 的 wire （是的，即使是跟 Go 關係密切的 Google，也設計一套了框架來讓開發變得更有效率）跟 Uber 的 Fx。兩者的差別，在於 wire 是使用 Code Gen 的方式，而 Fx 則是使用 Reflection，在執行期動態判斷型別。

我覺得選擇哪套框架的差別不大，因為現在的公司用 Fx，這邊也主要介紹 Fx。

### Fx 要怎麼用？

Fx 是由 uber 開源的一套依賴注入框架，用來幫開發者管理上述提到的種種問題，GitHub Repo 的說明寫得很簡潔清晰

> An application framework for Go that:
>
>．Makes dependency injection easy.
>．Eliminates the need for global state and func init().

首先讓依賴注入更簡單，其次降低 init() 的使用。我覺得第二點可以多講講，依照 Go 的設計，如果 pakcage 中有 init()，會在 process 運行時先被呼叫，順序則是依照 import 的順序。這意味著，當你的專案存在多重引用關係時，幾乎無法預期 init() 被呼叫的正確時間，從而沒辦法用正確的順序載入依賴。

在 uber 的 Coding Style Guide 也明確說明 init() 是個反模式

> Avoid init()
>
> Avoid init() where possible. When init() is unavoidable or desirable, code should attempt to:
>
> 1. Be completely deterministic, regardless of program environment or invocation.
> 2. Avoid depending on the ordering or side-effects of other init() functions. While init() ordering is well-known, code can change, and thus relationships between init() functions can make code brittle and error-prone.
> 3. Avoid accessing or manipulating global or environment state, such as machine information, environment variables, working directory, program arguments/inputs, etc.
> 4. Avoid I/O, including both filesystem, network, and system calls.

盡管有些狀況仍需要使用 init()，但使用依賴注入框架，可以幫助開發者避免用不正確的方式做事

Fx 用來管理依賴的方式跟容器有點像，首先用 New 產生 Fx 的 app 實例，告知需要的 New func，app 在執行前會呼叫 invoke 的 func，並載入相關的實例，完成依賴注入

```go
package main

import (
    "playground/internal/app"
    "playground/internal/db"

    "go.uber.org/fx"
)

func main() {
    fxApp := fx.New(
        fx.Provide(
            db.NewDatabase,
            app.NewApp,
        ),
        fx.Invoke(app.Run),
    )
    fxApp.Run()
}
```

Provide 用來告知如何產生要被注入的的實例，由於 Fx 的設計是 Lazy Loading，僅僅只是在 Provide 聲明還不會被使用，需要透過 Invoke 喚起 func，明確表示需要該依賴，Provide 中的 func 才會被調用。

大致上，流程可以看成是 Run() -> Invoke() -> Provide() 的順序。

對應到原本的範例，我們要放入 Provide 的是 db 跟 app 的 New func，要放進 Invoke 是 app 的 Run func，當執行 Fx 的 Run 時則會顯示加載訊息

```go
go run ./app

[Fx] PROVIDE    entity.DatabaseInterface <= playground/internal/db.NewDatabase()
[Fx] PROVIDE    *app.App <= playground/internal/app.NewApp()
[Fx] PROVIDE    fx.Lifecycle <= go.uber.org/fx.New.func1()
[Fx] PROVIDE    fx.Shutdowner <= go.uber.org/fx.(*App).shutdowner-fm()
[Fx] PROVIDE    fx.DotGraph <= go.uber.org/fx.(*App).dotGraph-fm()
[Fx] INVOKE             playground/internal/app.Run()
hello
[Fx] RUNNING
```

當然 Fx 還有一些進階功能，像是 Logger 的客製化，可以用來將 log 轉換成 ELK 可以接受的格式；解構賦值跟 Supply func，可以用來處理 config 的加載，這邊就有興趣的人自行研究啦。

## 結語

我以前都是手動處理，直到現在的工作，才發現還有依賴注入框架這東西。Fx 吸引我的點，大概是它還能管理生命週期，用來設計 Graceful shutdown 很好用。

但如果談到是否在專案中正式導入，我覺得是件值得思考的事。Fx 在開發上有幾個小問題：(1) 因為是在執行期才注入，會降低問題反應時間，有時忘記在 main 加入 New func，要等到 run 起來 panic 才知道；(2) 預設的 debug log 不是太友善，需要花點時間理解；(3) 如果使用到進階功能，像是 annotation，要再花時間理解相關用法。這幾項也跟團隊目前的技術能力息息相關。

對資深工程師來說，依賴注入或許是個簡單概念，使用框架時，能很容易映射使用方式與設計原理。但對不熟悉依賴注入的人來說，會需要花點工夫理解背後的思維。單純看程式碼，其實不容易看懂，例如 fx 背後是透過 Reflection 來實作依賴注入，即使在執行期 step into 執行，也不容易知道反射背後對到的是哪個 New func。

框架的目的是協助工程師，如果不知道需要什麼協助，用框架也幫不上忙，說不定還會綁手綁腳，我猜這樣聽起來有點無趣，但也或許這才是最實際的想法。技術管理有它的成本跟效益，如果能的話，當然還是建議依照正規方法來設計，不能的話，當專案規模小的時候，直接使用手動注入而不使用框架，也不失為一個折衷的方式。

## Reference

- [https://github.com/uber-go/fx](https://github.com/uber-go/fx)
- [https://v6.angular.cn/guide/architecture-services](https://v6.angular.cn/guide/architecture-services)
