---
title: Goroutine 的併發治理：值是怎麼傳遞？
description: 當併發時，每個 Goroutine 可以看成是一個個單獨的個體，他們維護著自己的 Call Stack，彼此互不干涉。如果希望這些默默運行的 Goroutine 攜手完成任務，就要在他們之間建立一種通訊方式。在 Go 中，資訊應該如何被傳遞？其中的權衡又有哪些？這篇文章會介紹 Goroutine 常用的三種值的傳遞方式，以及相關衍生議題。...
date: 2022-12-14
scheduled: 2022-12-14
tags:
  - Go
  - Concurrency
layout: zh-tw/layouts/post.njk
---

當併發時，每個 Goroutine 可以看成是一個個單獨的個體，他們維護著自己的 Call Stack，彼此互不干涉。如果希望這些默默運行的 Goroutine 攜手完成任務，就要在他們之間建立一種通訊方式。在 Go 中，資訊應該如何被傳遞？其中的權衡又有哪些？這篇文章會介紹 Goroutine 常用的三種值的傳遞方式，以及相關衍生議題。

## 使用閉包取得值

第一種方式是使用閉包。先來想想輸出應該要長怎樣，假設建立 100 個 Goroutine，每個 Goroutine 會收到一個值並印出來，傳給 Goroutine 的值應該都要不同，最後印出來的結果會是 0 到 99。這裡用 `time.Sleep` 模擬長時間的處理，用 println 印出值來觀察操作結果。程式碼是

```go
func main() {
    var wg sync.WaitGroup
    var cnt int32
    wg.Add(100)
    for i := 0; i < 100; i++ {
        go func() {
            val := atomic.AddInt32(&cnt, 1)
            println("in: ", val)
            time.Sleep(500 * time.Millisecond)
            wg.Done()
        }()
    }
    wg.Wait()
}
```

cnt 是 Goroutine 中需要操作的值，每個 Goroutine 啟動後會將 cnt + 1，經過 100 個 Goroutine 處理後，cnt 會是 100。為了避免 race condition，cnt 要用標準包的 atomic，讓加法成為原子操作。

跑一下試著印出結果

```bash
in:  1
in:  2
in:  3
in:  4
in:  5
in:  6
in:  7
in:  9
in:  10
in:  11
...
```

因為 Goroutine 只保證內部的操作會依照順序（這件事情並不像直覺感受到的這麼理所當然），而不保證 Goroutine 間的執行會依照順序，因此可以看到 8 的 Goroutine 被放到後面才執行。但總體來說，這個結果是正確的，沒出現 race condition。

注意 cnt 是在 Func 外宣告，再放到 Func 內使用，這裡的 Func 跟變數會被打包成一個物件，讓 Func 執行時可以取用，這樣的物件稱為閉包(Closure)。

使用閉包來操作值的問題在於，它很容易寫出 bug，怎麼說呢？讓我們看段程式碼

```go
func main() {
	var wg sync.WaitGroup
	wg.Add(100)
	for i := 0; i < 100; i++ {
		go func() {
			println("in: ", i, &i)
			time.Sleep(500 * time.Millisecond)
			wg.Done()
		}()
	}
	wg.Wait()
}
```

放入閉包的值改成用 i，直覺上，它應該也要印出 0 到 99，但實際印出來的結果是

```bash
in:  12 0xc0000160c0
in:  29 0xc0000160c0
in:  36 0xc0000160c0
in:  45 0xc0000160c0
in:  45 0xc0000160c0
in:  45 0xc0000160c0
...
in:  100 0xc0000160c0
in:  100 0xc0000160c0
in:  100 0xc0000160c0
in:  100 0xc0000160c0
```

像 45 被重複印出，而最後的幾個值都是 100，為什麼會這樣？這就要來看看 Go 是怎麼解釋閉包

> Go functions may be closures. A closure is a function value that references variables from outside its body. The function may access and assign to the referenced variables; in this sense the function is "bound" to the variables.
>
> 閉包是個參考函式範圍外變數的函式，它可以在函式內存取該受參考的變數。

