---
title: 設計模式作為一種語言：物件導向的語法要素
description: 「設計模式」這個詞出自 Christopher Alexander 的《建築模式語言》，這本書出版於 1977 年，主題圍繞著建築，城市設計和社區宜居性。作者 Alexander 是一名建築師，他在意的是，能不能找到一種切實可行的模式語言，讓讀者用以設計辦公室、車庫或公共建築。…
date: 2022-11-20
scheduled: 2022-11-20
tags:
  - Design Pattern
layout: zh-tw/layouts/post.njk
---

「設計模式」這個詞出自 Christopher Alexander 的《建築模式語言》，這本書出版於 1977 年，主題圍繞著建築，城市設計和社區宜居性。作者 Alexander 是一名建築師，他在意的是，能不能找到一種切實可行的模式語言，讓讀者用以設計辦公室、車庫或公共建築。

儘管這樣的期待難免於可操作性，但在另一方面，Alexander 同時是名評論家跟創作者，在創作的過程中，他也想知道，現實繁複的表象下，是不是存在某種共通性，能用於解釋建築間特定的規律？我們可以看到作者羅列出 253 個模式，像是活動中心(30)、墓地(70)與啤酒館(90)，Alexander 說：「每一模式描述我們周圍環境中一再發生的某項問題，接著描述解決該問題的關鍵所在，如此一來，你就能上萬次利用這種解決方式，而不必每次從頭來過。」

如同描述資料的資料稱為「後設資料(metadata)」，描述語言的語言稱為後設語言，而 Alexander 給這套後設語言起的名字是「模式語言」。日後，GoF 仿造 Alexander 的形式，帶著致敬的味道，列舉出軟體開發的「設計模式」。在這裡，我們關注的是「語言」，而不是內在意圖的轉變。如果我們將語言拆分為時間與空間兩塊，由 Alexander 的「模式語言」到 GoF 的「設計模式」就是時間上的啟發，儘管具有歷史學的意義，但不能用來說明語言本身的性質；相對的，語言的內在空間結構 — — 像啤酒館(90)內有凹室(179)跟溫暖的爐火(181)，讓訪客在其間飲酒高歌 — — 才是我們使用它的方式。借用索緒爾的譬喻：「國際象棋由波斯傳到歐洲，這是外部的事實，反之，一切與系統和規則有關的都是內部的。例如我把木頭的棋子換成象牙的棋子，這種改變對於系統是無關緊要的；但是假如我減少或增加了棋子的數目，那麼，這種改變就會深深影響到『棋法』」

## 物件導向與自然語言

GoF 在 1994 年出版的《設計模式：可復用物件導向軟體的基礎》中，描述「設計模式」是「由彼此互動的物件類別所組成，用來解決某特定情境中的一般性設計問題」，由此可知，GoF 在語言中加入的語法要素是物件導向。有別於 Alexander 在每項模式語言中放進實物照片，GoF 用的是結構化的語言，更準確地說，在描述每項設計模式時，他們用的是類別圖

<p align="center">
  <img src="/img/posts/2022/design-pattern-as-a-language/pattern-1.png" />
</p>

類別圖的「主詞」是類別(Class)，而「動詞」則是它們之間的關係(Relation)，請看這類句子「Creator 創建 Product」「ConcreteCreatorA 繼承 Creator」，這體現了類別圖的本質。在物件導向的世界裡，第一要務是找出物件類別，再來是建構它們之間的互動，設計者相信，這是「一種對真實世界進行建模的方式」。我們不妨比較一下自然語言跟物件導向語言，例如使用一個「主語+謂語+賓語」的結構，「我戴帽子」跟

```java
class Hat {}

class Person {
    public void Wear(Hat) {
    }
}
```

具有相同的空間關係，因此在效果上，它們也能表達同樣的意思。

