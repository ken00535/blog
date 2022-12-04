---
title: 讓錯誤成為資源：gRPC 的錯誤處理模型
description: 錯誤處理是所有 RPC 服務都要具備的設計，但是怎樣的錯誤處理模型，算是好的模型呢？從字面上來看，錯誤處理可以分解成「錯誤」跟「處理」，如果用 RESTful 的觀點，將錯誤當成是 Resource，一個好的模型應該要能匹配不同場景的 Resource，並根據場景需求來處理這些 Resource。 在 RESTful 中，通常會用 HTTP Status Code…
date: 2022-10-07
scheduled: 2022-10-07
tags:
  - Go
layout: zh-tw/layouts/post.njk
---

錯誤處理是所有 RPC 服務都要具備的設計，但是怎樣的錯誤處理模型，算是好的模型呢？從字面上來看，錯誤處理可以分解成「錯誤」跟「處理」，如果用 RESTful 的觀點，將錯誤當成是 Resource，一個好的模型應該要能匹配不同場景的 Resource，並根據場景需求來處理這些 Resource。

## 錯誤模型

在 RESTful 中，通常會用 HTTP Status Code 當錯誤訊息的分類(Category)，錯誤內容則放在 Payload。這樣的好處是，只要看到分類，就能先進行大方向的處理，如果需要特定資訊，再從 Payload 拿取。通常錯誤內容的格式會自行定義，以支付服務 Stripe 的 API 為例，定義的格式就有

- type (string)
- code (string)
- decline_code (string)
- message (string)

message 應該是最常見的欄位，當開發分為前後端時，前端能根據 message 快速定位錯誤原因。code 則是用來補足 HTTP Status Code 的不足，在原本的分類下進行子分類。其他欄位則視應用場景來添加。如果應用場景不複雜的話，可以考慮只用基本的 Payload 格式，像是

```json
{
    "code": 40001,
    "message": "an invalid parameter: user_name"
}
```

RESTful API 透過分類知道要如何處理錯誤，透過 Payload 知道錯誤的內容，狹義來說，RESTful API 是指用 HTTP + JSON/XML 的方式來設計 API，但這只是一種特定的實作方式，不直接等於 RESTful。Roy Fielding 談 RESTful 時，用的名稱是「表述性狀態轉移」，這是個原則性的概念，只要稍加改動，應該要能套用同樣原則到不同的實現中，例如 gRPC。在進一步細談如何套用前，我們先來看看 gRPC 的錯誤處理模型。

假設我們建立一個 gRPC server，定義一個 service func SayHello，裡面什麼事情都不做，直接回傳錯誤

```go
func main() {
    srv := grpc.NewServer(cfg)
    proto.RegisterHelloServiceServer(srv, &server{})
    srv.Serve()
}
var demoErr = errors.New("some error")
type server struct {
    proto.UnimplementedHelloServiceServer
}
func (s *server) SayHello(context.Context, *emptypb.Empty) (*emptypb.Empty, error) {
    return &emptypb.Empty{}, demoErr
}
```

同時建立一個 client 去呼叫 server

```go
func main() {
  conn, err := grpc.NewClient(cfg)
  client := proto.NewHelloServiceClient(conn)
  client.SayHello(context.Background(), &emptypb.Empty{})
}
```

然後拿出你的 WireShark 抓包，直接看看傳了哪些東西，抓到的 Request 會是

![](/img/posts/error-as-resource-grpc-error-handling/wireshark_grpc_request_1.webp)

翻譯成白話：gRPC 用 POST method 呼叫 /proto.HelloService/SayHello 的 URL。

也能抓到 Response

![](/img/posts/error-as-resource-grpc-error-handling/wireshark_grpc_response_1.webp)

在 Header 中可以看到兩個跟 gRPC相關的 header，grpc-status 跟 grpc-message。語意上，這大致可以對應到 HTTP 的 Status Code 跟 Payload。可能有人會覺得奇怪，為什麼 HTTP 已經有一套可以套用的錯誤模型了，gRPC 還需要自己定義 Header？從定義來看，有機會是 HTTP Status Code 的應用情境不符合 gRPC 的情境，像是在 gRPC 中，有些 Status 是 client 獨有，有些是 server 獨有，而 HTTP Status Code 沒分這麼細緻。

