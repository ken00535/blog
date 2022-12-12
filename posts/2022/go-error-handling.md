---
title: 如何優雅包裝錯誤：聊聊 Go 的 error
description: 錯誤處理是 Golang 最常被討論的一個點。這有幾個因素，首先，這跟它「錯誤是值」的設計理念有關，開發者需要在業務流程中穿插錯誤處理，違反關注點分離的原則，當然會引發爭議。另外，在 1.13 前，Golang 標準 errors 庫的表現力有限，當需求較為複雜時，需要開發者自行發明錯誤處理輔助函式。這讓人不禁好奇，Golang 的錯誤處理設計原則是什麼？有沒有比較好的實踐？或者說，我們能不能找到一種方式，優雅地處理錯誤？…
date: 2022-10-16
scheduled: 2022-10-16
tags:
  - Go
  - DevOps
layout: zh-tw/layouts/post.njk
---

錯誤處理是 Golang 最常被討論的一個點。這有幾個因素，首先，這跟它「錯誤是值」的設計理念有關，開發者需要在業務流程中穿插錯誤處理，違反關注點分離的原則，當然會引發爭議。另外，在 1.13 前，Golang 標準 errors 庫的表現力有限，當需求較為複雜時，需要開發者自行發明錯誤處理輔助函式。這讓人不禁好奇，Golang 的錯誤處理設計原則是什麼？有沒有比較好的實踐？或者說，我們能不能找到一種方式，優雅地處理錯誤？

## 錯誤與異常

先來看看不同人的觀點，Robert Martin 在討論到錯誤處理時，是如此建議的

> 使用異常替代返回錯誤碼，錯誤處理代碼就能從主路徑代碼中分離出來，得到簡化

他給出的例子是

```java
try {
    deletePage(page);
    registry.deleteReference(page.name);
    configKeys.deleteKey(page.name.makeKey());
} catch (Exception e) {
    logger.log(e.getMessage());
}
```

Martin 指的是 Try Catch 模型。在 Try Catch 中，錯誤由函式中拋出，並在上層的處理函式中接住，進行處理。如 Robert Martin 講的，Try Catch 的主路徑跟錯誤處理代碼分開在不同區塊，這樣的好處是能讓責任明確。

而 Golang 的錯誤處理方式則是

```go
f, err := os.Open("filename.ext")
if err != nil {
    log.Fatal(err)
}
// do something with the open *File f
```

很明顯的，主路徑跟錯誤處理會放在同一個區塊，可讀性沒有 Try Catch 來好。Rob Pike 對這問題曾經發表過一些意見

> In other languages, one might use a try-catch block or other such mechanism to handle errors. Therefore, the programmer thinks, when I would have used a try-catch in my old language, I will just type if err != nil in Go. Over time the Go code collects many such snippets, and the result feels clumsy.

這段話講的有些曖昧，大致來說，Rob Pike 認為這問題的關鍵是，開發者使用了舊的習慣來開發 Golang，也就是說，他認為問題的解法應該要在應用端，而不是語言。

說曖昧的原因是，Pike 沒正面回答，為什麼 Golang 不支援 Try Catch？是 Try Catch 有什麼問題，或者只是 Golang 的設計者沒想到？我猜想，有個可能的原因是，Golang 嘗試區分出異常與錯誤。依照 Java 的定義，錯誤指該問題超出應用程式的處理能力，是執行期不該出現的狀況，例如 Out of Memory；而異常則是指不符合預期的情況，像是在資料庫中找不到特定的資料。對於前者，程式通常會立刻停止執行；而後者，程式會嘗試處理，給出當下可接受的回應。

在 Java 的模型中，錯誤跟異常使用同樣的方式來處理，當開發者需要明確處理異常時，他會指定 Exception 的類型，如果該類型沒有被上層的處理函式 Catch，就會繼續往上拋，直到程式錯誤。因此，這背後隱含一個邏輯，沒有被明確處理的異常就是錯誤，並帶來一個問題，由於 Exception 可以不斷上拋，使得開發者必須有意識地使用 Try Catch，否則會破壞分層原則。

相較於 Java，Golang 的設計理念更多取徑於 C 語言，C 語言常見的錯誤處理長這樣

```c
int _shutdown_mib_modules(int majorID, int minorID, void *serve, void *client) {
    // do something
    return SNMPERR_SUCCESS;
}
```

