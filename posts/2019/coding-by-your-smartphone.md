---
title: 全世界都是你的工作室：GCP 的雲端開發環境
description: 最近看到 Heron 的 Medium 在討論使用 iPad 來開發程式，深深被 Thin Client 給感動了。如果能從硬體裝置中解放，不用開發程式前還需要花費大把時間精力來架設環境，那我們就能更快驗證，更快學習，更快迭代，把時間花在重要而有價值的事上…
date: 2019-10-11
scheduled: 2019-10-11
tags:
  - GCP
layout: zh-tw/layouts/post.njk
---

最近看到 Heron 的 Medium 在討論使用 iPad 來開發程式，深深被 Thin Client 給感動了。如果能從硬體裝置中解放，不用開發程式前還需要花費大把時間精力來架設環境，那我們就能更快驗證，更快學習，更快迭代，把時間花在重要而有價值的事上。

Thin Client 的概念說來單純，我們可以將所有能連上網路的介面都可以當成終端，在傳統開發環境中，終端跟運算是放在同一台機器上，輸入完成後，使用機器的資源來進行運算，像是編譯程式、執行與提供服務；但自從有了雲端後，可以將這類運算都交由雲端處理，只要有個合用的終端介面能輸入與呈現資訊，就能得到運算結果。

## Apply GCP free plan

既然運算資源放在雲端，首先要申請一個雲端帳戶，這邊以 GCP 的免費方案為例，首先點選 GCP 的免費試用

![](/img/posts/coding-by-your-smartphone/gcp-1.webp)

GCP 的免費方案提供 $300 刀的額度，還有 12 個月的使用時間，可以使用 GCP 上所有服務，如果是小型或低成本的運算，甚至不用動到 $300 的費用。

選擇國家/地區後，按[繼續]進入第二頁

![](/img/posts/coding-by-your-smartphone/gcp-2.webp)

第二頁要填入個人資訊，還需要一張信用卡卡號。依照 Google 的說法，信用卡是為了驗證身分。要注意 GCP 不支援 JCB，請用 Visa/Master Card 來申請。

## Create Project

進入 GCP 首頁後，可以先創建一個新的 Project，來放置要測試的東西，點選 Google Cloud Platform 旁的 Project 名稱，再點選跳出視窗右上角的 New Project

![](/img/posts/coding-by-your-smartphone/gcp-3.webp)

填入 Project name 跟要放置的 Folder，例如 Linux VM，完成 Project 的建置。

![](/img/posts/coding-by-your-smartphone/gcp-4.webp)

## Create VM instance

有了 Project 後，可以在裡面創建需要的雲端服務，因為主要目的是驗證 Thin Client 是否可行，選擇創建一個 VM 實例來進行登入。要創建 VM 實例可以點選 Menu 中的 Compute Engine > VM Instances，選擇 Create

![](/img/posts/coding-by-your-smartphone/gcp-5.webp)

Create 的選項有很多，參照 GCP 的免費方案說明，使用 Region 為 us-central1 (Iowa)，Machine Type 為 f1-micro

![](/img/posts/coding-by-your-smartphone/gcp-6.webp)

Boot Disk 看個人習慣，我平常用的環境是 Ubuntu 18.04 LTS，這邊選同樣的，如果有習慣 Debian 或其他 Distribution 的人，也可以自行選擇

![](/img/posts/coding-by-your-smartphone/gcp-7.webp)

點選[Create]，完成 VM 創建。

## Setup SSH

在終端安裝 SSH 的 Client，例如 Windows 常用的 putty，或者 Termius 這款 App。沒有 SSH Key 的人需要使用程式產生出 SSH Key，再將 Private Key 指定給 SSH Client，同時將 Public Key 放置到雲端。產生 Key 的步驟就不多說了，Windows 下的使用者可以用 PuTTYgen 來產生，Linux 使用者可以用 ssh-keygen。

有 Public Key 後，要將它放到雲端，方便以後登入。選擇 Compute Engine 中的 Metadata，點選 SSH Keys，可以管理金鑰。點選 Add SSH keys 來加入自己的 Public Key

![](/img/posts/coding-by-your-smartphone/gcp-8.webp)

加入後回到 VM instances，查看對應的 External IP，使用 SSH Client 輸入 user@address，登入 VM instance，記得 user 是要 key 對應的 user，address 是要 External IP。驗證看看能否登入。

## 小結

自從雲端的商業模式建立起來後，許多做法都會跟著改變，這是一個思維上的轉換，以前需要的東西有可能被淘汰掉，而新的需求會被創造出來。如果可以用 GCP 處理掉伺服器，我沒必要再去購買伺服器的硬體來自行架設網站，不但比較便宜，也省掉 Maintain 的 Effort。同時，高效能對 Laptop 也不會再是議題，取而代之的，應該是穩定而快速的網路服務配上輕便的終端顯示器。

最後放張完成圖，紀念一下。

![](/img/posts/coding-by-your-smartphone/gcp-9.webp)

## Reference

- [拿 iPad 取代筆電做程式開發](https://blog.heron.me/coding-on-ipad-d264c5c6325e)
- [GCP 免費方案](https://cloud.google.com/free/docs/gcp-free-tier?hl=zh-tw)