Go 用的字是「參考」，儘管 Go 不支援顯式傳遞參考，但閉包內的使用卻是參考沒錯。在剛剛的例子中，我們同時印出變數的 address，可以看到變數的位置是同一個，當迴圈在執行時，i 的值會一直被修改，而等到 Goroutine 起來要使用 i 的值時，它可能已經不是 Goroutine 原本啟動時的值了。這裡的陷阱在於，習慣 Go 的開發者，會用值的角度來思考，但在 Go 這個只有傳值沒有傳參的語言中，這是唯一要用參考思考的地方。

要防止這問題，開發者要警覺不要在迴圈中使用閉包，並記得開啟靜態分析工具，像是

```bash
go vet main.go
main.go:15:16: loop variable i captured by func literal
```

讓錯誤在上 code 前可以被檢查出來。

還有個有趣的問題可以想想，閉包內使用的數值，會被配置在 heap 呢？還是會配置在 stack 呢？要知道答案，可以用逃逸分析看一下編譯結果

```bash
~/git/playground/playground | main>  go run -gcflags '-m -l' main.go

main.go:9:6: moved to heap: wg
main.go:11:6: moved to heap: i
main.go:12:6: func literal escapes to heap
in:  25 0xc00009e010
in:  28 0xc00009e010
in:  57 0xc00009e010
in:  57 0xc00009e010
in:  73 0xc00009e010
in:  73 0xc00009e010
in:  74 0xc00009e010
```

wait group 因為在函式內外都會用到，所以放到 heap，這很合理，而 i 也因為是用參考的方式傳進去，不能在 stack 結束後回收，也會被放到 heap 中。

## 使用參數傳遞值

既然閉包容易寫出問題，應該怎麼正確向 Goroutine 傳遞「值」呢？第二種方式跟呼叫 func 一樣，可以用參數來傳遞，舉個例子，改寫原來的迴圈

```go
func main() {
	var wg sync.WaitGroup
	wg.Add(100)
	for i := 0; i < 100; i++ {
		go func(i int) {
			println(i, &i)
			time.Sleep(500 * time.Millisecond)
			wg.Done()
		}(i)
	}
	wg.Wait()
}
```

替呼叫的函式加上型別為 int 的參數，這個參數就會在起 Goroutine 時一起被帶進去。來看一下執行結果

```bash
3 0xc00004b7c8
1 0xc00004a7c8
0 0xc0000487c8
23 0xc0001017c8
33 0xc0001127c8
4 0xc00004bfc8
24 0xc000101fc8
5 0xc0000447c8
2 0xc00004afc8
25 0xc0001027c8
```

i 的 address 都不同，而且執行結果也符合預期。也看看它被配置到哪塊記憶體

```bash
~/git/playground/playground | main>  go run -gcflags '-m -l' main.go

main.go:9:6: moved to heap: wg
main.go:12:6: func literal escapes to heap
5 0xc0000447c8
10 0xc000046fc8
3 0xc00004b7c8
6 0xc000044fc8
7 0xc0000457c8
8 0xc000045fc8
9 0xc0000467c8
37 0xc00010c7c8
```

這裡沒出現逃逸，也合理，因為 i 在 func 外不會被用到，會配置在 stack 上。

## 使用 channel 傳遞值

儘管在大多數的情況下，使用參數傳遞已經能符合需求。但從 CSP 的角度來看，有沒有更系統化的做法？

Tony Hoare 在 1978 年的 _Communicating Sequential Processes_ 開宗明義寫說

> This paper suggests that input and output are basic primitives of programming
>
> 這篇論文建議輸入跟輸出是編程的基本要素

CSP 將輸入輸出視為基本要素，Goroutine 間透過輸入輸出的方式連接，建構出複雜的邏輯。在 Go 中，用來對應輸出輸出的原生語言是 channel。讓我們看段 CSP 跟 channel 的關係，在 CSP 的語法中，輸入是 `<source> ? <target var>`，輸出是 `<destination> ! <expr>`