在 C 語言的慣例中，錯誤會用 status code 回傳，通常 0 是正常，而其他值代表不同的 error。在這裡，「值」是很重要的概念，儘管 C 語言是因為語言限制，被迫把 error 當值回傳，但 Golang 有意識地繼承了這項設計。 對Golang 來講，error 僅僅是一種回傳值，不會採取不同的方式來處理，而對於執行期發生的嚴重錯誤，則走 panic / recover 的機制

```go
func mayPanic() {
    panic("a problem")
}

func main() {
    defer func() {
    if r := recover(); r != nil {
        fmt.Println("Recovered. Error:\n", r)
    }
    }()
    mayPanic()
    fmt.Println("After mayPanic()")
}
```

藉由這項設計，Golang 在語言的層次上區分錯誤與異常，並要求開發者在函式返回的當下，立刻顯式處理。

## error 的實現方式

明白設計原則後，緊接而來的問題是，Golang 中的 error 是什麼？它又是如何實現？用最通俗的話來講，error 是實作 Error() 接口的結構，這是另一項設計理念「鴨子型別」的展現。對開發者來講，最簡單的方式，是使用標準庫的 errors.New 來產生 error

```go
return errors.New("this is error")
```

底層的實作則是

```go
package errors

// New returns an error that formats as the given text.
// Each call to New returns a distinct error value even if the text is identical.
func New(text string) error {
    return &errorString{text}
}

// errorString is a trivial implementation of error.
type errorString struct {
    s string
}

func (e *errorString) Error() string {
    return e.s
}
```

可以看到 errorString 本質上是個 struct，裡面帶有 text 字段儲存錯誤訊息。也因為 errors.New 回傳的是 pointer of struct，即使 text 的內容相同，兩個 error 也會被當成是不同的 error。

既然每個 error 都是不同的，那要如何確認錯誤類型呢？原理很簡單，只要同樣類型的 error 是來自同一個實例即可，例如，我們可以用 Sentinel Error 的方式，在包內部預先定義需要的 error，要使用時直接回傳，在標準庫內部常常可以看到類似的做法，像是 io.EOF

```go
var EOF = errors.New("EOF")
```

還記得「錯誤是值」嗎？開發者可以用處理值的方式來處理 error

```go
data, err := io.ReadAll(r)
if err == io.EOF {
    // error handling
}
```

這裡確實能感受到 Golang 跟 C 語言的系譜關係。

## 錯誤上下文

當我們將目光拉回開發應用場景，要求 error 資訊中需要有上下文（也就是，錯誤中包含哪些錯誤）時，我們會發現 Golang 1.13 前的標準 errors 庫能力有限，需要開發者自行實現。在 “Working with Errors in Go 1.13” 中，Damien Neil 跟 Jonathan Amsterdam 詳細說明了這個狀況

> Frequently a function passes an error up the call stack while adding information to it, like a brief description of what was happening when the error occurred. A simple way to do this is to construct a new error that includes the text of the previous one

```go
if err != nil {
    return fmt.Errorf("decompress %v: %v", name, err)
}
```

要知道上下文，只要將前面 error 的 Message 提取出來，放入新的 Message 即可。然而，也如 Damien Neil 跟 Jonathan Amsterdam 提到的，單純將資訊放在字串，會有資訊劣化的問題，如果開發者想追蹤上下文中是否存在特定的 error，改成嵌入會是更好的方式

```go
type QueryError struct {
    Query string
    Err   error
}

if e, ok := err.(*QueryError); ok && e.Err == ErrPermission {
    // query failed because of a permission problem
}
```

有人可能會問了，假如是多層嵌套的話，也需要一層一層來拆嗎？顯然的，需要有一個更簡便的方式，幫助我們返回底層錯誤，換句話說，需要把 error 的包裝跟拆裝標準化，讓我們可以用遞迴的方式來拆解 error。為了處理這問題，Golang 在 1.13 後，引入了 Unwrap function

```go
// Unwrap returns the result of calling the Unwrap method on err, if err's
// type contains an Unwrap method returning error.
// Otherwise, Unwrap returns nil.
func Unwrap(err error) error {
    u, ok := err.(interface {
        Unwrap() error
    })
    if !ok {
        return nil
    }
    return u.Unwrap()
}
```

Unwrap 檢查該 error 是否實作 Unwrap interface，如果有，就調用 Unwrap ，拆出下一層的 error。

既然有拆就有包，實作上要怎麼方便的包裝錯誤呢？自行將 error 嵌入自定義結構也是個選擇，但由於這個場景非常常見，Golang 1.13 在語言的標準庫中實現了包裝，用法是