如果物件導向語言等價於自然語言，開發程式也會等價於開口說話。只要能講出來的，就能寫成程式，兩者間不存在摩擦力，從而解決了軟體開發的一道難題：業務模型與程式碼間的語義鴻溝。可是，事情並沒有這麼單純，讓我們舉出反例，費茲傑羅《大亨小傳》的開頭：「『當你打算批評任何人時，』父親告訴我。『你要記住，世上不是每個人都像你一樣佔了這麼多便宜。』」這要如何翻譯成物件導向語言呢？雖然很荒謬，我們還是盡力試試看，首先，「當」可能是個條件式，而「記住」應該是符合條件時發生的事，因此

```java
class Person {
    private final int mostAdvantageAmount = 100;
    public int advantageAmount;
    public void Remember() {
        this.advantageAmount = 1000;
        System.out.println(this.advantageAmount > this.mostAdvantageAmount);
    }
    public boolean IsCriticizingStatus() {
        return true;
    }
}

class Playground {
    public static void main(String[ ] args) {
        Person person = new Person();
        if (person.IsCriticizingStatus()) {
            person.Remember();
        }
    }
}
```

即使不理會自然語言的高階功能，像是隱喻或象徵。我們也能察覺到翻譯與原句間的落差。父親不見了，「我」變成更普遍的原型，在原文中，當蓋茲比死的時候，只有尼克．卡拉威替他守靈，可是在程式碼內，看不見他跟蓋茲比間共有的特質。事實上，物件導向分析是在另一個層次上運作，它確實致力於拉近兩種語言間的距離，這正意味著語言的空間配置存在落差。

索緒爾的說明可能更容易理解：「每著棋都會對整個系統有所反響，下棋的人不可能準確地預見到這效果的界限。由此引起的價值上的變化，有的是零，有的很嚴重，有的具有中等的重要性，各視情況而不同。一著棋可能使整盤棋局發生劇變，甚至對暫時沒有關係的棋子也有影響。我們剛才看到，對語言來說，情況也恰好一樣。」GoF 的設計模式是誕生自物件導向的語法要素，跟語言間有緊密的結合，Ralph Johnson 在〈Design Patterns 15 Years Later〉中也說到：「有些語言不需要某些設計模式，這些語言提供了問題的替代方案」。

## 語法要素的影響

既然 GoF 在書中也認為「設計結果所得到的類別通常在現實世界中並不存在」，讓我們將問題改成「物件導向語言具有什麼特性？它又是如何影響設計模式？」講到物件導向的特性，直覺可能是繼承、封裝、多態。可是如索緒爾再三提醒我們的，語言與其表達的事物沒有必然的關係。更深入追問什麼是物件導向後，Robert Martin 有段發人深省的話：「物件導向語言為我們消除了人工遵守這些約定的必要，也就等於消除了這方面的危險性。採用物件導向語言讓多型實現變得非常簡單，讓一個傳統 C 語言工程師可以去做以前不敢想的事情。」

這段話非常有意思，物件導向的功能實際上是種約束，以 Factory Method 為例，C 語言工程師可以用函數指針做到類似多態的事

```c
typedef struct Product {
    void (*doStuff)(void);
} Product;

void doStuffA(void) {
};

typedef struct Creator {
    Product* (*createProduct)(void) {};
} Creator;

Product* createProductA(void) {
    Product *p = (Product*)malloc(sizeof(struct Product));
    p->doStuff = &doStuffA;
    return p;
};

int main() {
    Creator *c = (Creator*)malloc(sizeof(struct Creator));
    c->createProduct = createProductA;
    Product* p = c->createProduct();
    p->doStuff();
    return 0;
}
```

可是這不是 C 語言常見的語法，它更像是某種「方言」，會依照開發者的不同，而有程度不等的變形。假設開發者忘記替 Product 加上 doStuff，C 語言的編譯器還是會成功編譯，因為在 C 語言的設計中，struct 沒有 method 的概念，它用的是函數指針，而指針可以是 NULL，NULL 則會導致執行期錯誤。