另外，HTTP 的錯誤模型有個缺點，它將正常的資源跟錯誤的資源都用 Payload 來表述狀態。這裡有語意重載，會帶來複雜的處理問題。舉個例子，假設有人請你幫他跑腿，你回答 “No way”，意思是「我才不要」；但如果有人跟你說他中了樂透，你回答 “No way”，意思就變成是「天啊，怎麼可能」，同樣是 “No way”，前後的情境不同，意思就變得不一樣。對照到 Payload，當語意重載的情況出現時，會讓 client 需要依照 Context 來判斷要用什麼模型來處理，如果可以將正常的資源跟錯誤的資源分開，出錯的機率就會變小，可讀性也會提高。gRPC 這個設計相對合理。

## 狀態碼

剛剛講到 grpc-status 是 gRPC 的狀態碼，在上面的 Response 中，我們看到 grpc-status = 2，2 是什麼意思？依照 gRPC official status code 的定義，2 是 Unknown Error。

> Unknown error. For example, this error may be returned when a Status value received from another address space belongs to an error space that is not known in this address space. Also errors raised by APIs that do not return enough error information may be converted to this error.

為什麼會是 Unknown 呢？因為我們直接把 error 回傳，沒有替這個 error 分類，在 Golang 的實作中，沒分類的 error 會自動被歸類為 Unknown，可想而知這不是個好的實作，收到錯誤訊息的人看到 Unknown，無法進一步處理，只能被動印出 Log。

為了讓訊息更明確，我們需要替 gRPC error 指定 grpc-status

修改 server

```go
func (s *server) SayHello(context.Context, *emptypb.Empty) (*emptypb.Empty, error) {
    return &emptypb.Empty{}, status.Error(codes.InvalidArgument, "some error")
}
```

status package 是官方提供的 Package，顧名思義，就是讓你可以控制 status 的值；而 codes package 則定義了 gRPC 相關的 status code。我們在這裡定義該 status code 是 invalid argument，告知呼叫者參數錯誤；並在後面帶上 error message 讓呼叫者可以知道詳細資訊。

修改後，WireShark 的 Response 變成

![](/img/posts/error-as-resource-grpc-error-handling/wireshark_grpc_response_2.webp)

原本 grpc-status 變成 3了，對應到 Status 就是 INVALID_ARGUMENT。呼叫者可以知道原來是自己的參數錯誤才導致呼叫異常。

順便來看一下，目前 gRPC 定義的 status code 有這些

- OK(0)：成功狀態
- CANCELLED(1)：操作已被（調用者）取消
- UNKNOWN(2)：未知錯誤
- INVALID_ARGUMENT(3)：客戶端指定非法參數
- DEADLINE_EXCEEDED(4)：在操作完成前，已經過了截止時間
- NOT_FOUND(5)：請求的資源找不到
- ALREADY_DENIED(6)：客戶端試圖創建的實體已經存在
- PERMISSION_DENIED(7)：調用者沒有權限執行操作
- RESOURCE_EXHASTED(8)：某些資源已經被耗盡
- FAILED_PRECONDITION(9)：系統沒有處於操作需要的狀態
- ABORTED(10)：操作被中止
- OUT_OF_RANGE(11)：嘗試進行的操作超出合理範圍
- UNIMPLEMENTED(12)：該操作尚未實現
- INTERNAL(13)：內部錯誤
- UNAVAILABLE(14)：該服務目前不可用
- DATA_LOSS(15)：不可恢復的數據損壞
- UNAUTHENTICATED(16)：客戶端沒有操作需要的認證

到這裡我們發現一件事，如果想要描述的錯誤內容單純用狀態碼無法表達怎麼辦？例如，我們不僅想知道錯誤類型是參數錯誤，還想知道錯誤的參數是哪個，應該要如何修正，該怎麼將這個資訊給結構化呢？

## 詳細錯誤資訊

gRPC 除了有 grpc-message 顯示人眼可讀的 error message 外，還有一個 header grpc-status-details-bin，用來補足 status 表現能力不夠的問題。為了統一模型，這個資訊格式也是採用 protobuf，我們可以把它想像成 error 專用欄位，內容經過 protobuf message 編碼後，會放在這個標頭中。

既然知道概念，那就好處理了，把 server 端改成

```go
func (s *server) SayHello(context.Context, *emptypb.Empty) (*emptypb.Empty, error) {
    st := status.New(codes.InvalidArgument, "some error")
    st, _ = st.WithDetails(&errdetails.BadRequest_FieldViolation{
        Field:       "lost",
        Description: "lost field that should have",
    })
    return &emptypb.Empty{}, st.Err()
}
```