```go
if err != nil {
    // Return an error which unwraps to err.
    return fmt.Errorf("decompress %v: %w", name, err)
}
```

當參數 %w 出現，返回的 error 會自動帶上 Unwrap func，它的內部是包裝過的 wrapError

```go
func Errorf(format string, a ...any) error {
    p := newPrinter()
    p.wrapErrs = true
    p.doPrintf(format, a)
    s := string(p.buf)
    var err error
    if p.wrappedErr == nil {
        err = errors.New(s)
    } else {
        err = &wrapError{s, p.wrappedErr}
    }
    p.free()
    return err
}
```

如此，就完成包裝拆裝的標準介面了。

當要追蹤 error 的上下文中是否包含特定的 error，我們可以先比較最外層的 error，如果不同，使用 Unwrap 拆裝後，再比較下一層的 error。Golang 1.13 同樣實現了 errors.Is function 來簡化操作

```go
// Similar to:
// if err == ErrNotFound { … }
if errors.Is(err, ErrNotFound) {
    // something wasn't found
}
```

它的實現是不停的比較跟拆包

```go
func Is(err, target error) bool {
    if target == nil {
        return err == target
    }
    isComparable := reflectlite.TypeOf(target).Comparable()
    for {
        if isComparable && err == target {
            return true
        }
        if x, ok := err.(interface{ Is(error) bool }); ok && x.Is(target) {
            return true
        }
        if err = Unwrap(err); err == nil {
            return false
        }
    }
}
```

有意思的是，在比較過程中，它不單單看 err == target，還允許開發者自定相等的條件 Is(error) bool。

## 呼叫堆疊