容易發生執行期錯誤的寫法應該成為一種模式嗎？這是個好問題，Robert Martin 所謂「讓一個傳統 C 語言工程師可以去做以前不敢想的事情」應該要倒過來看，在 C 面臨到的技術領域中，它不曾想過要解決多型問題，這是用 C 開發多型會顯得模型不匹配的原因。

我們用 Java 來看相同的例子

```java
interface Product {
    void doStuff();
}

class ConcreteProductA implements Product {
    public void doStuff() {
    }
}

interface Creator {
    Product createProduct();
}

class ConcreteCreatorA implements Creator {
    public Product createProduct() {
        return new ConcreteProductA();
    }
}
```

完美符合類別圖的敘述。但是就像大家都知道的，類別是物件導向的一等公民，method 依附於類別底下，我們想要進一步詢問，物件導向的語法要素是不是必要的？例如，類別是必須的嗎？讓我們看看 Go 的例子

```go
type Product interface {
    doStuff()
}

type ConcreteProductA struct{}

func (c *ConcreteProductA) doStuff() {
}

type Creator interface {
    createProduct() Product
}

type ConcreteCreatorA struct{}

func (c *ConcreteCreatorA) createProduct() Product {
    return &ConcreteProductA{}
}
```

Go 將指向 struct 的指針放在 receiver，類似 C 語言將指針放在第一個參數。不像 Java 需要顯式聲明實作 interface，Go 使用鴨子型別，編譯器會檢查 struct 是否有符合 interface 指定的 func 約束，如果有，它就能以 interface 的方式回傳。這項設計體現了 Go 的「簡潔」哲學，Go 工程師不需要創造無用的（或缺乏語義的）類別來放置 func，而是透過改造 func，讓它能加入約束。

從 C 到 Java 到 Go 的例子，語法要素具體而微影響一個系統的組成。設計模式使用物件導向來描述問題的解決方案，只是描述的語言與描述的對象不會完全相同。英文要描述「湯圓」時，會用「sweet dumpling」，可是這並不能說明湯圓在食物上特性，另個稱呼方式是用「tangyuan」，藉由中文發音來專指特定食物。這是語法要素重要的原因，「變動的不是整體，也不是一個系統產生了另一個系統，而是頭一個系統的一個要素改變了，而這就足以產生出另一個系統」。

## 場景中的設計模式

也因為如此，當將設計模式用於真實場景的時候，要特別注意兩者的結構是否吻合。以 Builder Pattern 為例，GoF 解釋該模式的目的是「把一個複雜物件的建構與表示(representations)分離，如此相同的建構過程可以產生不同表示的物件」，它的結構是

<p align="center">
  <img src="/img/posts/2022/design-pattern-as-a-language/pattern-2.png" />
</p>

Builder 中有許多相鄰排列的 BuildPart，每個 BuildPart 可以對應到 Product 的一項特徵（儘管 BuildPart 的重複性在 GoF 的類別圖中看不出來）。Concrete Builder 實現 Builder 的介面，它也有一個 GetResult，可以用以取得 Product；Director 用 Construct 呼叫 Builder 的介面，因此可以說，Director 跟 Concrete Builder 通過 Builder 實現依賴的隔離。

