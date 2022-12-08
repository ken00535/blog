---
title: 用 VirtualBox 開啟實體硬碟中的 Windows
description: 如果用 Linux 當開發環境，常常會碰到一個問題：因為一般企業使用的管理系統沒有 Linux 版本，導致有些操作必須使用 Windows 來完成。對於大部分的應用來說，在 VirtualBox 內安裝 Windows 可能就能解決，問題是，通常 VirtualBox 的 Windows 都是由工程師自行安裝，不是正式授權；再來，在 VirtualBox 內安裝 Windows，意味加上原來預設的 Windows，硬碟內要有兩套 Windows…
date: 2019-06-10
scheduled: 2019-06-10
tags:
  - VM
layout: zh-tw/layouts/post.njk
---

如果用 Linux 當開發環境，常常會碰到一個問題：因為一般企業使用的管理系統沒有 Linux 版本，導致有些操作必須使用 Windows 來完成。對於大部分的應用來說，在 VirtualBox 內安裝 Windows 可能就能解決，問題是，通常 VirtualBox 的 Windows 都是由工程師自行安裝，不是正式授權；再來，在 VirtualBox 內安裝 Windows，意味加上原來預設的 Windows，硬碟內要有兩套 Windows，這真的讓人很難接受，一套已經很佔空間了，居然還要兩套？

於是我有個想法，要是 VirtualBox 可以用實體空間來開機的話，就能直接在 VirtualBox 執行原本配置的系統，如此一來，可以用 IT 已經安裝好的授權軟體不說，也省掉了後續資料交換的麻煩。Google 後發現還真的有這種應用，當然馬上試試看。

## 列出分區

首先因為是使用硬碟的資料，我們需要確認 Windows 安裝在哪個 Partition，使用 fdisk -l 列出所有 Partition 的狀態

```bash
ken:~$ sudo fdisk -l /dev/nvme0n1
Disk /dev/nvme0n1: 119.2 GiB, 128035676160 bytes, 250069680 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: 664C31C9-8F24-4D89-B16A-426FDCDBB716
Device             Start       End   Sectors  Size Type
/dev/nvme0n1p1      2048    534527    532480  260M EFI System
/dev/nvme0n1p2    534528    567295     32768   16M Microsoft reserved
/dev/nvme0n1p3    567296 111706111 111138816   53G Microsoft basic data
/dev/nvme0n1p4 248020992 250068991   2048000 1000M Windows recovery environment
/dev/nvme0n1p5 111706112 112504831    798720  390M Linux filesystem
/dev/nvme0n1p6 112504832 144502783  31997952 15.3G Linux swap
/dev/nvme0n1p7 144502784 248020991 103518208 49.4G Linux filesystem
```

可以看到 Windows 的資料位於 dev/nvme0n1

## 創建 VMDK 檔

接著，為了讓 VirtualBox 可以從實體硬碟開機，我們需要建立 vmdk 檔來表示實體硬碟。使用 VirtualBox 指令

```bash
ken:~$ sudo VBoxManage internalcommands createrawvmdk -filename ~/vmdk/windows_10.vmdk -rawdisk /dev/nvme0n1p1
RAW host disk access VMDK file /home/ken/vmdk/windows_10.vmdk created successfully.
```

## 創建虛擬機

再來，開啟 VirtualBox，用剛剛建好的 vmdk 檔來開機

![](/img/posts/2019/(.*)/virtualbox-1.webp)

這邊要注意，雖然我們的系統安裝在 SSD，使用的是 NVMe，但 VirtualBox 的 NVMe 似乎有問題，因此這邊選擇用 SATA

![](/img/posts/2019/(.*)/virtualbox-2.webp)

前面看到 nvme0n1 開頭是 EFI，因此記得要 Enable EFI

![](/img/posts/2019/(.*)/virtualbox-3.webp)

## 啟動虛擬機

設定都完成後，只要開啟 Virtual Machine，應該能看到 GRUB 的畫面，選擇 Windows Boot Manager，進入 Windows，完工。

![](/img/posts/2019/(.*)/virtualbox-4.webp)

## 小結

使用 VirtualBox 開啟 Windows 後，就能省掉很多資料交換的麻煩，但畢竟是 Virtual Machine，使用上不比 Native，可能會有些狀況；另外，我電腦的 Windows 跟 Ubuntu 開機都安裝在 SSD，要用 EFI 從 dev/nvme0n1 開機，但如果可以的話，最好將兩個系統切開，免得不小心開到 Ubuntu，造成資料損壞。

## Reference

- [Booting a Physical Windows 10 Disk Using VirtualBox on Linux](https://www.jamieweb.net/blog/booting-a-physical-windows-10-disk-using-virtualbox-on-linux/)
- [Using a Physical Hard Drive with a VirtualBox VM](https://www.serverwatch.com/server-tutorials/using-a-physical-hard-drive-with-a-virtualbox-vm.html)

