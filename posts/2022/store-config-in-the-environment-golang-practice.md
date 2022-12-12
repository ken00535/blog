---
title: 配置存放於環境：Go 應用的配置實踐
description: 在雲原生的時代前，開發人員或維運人員通常會各自維護一份執行的程式，開發在開發環境中驗證後，交付維運部署上線，一次性處理好配置；但在雲原生時代，部署變得越來越頻繁，幾乎不太可能手動管理。這時要把問題倒過來想，不是因應開發出來的程式來設定配置，而是有沒有可能，因應部署會遇到的問題來設計開發？…
date: 2022-10-28
scheduled: 2022-10-28
tags:
  - DevOps
  - Cloud Native
  - Go
layout: zh-tw/layouts/post.njk
---

在雲原生的環境中，程式通常採用容器部署，而不同環境間所需要的配置也會不同，像是開發環境的資料需要與生產環境分離；金絲雀部署要分流生產環境的流量，但不會寫資料到生產環境中；開發環境為了除錯，要印出 level 低的 log；開發環境跟生產環境要拿取的 key vault 的 key 跟 version 不同；等等。在雲原生的時代前，開發人員或維運人員通常會各自維護一份執行的程式，開發在開發環境中驗證後，交付維運部署上線，一次性處理好配置；但在雲原生時代，部署變得越來越頻繁，幾乎不太可能手動管理。這時要把問題倒過來想，不是因應開發出來的程式來設定配置，而是有沒有可能，因應部署會遇到的問題來設計開發？

![雲原生常見的部署架構](/img/posts/2022/store-config-in-the-environment-golang-practice/clond-native-1.png)

## Store config in the environment

Heroku 基於 SaaS(Software-as-a-Service) 實踐，歸納出 12 條雲原生應用的設計原則，稱為 The Twelve-Factor App，其中關於配置，Heroku 要求「代碼與配置分離」，讓一份代碼，可以部署在多個環境。在實踐上，硬編碼當然不是個選擇，但即使用配置檔來管理配置，也還是有一些問題：配置文件要放在哪個路徑呢？它的格式應該採用 JSON 還是 YAML？別忘了微服務有可能用不同語言來實現，不同語言都支援選用的格式嗎？

考量這些問題，Heroku 建議將配置放在環境變數中，這確實更符合雲原生的概念。讓我們假設一個場景，現在是發佈前夕，版本要上到金絲雀部署環境，SRE 需要建立容器後，用命令行進入容器內，修改配置檔，然後重啟容器程序。這個流程聽起來繁複且不太合理。如果好一點，SRE 將這些流程寫成腳本，讓腳本自動修改配置，那當配置檔的路徑或格式變更時，腳本也要跟著異動，這會產生摩擦力，阻止開發者對配置的修改。即使在最好的狀況下，SRE 在啟動容器時指定配置檔，也需要將配置檔事先放入 pod 中。可以看到，單單是路徑跟格式這兩點，就會生出複雜度。

相較下，環境變數是鍵值對結構，更清晰易讀，更重要的是，它更容易標準化，不會受到語言限制。假設 SRE 要在啟動容器時加入配置，他只需要使用 -e 之類的參數；或者更單純，使用 CI/CD Pipeline 管理環境變數，讓不同的 Job 自行取用。

## 使用 .env

然而從開發者的角度，這勢必關係到開發者體驗的異動。在原本的流程中，開發者可以用配置檔來管理配置，例如在本地環境與開發環境間切換。改成環境變數後，要切換環境需要改用命令行建立環境變數，不容易在專案中管理。

一個折衷的辦法是將環境變數寫成腳本導出，類似

```bash
# env.sh

export API_GATEWAY_ENV=dev
export API_GATEWAY_CORS_ALLOW_ORIGINS=https://api.gateway.com
export API_GATEWAY_LOG_LOG_LEVEL=0
export API_GATEWAY_LOG_PRETTY_OUTPUT=false
```

然後在執行程式前，先執行腳本導出環境變數，例如修改 makefile 為

```makefile
all: api-gateway

api-gateway:
    source configs/env.sh
    go run main.go
```