一樣是用 status 來處理，但在 status 中加入 details，gRPC 可以接受多個 detail，因此你可以根據需求將詳細的資訊傳進去。在這個例子中，我們進一步補充說 lost 這個 field 的值錯誤，它應該要有值，但接收時沒發現。這的資訊就豐富到能讓呼叫端進行應用層級的處理了。

雖然只要是 protobuf 就能放進 detail 中，但為了更好的相容性與定義，建議使用 Google 提供的 errdetails package 來處理，避免自己定義模型。

修改後，用 WireShark 再抓一次

![](/img/posts/error-as-resource-grpc-error-handling/wireshark_grpc_response_3.webp)

看到 grpc-status-details-bin 冒出來了，後面是 base64 編碼過的內容，如果丟進 decode 的話，可以得到

```
invalid argument e
8type.googleapis.com/google.rpc.BadRequest.FieldViolation)
lost lost field that should have
```

可以看到詳細的錯誤資訊都在裡面。

用 Postman 呼叫 gRPC，也能看到同樣的錯誤訊息。

![](/img/posts/error-as-resource-grpc-error-handling/postman.webp)

## 客戶端

剛剛的例子講的都是 server 端應該怎麼定義並回傳錯誤，client 收到 server 回傳的錯誤後，也要針對錯誤進行處理。

```go
_, err = client.SayHello(context.Background(), &emptypb.Empty{})
st, _ := status.FromError(err)
if st.Code() == codes.InvalidArgument {
    for _, d := range st.Details() {
        switch info := d.(type) {
        case *errdetails.BadRequest_FieldViolation:
            fmt.Println(info)
        }
    }
}
```

我們先用 status package 將 error 轉換成 status 的結構，接著從 status 的結構中讀取 status code，如果是 Invalid Argument，再進一步迭代所有的 detail 項並且印出。

```bash
~/git/ken-playground/grpc> go run ./example/client-demo                                                                                      
field:"lost"  description:"lost field that should have"
```

這裡有幾點要注意，第一，錯誤處理的結構仍然稍嫌複雜，if 中還嵌套著迭代跟 switch，如果 status code 有多個可能，最外圍的 if 需要再改成 switch 來接收，整體來說有一定的成本在。設計得太複雜，花太多時間來管理錯誤，結果大多錯誤都用不到的話，只會增加無謂的成本。gRPC 是針對所有可能的場景來設計，實際上還是要根據應用來裁量。

再來，對於企業層級的錯誤處理，也可以試著用 gRPC interceptor 來轉換錯誤，像是提供企業級的錯誤定義模組，在每個 client 建構時都自動引入定義好的 interceptor，儘管會犧牲一些些彈性，但能換取較好的可擴充性，加速開發時間。

最後，我們直接使用了 *errdetails.BadRequest_FieldViolation 來做型別斷言，省掉額外宣告錯誤模型的麻煩。這時 server 使用 errdetails 的效果顯現出來了，透過重用泛用性高，經過產品階段驗證的介面，自己就不用從頭摸索、設計、維護模型，可以轉而將這些時間投入到產品開發上。

## 結語

這篇從錯誤模型的角度，嘗試設計一套 gRPC 的錯誤處理機制，不過，與其說是設計，最後還是用了跟主流方案接近的最佳實踐。畢竟最佳實踐能是最佳實踐的原因，就是經過實務中的打磨，使用性特別好。

這邊想再講的一個思考角度是開發者體驗，通常我們開發時，只會關注 happy path，錯誤處理都是用精簡至上的角度來設計，直到某天錯誤發生，想看的除錯資訊都沒有，才會回來檢視原本的設計。這背後意味著在思考開發場景時，有些假設是值得商榷的。在開發者花費的時間中，除錯或許比開發佔更高比例，既然如此，我們應該將每個錯誤都當成是一個使用者故事來看待，讓系統的支援完善，才能做好開發者體驗。

以上大概是梳理錯誤處理的一些過程，中間也學習到很多模型匹配的原則，算是挺有收穫的，希望看完這篇文章的讀者，能多知道一些錯誤處理的背景。

## Reference

- [GRPC Core: Status codes and their use in gRPC](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)
- [Stripe API reference – Go](https://stripe.com/docs/api/errors#errors-api_error)