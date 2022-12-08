---
title: Goroutine 的併發治理：由錯誤處理談起
description: 當需要同時執行多個任務時，Go 開發者會多開 Goroutine 來分擔任務，這稱為併發。併發聽起來似乎很理想，能其他任務等待時，照樣執行需要運算的任務，有效利用 CPU 資源，但如果要用在生產環境，它也需要完善的管理機制。想想看，Goroutine 在哪個情況下會被啟動？哪個情況下會結束？如果任務需要回傳結果，它應該要怎麼回傳？而如果執行中發生錯誤，又應該怎麼處理？…
date: 2022-12-07
scheduled: 2022-12-07
tags:
  - Go
  - Concurrency
layout: zh-tw/layouts/post.njk
---

當需要同時執行多個任務時，Go 開發者會多開 Goroutine 來分擔任務，這稱為併發。併發聽起來似乎很理想，能其他任務等待時，照樣執行需要運算的任務，有效利用 CPU 資源，但如果要用在生產環境，它也需要完善的管理機制。想想看，Goroutine 在哪個情況下會被啟動？哪個情況下會結束？如果任務需要回傳結果，它應該要怎麼回傳？而如果執行中發生錯誤，又應該怎麼處理？

我們可以稱呼這類主題為「併發治理」，需要開發者理解執行期的運作，而如何處理好 Goroutine 的開始與結束，讓錯誤能被意識到，可說是併發治理的第一關。

## 基本併發

來看個基本的併發操作。我們起 100 個 Goroutine，讓它們處理任務。如果執行時發生 error，就呼叫 HandleError 處理錯誤。

```go
func main() {
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			err := DoTask(i)
			if err != nil {
				HandleError(err)
			}
			wg.Done()
		}(i)
	}
	wg.Wait()
}

func DoTask(i int) error {
	err := fmt.Errorf("%d: some err", i)
	return err
}

func HandleError(err error) {
	fmt.Println(err)
}
```

這裡用 Go 標準包的 wait group 來管理 Goroutine，啟動 Goroutine 前，先用 wg.Add 將計數器加 1，Goroutine 執行完後，再用 wg.Done 將計數器減 1。等所有計數器歸零，代表 Goroutine 全部執行完成。wait group 的功用是同步化，確保主程式結束前，所有的 Goroutine 都執行完畢。

在這個模型中，Goroutine 的錯誤是在 Goroutine 中被處理，這讓 Goroutine 承擔額外的任務，例如它可能會需要依賴 Logger 才能處理錯誤，這也降低 Goroutine 的可測試性。如果我們希望分離彼此的責任，集中管理錯誤的話，就得想個方式，把錯誤傳出來。

## 共享記憶體來通訊

第一種傳遞錯誤的方式稱為 Shared memory，可以想像成把 Goroutine 中發生的錯誤記錄在某個儲存空間，等待 Goroutine 執行完後再來處理，程式碼類似

```go
var lock sync.Mutex
var errs []error

func main() {
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			err := DoTask(i)
			if err != nil {
				lock.Lock()
				errs = append(errs, err)
				lock.Unlock()
			}
			wg.Done()
		}(i)
	}
	wg.Wait()
	for _, err := range errs {
		HandleError(err)
	}
}
```

這段程式用 slice 來存放錯誤，因為 slice 沒保證併發安全，使用時要記得用 sync.Mutex 鎖起來再操作。

這個模型有什麼問題呢？因為引入互斥鎖，Goroutine 執行期間有了同步化機制，讓不同的 Goroutine 可能會互相等待；再來，當應用變得複雜的時候，可能會存在好幾個鎖，一不小心就會造成 Dead Lock；另外，使用 Shared Memory 意味著所有 Goroutine 都能 Access 共享區塊，如果有哪個 Goroutine 沒有遵守規範，修改了共享區塊內的值，就會影響到其他的 Goroutine。開發者原本從錯誤處理釋放出來的專注力，變成要轉投入到併發處理，從結果來講，對生產力幫助有限。

## errGroup

既然目標是處理錯誤，我們可以建立一些前提，針對這個情境特化，讓併發治理跟業務邏輯分離開來。具體來講，希望對 wait group 與 Goroutine 的使用進行封裝。這就來到 [golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup) 這個 package 了，先來上 code

```go
import (
	"fmt"
	"time"

	"golang.org/x/sync/errgroup"
)

func main() {
	var eg errgroup.Group
	for i := 0; i < 100; i++ {
		eg.Go(func() error {
			return DoTask()
		})
	}
	if err := eg.Wait(); err != nil {
		HandleError(err)
	}
}
```

eg.Go 會啟動一個 Goroutine，而 eg.Wait 會等待所有的 Goroutine 都執行完畢，如果在執行過程中有發生錯誤，eg.Wait 會將錯誤回傳給處理函式。

從名稱看，eg 封裝了 wait group 的邏輯，可以讓操作變得更簡單，它的內部實現跟原本 wait group 的操作類似