這是從專案著手，解決開發配置問題。相應的，也要求所有專案都採用同樣的慣例，統一 makefile 的寫法。如果想進一步降低複雜度，使用 codebase 來解決開發配置的問題，應該要怎麼做呢？有沒有可能對應配置檔的寫法，讓程式啟動時從檔案讀取環境變數？這裡可以用上 [joho/godotenv](https://github.com/joho/godotenv) 這個第三方庫。

用法是執行 func 後載入環境變數，如果沒指定檔案，載入 .env，.env 在這裡扮演了類似配置檔的角色

```go
package main

import (
    "log"
    "os"
    "github.com/joho/godotenv"
)

func main() {
    err := godotenv.Load()
    if err != nil {
    log.Fatal("Error loading .env file")
    }
    s3Bucket := os.Getenv("S3_BUCKET")
    secretKey := os.Getenv("SECRET_KEY")
    // now do something with s3 or whatever
}
```

godotenv 的原理是包裝了標準庫 Env 相關 func

```go
func loadFile(filename string, overload bool) error {
    envMap, err := readFile(filename)
    // ...
    currentEnv := map[string]bool{}
    rawEnv := os.Environ()
    for _, rawEnvLine := range rawEnv {
        key := strings.Split(rawEnvLine, "=")[0]
        currentEnv[key] = true
    }
    for key, value := range envMap {
        if !currentEnv[key] || overload {
            os.Setenv(key, value)
        }
    }
    return nil
}
```

而 .env 的內容則是

```ini
# .env file

API_GATEWAY_ENV=dev
API_GATEWAY_CORS_ALLOW_ORIGINS=https://api.gateway.com
API_GATEWAY_LOG_LOG_LEVEL=0
API_GATEWAY_LOG_PRETTY_OUTPUT=false
```

如果環境變數已經存在，使用原本的環境變數，如果環境變數不存在，套用 .env 中的設定。

但這樣畢竟還是需要手動指定，如果我們想套用「約定優於配置」的原則，讓程式自動載入 .env 的話呢？在 godotenv 底下有個 package 可以用來自動載入

```go
import _ "github.com/joho/godotenv/autoload"
```

利用的是 init() 的機制

```go
func init() {
    godotenv.Load()
}
```

使用 .env 的另一個優點是，當開發者需要跟 SRE 溝通要設置的環境變數時，他們可以基於同一份檔案來討論。有必要的話，.env 中還可以加上範例跟註解，幫助 SRE 理解環境變數的用途。

## Load environment variable as a struct

讓我們來看看在 Go 的應用程式中，要如何使用這些環境變數，當然，既然它已經是環境變數了，我們可以用標準庫的 os.Getenv 來讀取

```go
envName := os.Getenv("API_GATEWAY_ENV");
```

可是假設，你有超過 10 個以上的環境變數，這會變成是一件苦差事，而且難以維護。如果可以，我們希望用一個 struct 來存放環境變數，讓程式在啟動直接讀進 struct，省下後面轉換的功夫

這裡要用到另一個庫 [viper](https://github.com/spf13/viper)

viper 是設計來處理配置，要從環境變數載入配置，可以用

```go
type LogConfig struct {
    Level        int    `yaml:"level" mapstructure:"level"`
    PrettyOutput string `yaml:"pretty_output" mapstructure:"pretty_output"`
}

type Config struct {
    Env             string    `yaml:"env" mapstructure:"env"`
    CorsAllowOrigin string    `yaml:"cors_allow_origin" mapstructure:"cors_allow_origin"`
    Log             LogConfig `yaml:"log" mapstructure:"log"`
}

func main() {
    b, _ := yaml.Marshal(&Config{})
    defaultConfig := bytes.NewReader(b)
    viper.SetConfigType("yaml")
    viper.MergeConfig(defaultConfig)
    viper.AutomaticEnv()
    viper.SetEnvPrefix("API_GATEWAY")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    fmt.Println(viper.AllSettings())

    _config := &Config{}
    if err := viper.Unmarshal(&_config); err != nil {
        return
    }
    fmt.Println(_config)
}
```

坦白說，流程還是有些複雜。因為 viper 是採用覆寫的方式，所以前面要先設定個 yaml 格式的 config 當預設；再用 AutomaticEnv 跟 Unmarshal 把環境變數的值反序列化到 struct 內。為了跟其他環境變數區別，應用相關的環境變數最好加上前綴。

執行結果可以得到

```bash
go run main.go
&{dev [https://api.gateway.com](https://api.gateway.com) {0 true}}
```

viper v2 可能會讓流程更開發友善些，但在有更好的選擇前，可以先用這方式來降低讀取配置的維護成本。

## 小結

這篇嘗試從「Design for Operation」的角度梳理配置設計。不得不說環境變數是個相當漂亮的提案，小小的改動，大大的效益，既符合配置需求，又能簡化原本流程，讓概念變得更加清晰。我們可以注意到，在雲原生時代，有些責任會從原本的位置左移，而面對這樣的轉變，開發者也需要調整思維與手中的彈藥庫，嘗試從設計，而不是從工具來解決問題。

## Reference

- [The Twelve-Factor App](https://12factor.net/config)
- [[Architecture] The 12 factor App 筆記](https://marcus116.blogspot.com/2020/09/architecture-12-factor-app.html)