所以當要設計一個 Copy func，用來將 input channel 的字元送到 output channel 時，會是

```bash
COPY :: *[c:character; west?c → east!c]
```

翻譯成自然語言，大約是「有個名為 COPY 的程序，內部有個迴圈，會由程序 west 取得字元，如果成功，放到程序 east」，這等義於 Go 的

```go
func COPY(west, east chan rune) {
    for c := range west {
        east <- c
    }
    close(east)
}
```

我們不打算在這進行數學論證，就不深究 Tony Hoare 當初提出的語法，重點是明白它是基於數學的語言，並將 input / output 當成一等公民，這樣就好。

回頭來看基於 CSP 的第三種傳遞方式

```go
func main() {
	inCh := make(chan int, 100)
	var wg sync.WaitGroup
	wg.Add(100)
	for i := 0; i < 100; i++ {
		go func() {
			i := <-inCh
			println(i, &i)
			time.Sleep(500 * time.Millisecond)
			wg.Done()
		}()
		inCh <- i
	}
	wg.Wait()
}
```

在迴圈中，會起 Goroutine 並將 i 的值放到 channel 內，channel 的的傳遞是值複製，當把 i 放進去時，等於轉移 i 值的所有權給 channel 的 receiver。Goroutine 內會再從 inCh 取出放入的 i 值，將它印出來。在這個範例中，是先將 channel 傳遞進 Goroutine 再傳遞值，而傳遞 channel 的方式用的是第一種方式講的閉包。

如果從 CSP 的角度看，這段程式還不夠完整，因為 Goroutine 是單向輸入，沒透過輸出傳遞資訊給其他 Goroutine，這裡的資訊是什麼呢？Goroutine 完成工作後要通知別人吧，這個「完成」的資訊就是輸出。在原本範例中，對輸出資訊的傳遞是用 wait group，但這不是 CSP 的模型，因此再修改一下這段

```go
func main() {
	inCh := make(chan int, 100)
	outCh := make(chan struct{}, 100)
	for i := 0; i < 100; i++ {
		go func() {
			i := <-inCh
			println(i, &i)
			time.Sleep(500 * time.Millisecond)
			outCh <- struct{}{}
		}()
		inCh <- i
	}
	var cnt int
	for range outCh {
		cnt++
		if cnt == 100 {
			break
		}
	}
}
```

改成用 outCh 來同步完成資訊。

## 小結

這篇雖然了介紹三種常見的 Goroutine 傳遞方式，但實務上不是越複雜越好，重點是明白每種方法的限制有哪些，最常用到的可能反而是閉包。以我的經驗來講，通常如果沒有迴圈，我會直接用閉包處理；如果有迴圈但沒有明確的值輸出，我會用參數傳遞；只有當 Goroutine 負責的輸入輸出關係比較複雜，且需要分離責任時，我才會選擇用 channel 傳遞。

當然，channel 也不見得要弄到很長一串，以標準包 time 來舉例，一個常見的 timeout case 可以是

```go
timeout := time.After(time.Second)
select {
case <- timeout:
	return errors.New("timeout")
}
```

這是個很優雅的例子，相關的循序邏輯都封裝在 `time.After` 內，時間到會透過 channel 發出通知，負責計時的 Goroutine 就不用背負呼叫 callback function 的責任，會讓歸屬上更明確。

## Reference

- [A Tour of Go](https://go.dev/tour/moretypes/25)
- [Communicating Sequential Processes](https://www.cs.cmu.edu/~crary/819-f09/Hoare78.pdf)
- [【Go 夜读】第 66 期 #Paper-Reading CSP 理解顺序进程间通信](https://studygolang.com/topics/10914)
- [Tony Hoare’s CSP THE OLD SCHOOL VERSION](http://rtoal.github.io/csp-talk/#/)
