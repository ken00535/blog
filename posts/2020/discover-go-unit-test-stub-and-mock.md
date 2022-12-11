---
title: 初探 Go 的單元測試：兼談 Stub 跟 Mock
description: 測試是程式的防護網，能確保程式符合設計。而針對測試中包含第三方依賴的情境，可以用 Stub 或 Mock 來解耦，讓商業邏輯跟底層套件分開。本文會用 ORM 當例子，介紹 Golang 的 Stub 跟 Mock，並實作三種不同方式的測試。…
date: 2020-11-22
scheduled: 2020-11-22
tags:
  - Go
  - Test
layout: zh-tw/layouts/post.njk
---

測試是程式的防護網，能確保程式符合設計，而當開發者需要對程式進行重構，以增進品質時，測試也可以確保程式不會出現改 A 壞 B 的情況。從商業角度來看，測試能降低維護與改善程式的成本，進而提高軟體開發的競爭力。

既然測試這麼好，那為什麼常看到軟體專案中沒有測試？在我的經驗中，主要原因有兩個：首先是軟體開發初期，架構還不是很穩定，API 隨時有可能改變，在 API 不穩時，如果就開始寫大量測試，會造成後面很大的維護成本，試著想想，API 的改變，可能就牽涉到測試流程跟測試資料的改變，而之前的 Corner Case 很可能都變成沒有價值的投資，在這情況下寫測試沒有意義。

再來，程式中可能會引用到第三方套件，例如 ORM 或 HTTP 之類的外部依賴，如果要實際測試，就會需要建構測試環境，而這些也會有建置與維護成本，像是網路斷掉，可能就會在程式邏輯沒動到的狀況下，讓 HTTP 的測試失效，這些維護成本會讓寫測試的投資報酬率看起來不太划算。

