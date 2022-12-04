---
title: 在 VirtualBox 上建置 Openwrt
description: 現在工作會用到 Openwrt 當開發平台，但用起來一直卡卡的，想找時間從頭操作一次，看能不能深入理解系統的運作，說起來工作的重點就是不斷追求 balance，既能符合商業需求，又能持續成長。趁著年假有空，來玩玩看 Openwrt 有什麼特色。
date: 2019-02-03
scheduled: 2019-02-03
tags:
  - VM
  - Openwrt
layout: zh-tw/layouts/post.njk
---

現在工作會用到 Openwrt 當開發平台，但用起來一直卡卡的，想找時間從頭操作一次，看能不能深入理解系統的運作，說起來工作的重點就是不斷追求 balance，既能符合商業需求，又能持續成長。趁著年假有空，來玩玩看 Openwrt 有什麼特色。

首先是下載 Openwrt 並編譯，現在的 Openwrt 已經用 git 做版控，可以用 git clone 來放到自己的開發目錄

```bash
git clone https://git.openwrt.org/openwrt/openwrt.git
cd openwrt
```

![](/img/posts/setup-openwrt-on-virtualbox/console-1.webp)

剛下載下來的 Source code 沒有包含相關的 package，例如 python、driver 等等，因為後續開發會需要用到，先使用 feeds來更新並安裝 package

```bash
./scripts/feeds update
./scripts/feeds install -a
```

feeds是 Openwrt 內建的 script，如果想知道 command 的意思，可以用 help 。剛接觸 Linux 的人可能會不習慣看 help 來理解 command，可是用習慣之後，有問題能自己解，不用爬 Stack Overflow，對 Coding 幫助其實很大

```bash
./scripts/feeds -h
install [options] <package>: Install a package
...
update -a|<feedname(s)>: Update packages and lists of feeds in feeds.conf .
```

由 help 內容可以知道，update 是更新追蹤的 package list； install 則是安裝 package，如果沒有安裝， menuconfing 時就會看不到相關的 package ，因此這邊全部裝起來

接著進行環境準備，輸入 make defconfig 來檢查相關的 tool 有沒有 Ready，並產生設定文件 .config

再來使用 make menuconfig 來選擇要編譯的 package，找不到 package 的話可以用 / 加關鍵字搜尋，搜尋有支援 regular exp 喔！這邊先選擇 python3 、LuCI 、GDB ， Target 用 x86 ，印象檔格式用 ext4

![](/img/posts/setup-openwrt-on-virtualbox/console-2.webp)

之後用 make -j8 全速編譯

![](/img/posts/setup-openwrt-on-virtualbox/console-3.webp)

編譯完得到映像壓縮檔，解壓縮

```bash
gunzip openwrt-x86-generic-combined-ext4.img.gz 
```

得到映像檔，為了讓 VirtualBox 可以掛載，要用 vboxmanage轉換為 vdi 格式

vboxmanage convertfromraw --format VDI openwrt-x86-generic-combined-ext4.img openwrt_x86.vdi
再來開啟 VirtualBox，建立 Virtual Machine

![](/img/posts/setup-openwrt-on-virtualbox/vm-1.webp)

選擇 Type 為 Linux ，版本為 Linux 2.6 / 3.x / 4.x (32-bit) ，一路 Next 完成掛載

開啟 VirtualBox，可以看到

![](/img/posts/setup-openwrt-on-virtualbox/vm-2.webp)

完成！已經在 VirtualBox 上掛載剛剛編譯好的 Openwrt 了！