來看個現成的場景，[resty](https://github.com/go-resty/resty) 是個 HTTP 跟 REST 的函式庫，用來處理 HTTP 客戶端的請求。

呼叫端的程式碼會類似

```go
func GetDevice() (map[string]interface{}, error) {
    var dao map[string]interface{}
    client := resty.New().
        SetLogger(&Logger{}).
        OnBeforeRequest(RequestLog).
        OnAfterResponse(ResponseLog)
    _, err := client.R().
        SetQueryParam("from", "2022-10-10 00:00:00").
        SetAuthToken("XXXX4900518B4F7EAC75BD37F01XXXX").
        SetPathParam("id", "1").
        SetResult(&dao).
        Get("/api/v1/devices/{id}")
    if err != nil {
        return nil, err
    }
    return dao, nil
}
```

程式碼可分成兩塊，第一塊用來建立 client，第二塊用來建立 request ，當呼叫 HTTP Method 後，會發出請求，回傳結果。從結構上來看，它跟 Builder Pattern 都具備重複性的特徵，但也僅只於此，另外兩個結構關係：用 GetResult 取回 Construct 後的物件，以及用 Builder 來隔離 Director 跟 Concrete Builder，在 resty 的例子中都沒看到。

有跟沒有的差別在哪？有沒有可能，只是 resty 依照自身應用修改 Builder Pattern 呢？我們來研究 resty 的應用，它需要發送 HTTP Request，而 HTTP Request 具有大量的參數需要設置，這與 Builder Pattern 的重複性結構是相同的，因此我們能看到 SetQueryParam()、SetAuthToken() 這樣的 setter。另一方面，resty 底層協定用 HTTP，沒有其他選項，當然也沒有隔離層。至於 GetResult()，GoF 的說法是：「將（Product 與 GetResult）兩者分離，就能擁有多種不同的 Concrete Builder」，除非 resty 想提供多種不同的 Request 建構方式給使用者選擇，否則也不符合 GetResult() 的結構。

Builder Pattern 的三種結構中，只有一種符合應用情境，既然如此，resty 用單純的 setter 就能表達應用，使用 Builder Pattern 只會顯得多餘。這不是修改（時間關係上）的問題，是結構（空間關係上）的問題。味噌湯不放味噌跟豆腐，改放菜頭跟排骨酥加肉燥，那還是味噌湯嗎？不是，那是排骨酥湯。

如果 resty 不是 Builder Pattern，哪種應用語言符合 Builder Pattern 的結構呢？舉個例子，我們提供客戶購買保險的服務，保險依照種類分為居家險跟火險，每個保險產品依價格有不同的方案，在保單建立前，需要先建立「承保項目」「承保範圍」「受益人」等等。居家險跟火險的承保項目不同，不同方案的承保範圍不同，但它們都適用同樣的流程。這裡有連續性，有隔離的需要，有建構方式的選擇，寫成程式碼會是

```go
homePolicyBuilder := NewHomePolicyBuilder()
director := NewPolicyDirector(homePolicyBuilder)
director.Construct()
homePolicy := homePolicyBuilder.GetHomePolicy()
fmt.Println(homePolicy)

firePolicyBuilder := NewFirePolicyBuilder()
director = NewPolicyDirector(firePolicyBuilder)
director.Construct()
firePolicy := firePolicyBuilder.GetFirePolicy()
fmt.Println(firePolicy)
```

在 Builder Pattern 相關的「效果」中，GoF 更深入說明「改變 Product 的內部表示」「隔離構造代碼與表示代碼」「對構造過程進行更精細的控制」是其主要優點。而這些特徵，如上面看到的，都已經反應在結構中了。

## 小結

套用設計模式來設計軟體，有時會遇到模型不匹配的問題。設計者需要先理解領域語言，才能設計出正確的系統，而常常，在理解領域語言後，會發現簡單的結構更能反應系統需求。既然如此，學習設計模式的目的是什麼？我們可以將它看成是一套語言，在其結構中保存了特定的應用情境，「設計模式雖然無法徹底克服這些困難，但它通過對框架設計的主要元素做更顯式的說明可以降低框架學習的難度」。學習這些，就像是在「物件導向語言」跟「自然語言」上，建立起一道可以互相轉換的途徑。

當設計模式成為一門行業術語，我們能透過它汲取物件導向過往的思考。如果能看穿這些組成規則，將它放入經驗中，我們就能像熟悉一門語言一樣，自然而流暢地對話。這也意謂著，當我們看到其他架構師的設計時，會知道其中的估量與權衡，而這也差不多是藝術的起點了。

## Reference

- [搞笑談軟工](http://teddy-chen-tw.blogspot.com/search?q=%E4%BB%80%E9%BA%BC%E6%98%AFPattern)
- [Builder](https://refactoring.guru/design-patterns/builder)
- [設計模式不死？](https://www.ithome.com.tw/voice/89076)