前一個問題需要仰賴架構設計，暫且不談；而針對測試中包含第三方依賴的情境，可以用 Stub 或 Mock 來解耦，讓商業邏輯跟底層套件分開。本文會用 ORM 當例子，介紹 Golang 的 Stub 跟 Mock，並實作三種不同方式的測試。需要 Clone 程式碼的，可以到[這裡](https://github.com/ken00535/golang-medium-example)。

## Basic Test

身為現代的程式語言，Golang 有內建自己的測試框架與命令行工具，假設專案架構是

```
.
├── README.md
└── pkg
    └── foo
        ├── foo.go
        └── foo_test.go
```

其中 foo.go 是程式邏輯，而 foo_test.go 則是測試用的程式。在 Golang 的專案中，測試程式都用 _test.go 結尾，方便命令行工具辨認。

來看主程式

```go
func fooBasic(num1 int, num2 int) int {
    return num1 + num2
}
```

內有 fooBasic，將兩個參數相加後返回。

對應的測試程式 foo_test.go 可以是

```go
package foo

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestFooBasic(t *testing.T) {
    expect := 2
    actual := fooBasic(1, 1)
    assert.Equal(t, expect, actual)
}
```

所有單元測試都用 Test 當開頭，內部的 testing.T 用來記錄測試上下文。單元測試內會 call fooBasic，得到的值再跟期望值比較，如果相同代表測試通過。

```go
assert.Equal(t, expect, actual)
```

因為 Golang 內建的斷言庫不是很豐富，建議使用第三方斷言庫來做 assert，安裝用

```bash
go get -u "github.com/stretchr/testify/assert"
```

之後可以用 go test 來執行測試

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-golang/gotest$ go test ./...
ok      example/gotest/pkg/foo  0.005s
```

看到測試通過。

假設將期望值改成錯的，則會得到錯誤訊息

```bash
ken@DESKTOP-2R08VK6:~/git/medium-example-golang/gotest$ go test ./...
--- FAIL: TestFooBasic (0.00s)
    foo_test.go:17: 
                Error Trace:    foo_test.go:17
                Error:          Not equal: 
                                expected: 1
                                actual  : 2
                Test:           TestFooBasic
FAIL
FAIL    example/gotest/pkg/foo  0.016s
FAIL
```

## Stub

知道怎麼建立基礎測試後，回到本文的主題：如果有第三方依賴的話，應該如何去進行測試呢？可想而知，除了少數特例，我們不會希望真的執行底層命令。最直觀的做法，是把第三方的程式碼換掉，讓相同名字的函式對應到不同的邏輯內容。用專業術語來講，叫做 Stub。

在 C 語言，我們可以用 Linker 連結不同的原始碼來達成這件事。但由於 Golang 已經將 Linker 處理掉了，要思考的角度應該轉變成是，從應用的層面，如何對第三方解耦。其實解法也算單純，因為 Golang 可以支援函式變數，因此只要在測試時，將函式變數的值換掉即可。

來看主程式

```go
package foo

import (
    "time"

    "github.com/jinzhu/gorm"
)

type User struct {
    gorm.Model
    Name     string
    Age      int
    Birthday time.Time
}

func fooDatabaseCaseByValueFunc() int {
    return getUserAgeValueFunc()
}

var getUserAgeValueFunc = func() int {
    var user User
    db, err := gorm.Open("postgres", "host=myhost user=gorm dbname=gorm sslmode=disable password=mypassword")
    if err != nil {
        panic("connect fail")
    }
    res := db.First(&user)
    if res.Error != nil {
        panic("error")
    }
    db.Close()
    return user.Age
}
```

這段程式碼負責在 Database 中查詢 User 的資料，ORM 是使用 gorm（不知道如何使用的人，可以看[這篇](/posts/2020/gorm-from-init-to-use)來複習）。將 ORM 相關的程式碼都抽出成函式，並 Assign 給 getUserAgeValueFunc，再在 fooDatabaseCaseByValueFunc 中調用並返回查詢結果。

測試程式則是

```go
package foo

import (
    "testing"
    "github.com/prashantv/gostub"
    "github.com/stretchr/testify/assert"
)

func TestFooDatabaseByValueFunc(t *testing.T) {
    want := 1
    stub := gostub.Stub(&getUserAgeValueFunc, func() int {
        return 1
    })
    defer stub.Reset()
    actual := fooDatabaseCaseByValueFunc()
    assert.Equal(t, want, actual)
}
```

gostub.Stub 這套函式庫可以取代任意的變數，等到測試完成後，再將變數還原。

使用時，用

```go
stub := gostub.Stub(&getUserAgeValueFunc, func() int {
    return 1
})
```

來對 getUserAgeValueFunc 進行取代，將它取代成

```go
func() int {
    return 1
}
```

固定返回 1 這個值，等到執行完成後，再調用 Reset 還原

```go
defer stub.Reset()
```

如此就能做到 Stub 了。

## Monkey Patch

但是等等，依照 Step 2 的方式，豈不是每個 Func 都要改成變數，才能換成 Stub？因為要測試，所以需要動到 Production Code，這樣不是前後關係倒置了嗎？是的，所以 gostub.Stub 的方式，又叫做侵入式。好的，既然有侵入式，那也有非侵入式，我們可以來嘗試 monkey 這套函式庫。

monkey 可以幫助 Golang 的開發者做 Monkey Patch，依照 [TechBridge](https://blog.techbridge.cc/2018/07/14/python-monkey-patch/) 的解釋，Monkey Patch 是

> Monkey Patch 就是在 run time 時動態更改 class 或是 module 已經定義好的函數或是屬性內容。

簡單來說，就是在 runtime 改變函式行為。Monkey Patch 的底層也不複雜，是使用 reflect 來實現。

要安裝 Monkey Patch，用

```bash
go get -u bou.ke/monkey
```

回到主程式本身，修改原先 foo.go 的調用方式

```go
func fooDatabaseCaseByFunc() int {
    return getUserAgeFunc()
}

func getUserAgeFunc() int {
    var user User
    db, err := gorm.Open("postgres", "host=myhost user=gorm dbname=gorm sslmode=disable password=mypassword")
    if err != nil {
        panic("connect fail")
    }
    res := db.First(&user)
    if res.Error != nil {
        panic("error")
    }
    db.Close()
    return user.Age
}
```

改成不要使用變數來調用。

接著修改測試程式

```go
func TestFooDatabaseByFunc(t *testing.T) {
    want := 1
    patch := monkey.Patch(getUserAgeFunc, func() int {
        return 1
    })
    defer patch.Restore()
    actual := fooDatabaseCaseByFunc()
    assert.Equal(t, want, actual)
}
```

同樣是測試結束後，用 Restore 還原，不同的是，這次可以直接修改函式，而不用將函式指定給變數了。

既然可以修改函式，那有沒有可能修改第三方函式庫呢？當然也可以。假設不要透過函式調用，而是直接使用第三方函式庫的話，foo.go 會是

```go
func fooDatabaseCaseDirectCall() int {
    var user User
    db, err := gorm.Open("postgres", "host=myhost user=gorm dbname=gorm sslmode=disable password=mypassword")
    if err != nil {
        panic("connect fail")
    }
    res := db.First(&user)
    if res.Error != nil {
        panic("error")
    }
    db.Close()
    return user.Age
}
```

同時，測試會變成

```go
func TestFooDatabaseByMonkeyPatch(t *testing.T) {
    want := 1
    user := User{Age: 1}
    db := &gorm.DB{}
    patch := monkey.Patch(gorm.Open, func(string, ...interface{}) (*gorm.DB, error) {
        return db, nil
    })
    patchFirst := monkey.PatchInstanceMethod(reflect.TypeOf(db), "First", func(_ *gorm.DB, out interface{}, _ ...interface{}) *gorm.DB {
        val := reflect.ValueOf(out).Elem()
        substitute := reflect.ValueOf(user)
        val.Set(substitute)
        return db
    })
    patchClose := monkey.PatchInstanceMethod(reflect.TypeOf(db), "Close", func(*gorm.DB) error {
        return nil
    })
    defer func() {
        patch.Restore()
        patchFirst.Restore()
        patchClose.Restore()
    }()
    actual := fooDatabaseCaseDirectCall()
    assert.Equal(t, want, actual)
}
```

可以看到會需要先 Patch gorm.Open

```go
patch := monkey.Patch(gorm.Open, func(string, ...interface{}) (*gorm.DB, error) {
    return db, nil
})
```

再 Patch 返回的物件方法

```go
patchFirst := monkey.PatchInstanceMethod(reflect.TypeOf(db), "First", func(_ *gorm.DB, out interface{}, _ ...interface{}) *gorm.DB {
    val := reflect.ValueOf(out).Elem()
    substitute := reflect.ValueOf(user)
    val.Set(substitute)
    return db
})
```

最後再 Patch gorm.Close

```go
patchClose := monkey.PatchInstanceMethod(reflect.TypeOf(db), "Close", func(*gorm.DB) error {
    return nil
})
```

結束前記得要還原

```go
defer func() {
    patch.Restore()
    patchFirst.Restore()
    patchClose.Restore()
}()
```

可以看到測試邏輯變得很不清晰，大多時間都在 Patch 第三方套件，因此從測試的觀點來說，最好還是將第三方套件相關的東西抽出成函式，讓程式具備更好的可測試性。

## Mock

Stub 可以將函式的行為給換掉，但如果想要追求更高的互動性，例如驗證函式的傳入參數是否跟預期相同，或是函式被調用的次數是不是預期的次數，這時就需要個跟真實物件很像的偽物，來做參數跟調用驗證。這個偽物在技術上，稱為 Mock。

在 Golang 的語境中，Stub 跟 Mock 的差異，可以簡單認為

* Stub 是換掉原先的變數
* Mock 是對同樣 Interface 的不同實現

什麼叫對同樣 Interface 的不同實現？Talk is cheap, show me the code，主程式是

```go
type User struct {
    gorm.Model
    Name     string
    Age      int
    Birthday time.Time
}

// Database is database
type Database interface {
    First(interface{})
}

func fooDatabaseCaseIndirectCall(db Database) int {
    var user User
    db.First(&user)
    return user.Age
}
```

函式接受一個參數傳入，該參數是 Database 這個 Interface。這裡涉及到一項重要的差異，在設計函式時，需要以 Interface 來實現，從 Golang 的角度來看，這才是解耦的根本之道，函式跟函式用 Interface 來溝通，而不是跟專用的 Instance 溝通，如此一來，函式之間就可以不存在依賴關係。

既然說到 Mock 是對 Interface 的不同實現，當然要來設計個 Mock，新增檔案 foo_self_mock.go

```
.
├── README.md
└── pkg
    └── foo
        ├── foo.go
        ├── foo_self_mock.go
        └── foo_test.go
```

內容是

```go
package foo

type dbMock struct{}

func newDbMock() *dbMock {
    return &dbMock{}
}

func (d *dbMock) First(out interface{}) {
    out.(*User).Age = 1
}
```

該 Mock 實現 Database，並將 First 傳入參數的值修改成 1。

回到測試程式，會變成

```go
func TestFooDatabaseCustomMock(t *testing.T) {
    want := 1
    m := newDbMock()
    actual := fooDatabaseCaseIndirectCall(m)
    assert.Equal(t, want, actual)
}
```

用 newDbMock 取得 Mock，再將該 Mock 傳進函式中，給函式進行調用，由於調用後會得到 1 的結果，這項測試就可以 Pass 了。

Mock 最簡單的概念就是這樣，在 Golang 官方維護的庫中，也有 Mock 用的工具 gomock，用來自動產生 Mock 程式碼。要使用 gomock，可以先安裝

```bash
go get -u github.com/golang/mock/mockgen
```

再使用它的命令行工具

```bash
mockgen -destination foo_mock.go -source foo.go -package foo
```

mockgen 會去讀取 -source 指定檔案中的 interface，再產生對應的程式碼

```go
// Code generated by MockGen. DO NOT EDIT.
// Source: foo.go

// Package foo is a generated GoMock package.
package foo

import (
    gomock "github.com/golang/mock/gomock"
    reflect "reflect"
)

// MockDatabase is a mock of Database interface
type MockDatabase struct {
    ctrl     *gomock.Controller
    recorder *MockDatabaseMockRecorder
}

// MockDatabaseMockRecorder is the mock recorder for MockDatabase
type MockDatabaseMockRecorder struct {
    mock *MockDatabase
}

// NewMockDatabase creates a new mock instance
func NewMockDatabase(ctrl *gomock.Controller) *MockDatabase {
    mock := &MockDatabase{ctrl: ctrl}
    mock.recorder = &MockDatabaseMockRecorder{mock}
    return mock
}

// EXPECT returns an object that allows the caller to indicate expected use
func (m *MockDatabase) EXPECT() *MockDatabaseMockRecorder {
    return m.recorder
}

// First mocks base method
func (m *MockDatabase) First(arg0 interface{}) {
    m.ctrl.T.Helper()
    m.ctrl.Call(m, "First", arg0)
}

// First indicates an expected call of First
func (mr *MockDatabaseMockRecorder) First(arg0 interface{}) *gomock.Call {
    mr.mock.ctrl.T.Helper()
    return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "First", reflect.TypeOf((*MockDatabase)(nil).First), arg0)
}
```

跟我們剛剛自製的 mock 大致上類似，不同的是還有 Expect 跟 Recorder，這裡可以理解為支援參數驗證，預期的驗證行為會被記錄在 Recorder，而正式的調用行為則會用 Mock 的 First 來調用。落實到測試程式上，則是

```go
func TestFooDatabaseGomock(t *testing.T) {
    want := 1
    var user User
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    m := NewMockDatabase(ctrl)
    m.EXPECT().First(gomock.Eq(&user)).SetArg(0, User{Age: 1})
    actual := fooDatabaseCaseIndirectCall(m)
    assert.Equal(t, want, actual)
}
```

為了產生 Mock，要先產生一個 controller 當參數

```go
ctrl := gomock.NewController(t)
```

controller 在結束時，會用 Finish 來驗證所有的調用行為

```go
defer ctrl.Finish()
```

將 controller 傳給 NewMockDatabase，得到 mock，並為 mock 設定預期跟回傳參數

```go
m := NewMockDatabase(ctrl)
m.EXPECT().First(gomock.Eq(&user)).SetArg(0, User{Age: 1})
```

同樣將 mock 傳入調用，得到結果並驗證

```go
actual := fooDatabaseCaseIndirectCall(m)
assert.Equal(t, want, actual)
```

可以看到用 Mockgen 建立的 mock 具備更高的互動性，可以依照開發者的需求來客制化行為。

## 小結

介紹完 gostub、monkey 跟 gomock 三套函式庫後，來簡單做個結論。原則上，因為 gostub 是侵入式，會影響到原本的 Production code，基本上可以不用考慮，它的功用完全可以用 monkey 來取代。

而 gomock 的確很棒，能驗證互動行為，但這是建立在 Production code 用 interface 當參數的前提下，問題是，如果不是要做成函式庫，開放給其他人調用，而僅僅是應用程式內部使用的話，幾乎不太可能用 interface 當傳入參數。因為優點同時也是缺點，為了解耦依賴，必須要先在一個不同的地方實現 instance，再進行依賴注入，這會讓調用者的邏輯變得很複雜，每次要 call method 前，都要先把依賴 new 出來。再來，使用 interface 最直接的後果，就是沒辦法做 code nevigation，當只是要做個簡單的 function 時，用 Mock 的代價未免高了點。

我的建議是，盡可能將第三方的呼叫都封裝到函式中，不要直接寫在 Production code，這會大幅降低 Stub 的成本；再來，如果不是特殊需求，盡量少用 Mock，它的行為太複雜，會讓 test 變得不像 test。如果可以，我們應該要由程式架構來解決測試的複雜度。

## Reference:

- [bouk/monkey: Monkey patching in Go — GitHub](https://github.com/bouk/monkey)
- [prashantv/gostub: gostub is a library to make … — GitHub](https://github.com/prashantv/gostub)
- [golang/mock: GoMock is a mocking framework for the … — GitHub](https://github.com/golang/mock)
- [Python Monkey Patch 入門教學 — TechBridge 技術共筆部落格](https://blog.techbridge.cc/2018/07/14/python-monkey-patch/)