```go
func (g *Group) Go(f func() error) {
	if g.sem != nil {
		g.sem <- token{}
	}

	g.wg.Add(1)
	go func() {
		defer g.done()

		if err := f(); err != nil {
			g.errOnce.Do(func() {
				g.err = err
				if g.cancel != nil {
					g.cancel()
				}
			})
		}
	}()
}
```

只是用到 sync.Once 來鎖定 critical section。

errgroup 幫助開發者分離併發治理與業務邏輯，也降低無意中引發 Dead Lock 的可能性。

## 用通訊來共享資訊

還有沒有其他的可能呢？不妨換另一個角度來看待錯誤的傳遞。在 Go 中，錯誤是一種值，如果把 Goroutine 看成是處理值的處理程序，那只要能定義出程序的 input/output，就能將值傳遞出去。可能有人會想，這跟 function 不是差不多的意思嗎？是的，但關鍵在於，Goroutine 間不是順序式的關係，而是程序式的併發關係，在訊息經過 Goroutine 內部循序處理後，它會透過交談的方式，傳遞給另一個 Goroutine，這套模型又因此被稱為交談循序程式(CSP)。依照 CSP 的語法結構，可以修改程式為

```go
func main() {
	var wg sync.WaitGroup
	errCh := make(chan error)
	routineEndCh := make(chan struct{})
	logEndCh := make(chan struct{})
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			err := DoTask(i)
			if err != nil {
				errCh <- err
			}
			wg.Done()
		}(i)
	}
	go func() {
		for {
			select {
			case err := <-errCh:
				HandleError(err)
			case <-routineEndCh:
				close(logEndCh)
				return
			}
		}
	}()
	go func() {
		wg.Wait()
		close(routineEndCh)
	}()
	<-logEndCh
}
```

在這段程式中，Goroutine 產生的錯誤被送進 channel，而錯誤處理的函式則放在另一個 Goroutine，假設稱為 G2，G2 在 channel 的一端接收錯誤，收到後立刻進行錯誤處理。此外，我們需要明訂 G2 的結束時間，因此開了再一個 Goroutine G3 來協調，當 wait group 的任務都結束後，G3 會關閉 routineEndCh，讓 G2 的 case 2 可以執行並關閉，G2 關閉前同樣關閉 logEndCh，讓主程式順利結束。

儘管用到一些看起來很潮的字，在採用模型前，我們還是得先自問，這個做法真的有比較好嗎？程式碼長度由 20L 變成 30L，還有許多 channel 的同步處理問題，它對生產力真的有幫助嗎？

唔，這是個好問題，CSP 的設計類似數學，從設計層面上切開彼此的相依性（在數學中，沒有狀態這回事）。在程式碼中，我們可以察覺到，原本的 Goroutine 跟 G2 間變成像是生產者跟消費者的關係，當訊息一生產出來，G2 會立刻消費它，讓程式變成像是生產線一樣，訊息處理完後，會被送到下一站繼續處理。而在共享記憶體的例子中，訊息是先搜集起來放在記憶體中，等待 Goroutine 完成後再批次處理。使用 channel 串接的方式，儘管不見得有更好的總處理時間(total time)，但理論上，避免了批次性的等待，它應該會具備更好的平均處理時間(average time)。

技術本質上，channel 也是使用加鎖後複製值來實現，但它具備更高級的應用語義，我們可以把 channel 看成是對底層技術的封裝，因為這層封裝，開發者可以區別出生產者與消費者，也保證了消息的唯一性，從而在設計上防止 race condition 的發生。

## 小結

在討論 Go 的併發時，質數篩是個很經典的例子，用共享記憶體的方式，質數篩會是

```go
func main() {
	n := 20
	primes := make([]bool, n)
	for i := 2; i*i < n; i++ {
		if !primes[i] {
			for j := i; j*i < n; j++ {
				primes[i*j] = true
			}
		}
	}
	for i := 2; i < n; i++ {
		if !primes[i] {
			fmt.Println(i)
		}
	}
}
```

但如果用 CSP 方式，則會變成

```go
func main() {
	c := make(chan int)
	go counter(c)

	for i := 0; i < 20; i++ {
		p := <- c
		fmt.Println(p)
		primes := make(chan int)
		go filter(p, c, primes)
		c = primes
	}
}
```

很明顯，兩個模型一對照，CSP 的可讀性更低，因為人類對訊息的理解是歷時性，而不是共時性的。我們可以輕易回想起某場棒球賽的再見全壘打，卻不容易記得某個賽季的平均打擊率。既然如此，為什麼我們會需要用反人類的方式來設計？因為當程式像數學一樣運作，它會變得無狀態、鬆耦合、更適合機器執行。至於可讀性方面，errgroup 給了一個靈感，我們可以將 channel 的操作封裝起來，透過框架來解決併發問題。

## Reference

- [errgroup package - golang.org/x/sync/errgroup - Go Packages](https://pkg.go.dev/golang.org/x/sync@v0.1.0/errgroup)
- [Golang - errGroup 用法及適用情境](https://blog.kennycoder.io/2021/10/03/Golang-errGroup-%E7%94%A8%E6%B3%95%E5%8F%8A%E9%81%A9%E7%94%A8%E6%83%85%E5%A2%83/)
