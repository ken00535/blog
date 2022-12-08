---
title: 遠端開發環境架設：Web 版 VSCode
description: 手邊一些開發有使用 Flask，因為 Flask 是架在遠端 Server 上，如果本地開發後還要部署到遠端，等於中間多了一個步驟，切來切去很麻煩，所以在想，有沒有機會直接在遠端進行開發？…
date: 2019-11-17
scheduled: 2019-11-17
tags:
  - VSCode
layout: zh-tw/layouts/post.njk
---

手邊一些開發有使用 Flask，因為 Flask 是架在遠端 Server 上，如果本地開發後還要部署到遠端，等於中間多了一個步驟，切來切去很麻煩，所以在想，有沒有機會直接在遠端進行開發？Google 後發現有個 code-server，能用 VSCode 進行 Remote Coding，所以還等什麼呢，來試試看吧。

## Use Docker to Deploy code-server

依照 code-server 的 Github，我們可以使用 docker 來架設

```bash
# -v bind docker folder to host's folder
# codercom/code-server:v2 is docker image

docker run -it -p 127.0.0.1:8080:8080 -v "${HOME}/.local/share/code-server:/home/coder/.local/share/code-server" -v "$PWD:/home/coder/project" codercom/code-server:v2
```

docker 會自動去 Docker Hub 將 image 抓下來設置，完成。

好像有點簡單，用瀏覽器來看一下成果

![](/img/posts/2019/use-vscode-to-remote-coding/vscode-1.webp)

看起來跟本機端的 VSCode 幾乎完全一樣啊！

## Use Binary

因為用 docker 真的太簡單了，沒有挑戰性，為了充篇幅，接著來看如果不使用 docker，要使用 binary 來執行的話，可以怎麼做。

GitHub 同樣有 QuickStart Guide

> 1. Visit the releases page and download the latest binary for your operating system.
> 2. Unpack the downloaded file then run the binary.
> 3. In your browser navigate to localhost:8080.

我的電腦是 Linux，首先依照步驟，先去下載 binary

```bash
wget [https://github.com/cdr/code-server/releases/download/2.1692-vsc1.39.2/code-server2.1692-vsc1.39.2-linux-x86_64.tar.gz](https://github.com/cdr/code-server/releases/download/2.1692-vsc1.39.2/code-server2.1692-vsc1.39.2-linux-x86_64.tar.gz)
```

解壓縮並安裝到 /bin

```bash
tar zxvf code-server2.1665-vsc1.39.2-linux-x86_64.tar.gz
cd code-server2.1665-vsc1.39.2-linux-x86_64/
mv code-server ~/bin/
cd
source .bashrc 
```

接著執行

```bash
ken@ken-Lenovo-ideapad-330-15ICH:~$ code-server
info  Server listening on [http://localhost:8080](http://localhost:8080)
info    - Password is 803570ed676b5d026417da00
info      - To use your own password, set the PASSWORD environment variable
info      - To disable use `--auth none`
info    - Not serving HTTPS
```

![](/img/posts/2019/use-vscode-to-remote-coding/vscode-2.webp)

由瀏覽器可以看到登入頁面，輸入隨機產生的密碼後登入

## Set Password

由 Step 2 執行後的結果可以看到，在 code-server 預設上，每次執行會隨機產生一組密碼，要登入就需要輸入。這麼做雖然保障安全性，但是非常麻煩。所幸 code-server 會自行讀取環境變數來設置密碼，因此只需要將使用的密碼設定在環境變數，就能固定用這組密碼登入

```
export PASSWORD="******"
code-server
```

## 小結

code-server 還有其他選項可以設定，就不一一細講了，有興趣可以自己翻GitHub。Remote coding 的優點在 GitHub 上也講得很清楚：

>    - Consistent environment: Code on your Chromebook, tablet, and laptop with a consistent dev environment. develop more easily for Linux if you have a Windows or Mac, and pick up where you left off when switching workstations.
>    - Server-powered: Take advantage of large cloud servers to speed up tests, compilations, downloads, and more. Preserve battery life when you're on the go since all intensive computation runs on your server.

你可以在任何地點、任何裝置上，從上次暫停的部分繼續 coding；你可以使用雲端裝置的運算能力，協助你進行編譯、測試，而且省下裝置的電量。這意味著你可以移動－－只要有網路的話，所在的地方就是辦公室，不用限定在一格一格死氣沉沉的辦公間或是某張特定的桌子上。

這很讓人振奮不是嗎？要說技術如何改變生活，我想這就是個例子。

## Reference

- [GitHub: code-server](https://github.com/cdr/code-server)