Golang 1.13 上下文問題的提案是參考[社群方案](https://github.com/pkg/errors)

但不知道為什麼，Golang 標準庫只採用跟上下文有關的部分，有時候我們需要更多細節，像是為了追蹤 error 產生的位置，讓開發者能快速定位錯誤，還需要 Call Stack 資訊，這時要動用另一個標準庫 runtime

```go
const depth = 32
var pcs [depth]uintptr
runtime.Callers(3, pcs[:])
```

透過呼叫 runtime.Callers，可以取得 Call Stack。回想剛剛要加入上下文資訊時，用的方式是在 struct 內嵌入 error 的字段；同樣的道理，要加入 Call Stack，也只要再多嵌入一個 stack 字段

```go
type withStack struct {
    error
    *stack
}
```

stack 是個 pointer array，存放取得的 Call Stack 資訊。儘管標準庫沒有實現上述的內容，但 pkg/errors 有幫忙做好了

```go
// customized message
err = errors.Wrapf("error num is: %d", num)

// just wrap call stack
err = errors.WithStack(err)
```

我們可以透過 WithStack func 來理解 pkg/errors 的實作方式

```go
// WithStack annotates err with a stack trace at the point WithStack was called.
// If err is nil, WithStack returns nil.
func WithStack(err error) error {
    if err == nil {
        return nil
    }
    return &withStack{
        err,
        callers(),
    }
}
```

簡單明瞭，直接將 callers 塞進去。也印出來看看效果

```go
err := errors.New("some error")
err = errors.WithStack(err)
fmt.Printf("%s\n", err.Error())
```

```bash
# console
$ go run main.go 
some error
```

咦？怎麼好像沒看到 Call Stack？這是因為 Call Stack 的資訊只是用來除錯，不會放在錯誤訊息 Error() 中，所以要印時要用 %+v

```go
err := errors.New("some error")
err = errors.WithStack(err)
fmt.Printf("%+v\n", err)
```

```bash
# console
$ go run main.go 
some error
main.main
        ken/playground/error_demo/main.go:47
runtime.main
        ken/go/src/runtime/proc.go:250
runtime.goexit
        ken/go/src/runtime/asm_amd64.s:1571
```

如果有使用 Sentry 的話，也能在 issue 中看到 Call Stack 的資訊，對除錯很有幫助，會知道錯誤發生在哪一行、前面經過哪些路徑，加上必要的參數，就能輕鬆完成錯誤定位

![](/img/posts/2022/go-error-handling/error-1.png)

## 領域 error 與 API error

接著來看題應用題。假設你跟我一樣是個後端應用開發的工程師，希望在 API 的 Error Response 中放入錯誤的詳細訊息，像是哪個參數錯誤，好讓對接的前端工程師可以用錯誤訊息進行初步判斷，但卻又不希望過度曝露系統資訊，例如完整的錯誤上下文。我們可以怎麼做？

這是個開發者體驗設計問題，具體而言，要達成的目標是：降低前端工程師的開發成本，降低後端系統除錯成本，以及隱藏不必要的資訊。因此我們從系統的角度來看，如果套用分層的概念，領域層級的 error 跟 API 層級的 error 應該要放在不同層

![](/img/posts/2022/go-error-handling/error-2.png)

領域層級的 error 用來描述符合系統使用情境的錯誤；API 層級的 error 則專注於接口設計，以 gin 當範例，兩個的關係是

```go
// httpErr represents an error that occurred while handling a request.
type httpErr struct {
    Message string `json:"message"`
}

// ErrorHandler responds error response according to given error.
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
    c.Next()
    if len(c.Errors) == 0 {
        return
    }
    err := c.Errors[0]
    var status int
    switch {
    case errors.Is(err, entity.ErrInvalidInput):
        status = http.StatusBadRequest
    case errors.Is(err, entity.ErrUnauthorized):
        status = http.StatusUnauthorized
    case errors.Is(err, entity.ErrPermissionDenied):
        status = http.StatusForbidden
    default:
        status = http.StatusInternalServerError
    }
    c.JSON(status, httpErr{Message: err.Error()})
    }
}
```

上面的設計有個小問題，httpErr 直接使用 err.Error() 當 Error Response Body，如果 err 是透過 Wrap 來包裝，Error() 可能會有上下文資訊，像是違反哪條資料庫的 Constraint，而這資訊是我們不想曝露給外部調用者的。因此如果可以，應該要對 entity.Error 再進行一次包裝，讓它分開上下文與原始 error 的資訊。

我們可以照抄 pkg/errors 的方法，但多出一個 Message function，用來提供外界訊息

```go
type AppError struct {
    cause   error
    message string
}

func (e *AppError) Error() string {
    return "app error: " + e.message + ":" + e.cause.Error()
}

func (e *AppError) Message() string {
    return e.message
}

func (e *AppError) Unwrap() error { return w.cause }

func Wrapf(err error, format string, args ...interface{}) error {
    if err == nil {
        return nil
    }
    err = &Error{
        cause:   err,
        message: fmt.Sprintf(format, args...),
    }
    return errors.WithStack(err)
}
```

在 gin 的 Middleware，先使用 errors.As() 來型別斷言，再調用 Message()，修改成

```go
err := errors.Unwrap(c.Errors[0])
var appErr entity.AppError
if errors.As(err, &appErr) {
    var status int
    switch {
    case errors.Is(appErr, entity.ErrInvalidInput):
        status = http.StatusBadRequest
    case errors.Is(appErr, entity.ErrUnauthorized):
        status = http.StatusUnauthorized
    case errors.Is(appErr, entity.ErrPermissionDenied):
        status = http.StatusForbidden
    default:
        status = http.StatusInternalServerError
    }
    c.JSON(status, httpErr{Message: appErr.Message()})
}
```

要注意這裡有個微妙的前後關係，是先意識到分層的必要性，透過分離責任來分離訊息，而不是反過來，先實作結構，再透過分離訊息來分離責任。

## 結語

簡單總結內容：error 中最重要的兩項資訊是 Error Message 跟 Call Stack，儘管 Golang 在 1.13 後的標準庫已經有加入上下文的處理，但為了更符合應用場景與節省自己的時間，還是會建議用 pkg/errors 來處理 error。

也因為 Call Stack 是重要資訊，當收到 error 的第一時間，應該用 Wrapf 重新包裝成 AppError，讓開發者後續要追蹤時，可以一路查找到底。至於 ApiError 的處理，則是放在 Middleware，讓責任可以分離得更清楚。

當然，如果你是開發 lib，就像 Golang 標準庫常見的那樣，用 Sentinel Error 就可以了。lib 應該盡可能保持簡單；而應用則是盡可能讓責任保持簡單。希望大家看完這篇文後，都能優雅地處理錯誤。

## Reference

- [Error handling and Go - The Go Programming Language](https://go.dev/blog/error-handling-and-go)
- [Errors are values - The Go Programming Language](https://go.dev/blog/errors-are-values)
- [Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors)
- [Survive under the Crap Go Error System - HackMD](https://hackmd.io/@fieliapm/SJYqZtpuv?print-pdf#/)
