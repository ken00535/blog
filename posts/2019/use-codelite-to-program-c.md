---
title: C++ 開發環境架設：使用 CodeLite
description: 很久沒寫 C++ 了，上次是一年多前的事，當時為了在專案中使用 TDD 開發，套用 CppUTest 當 Unit Test Framework，而這套 Framework 就是用 C++ 寫的。最近工作上又需要用到 C++ 當底層資源，環境重架之餘，順手紀錄一下歷程。…
date: 2019-12-30
scheduled: 2019-12-30
tags:
  - C/C++
layout: zh-tw/layouts/post.njk
---

很久沒寫 C++ 了，上次是一年多前的事，當時為了在專案中使用 TDD 開發，套用 CppUTest 當 Unit Test Framework，而這套 Framework 就是用 C++ 寫的。最近工作上又需要用到 C++ 當底層資源，環境重架之餘，順手紀錄一下歷程。

原本的開發環境是 Windows 7 + uVision，使用 C 來開發 MCU。為了導入 TDD，需要在 Local 端有編譯執行的能力，考量到資源開放性，選擇用 cygwin 來執行 GNU，同時選擇當時資源豐富的 VSCode 做為編輯器。如果現在重選的話，可能會直接使用 Ubuntu 的 GNU，搭配 STM32CubeMX 自動生成 Makefile 來編譯，不論是自由度還是效能都較好，而且沒有後面 cygwin 一系列踩坑問題，But，人生就是這個 But，當時我不知道 cygwin 有這麼多坑。

由於現在工作的開發環境會用 Windows 10，仍然需要找個在 Windows 下的編譯執行工具，同時也希望是 cross-platform，無論 IDE 有多好，如果不能 cross-platform，不利於現在變動頻繁的開發環境與挑戰（想想看，原本用 .NET 全家餐用得好好的，結果開發環境變 Linux，又要重新用一套 IDE，而且你可能已經在原本的 IDE 上自行整合一些套件了）。現行的幾款 C++ IDE 有 CodeLite、Eclipse、CLion、Dev-C++、Visual Studio。由於我不想為 C++ 重新編寫 Makefile，不考慮 VSCode、Notepad++ 等 Editor；Dev-C++ 跟 Visual Studio 因為無法跨平台也劃掉；CLion 是 JetBrains 開發的 IDE，據說相當優秀，是很多人的首選，但我只需要開發小程式，用付款軟體太麻煩，劃掉；Eclipse 通常開發 Java 比較多，而且吃的資源有點兇，因此最後選用 CodeLite 來開發。

如果你是習慣使用 Visual Studio 的 Windows 開發者，不用懷疑，直接用 Visual Studio；如果你想在工作上選擇一款 cross-platform，CLion 是你的好夥伴；如果你只是想簡單寫點程式來驗證概念，也許可以跟我一樣用 CodeLite。

## Install MinGW

CodeLite 底層推薦用 MinGW 中的 GNU toolchain 來編譯，如果對象平台是 Windows，也可以使用 Visual C++，因為 WIN 10 有 WSL 可以執行 Linux Binary File，使用 MinGW 就能滿足需求了。

MinGW 是一套 Windows 下的開發環境，讓 Windows 的開發者也能使用 GNU 等 Linux 工具。要安裝 MinGW，到 [MinGW 官網](http://mingw.org/)下載安裝程式

![](/img/posts/2019/use-codelite-to-program-c/codelite-1.png)

安裝時，在 Basic Setup 中選擇 mingw32-base-bin、mingw32-gcc-g++-bin、msys-base-bin

![](/img/posts/2019/use-codelite-to-program-c/codelite-2.png)

安裝完後，要將執行檔路徑加入環境變數，讓 CodeLite 能抓到底層。打開控制台\系統及安全性\系統，選擇[進階系統設定]，點選[環境變數]

![](/img/posts/2019/use-codelite-to-program-c/codelite-3.png)

在系統變數中，編輯 Path

![](/img/posts/2019/use-codelite-to-program-c/codelite-4.png)

將 C:\MinGW\bin 加入 Path 中。

## Install CodeLite

接著來安裝 CodeLite，到官網下載安裝檔，官網上可以看到 CodeLite 主要支援三款語言：C++、php、node.js，主要 TA 是放在後端上

![](/img/posts/2019/use-codelite-to-program-c/codelite-5.png)

下載，解壓縮，執行，一路安裝精靈到結束，沒難度。

## Configure CodeLite

首次執行 CodeLite 時，先用 Setup Wizard 設定環境，開發的環境先用 C/C++

![](/img/posts/2019/use-codelite-to-program-c/codelite-6.png)

如果前面有成功安裝 MinGW 跟 g++，這邊選擇 Compiler 時就會看到

![](/img/posts/2019/use-codelite-to-program-c/codelite-7.png)

## Test Example

設定完後，用 CodeLite 來寫一支簡單的 C++，確認功能正常。先建立工作空間，在工作空間點右鍵，加入新專案

![](/img/posts/2019/use-codelite-to-program-c/codelite-8.png)

選擇用 g++ 的 Console Template

![](/img/posts/2019/use-codelite-to-program-c/codelite-9.png)

CodeLite 會套用範本長出基本檔案

```
CPPWorkspace
├-- Test1
    ├-- src
        ├-- main.cpp
```

打開 main.cpp，查看內容

```cpp
#include <stdio.h>

int main(int argc, char **argv)
{
    printf("hello world\n");
    return 0;
}
```

由於這是 C，將它改成 C++

```cpp
#include <iostream>

int main()
{
    std::cout << "Hello testing...";
    return 0;
}
```

來建置並執行程式，先在導覽列選擇 Build > Clean Project ，把舊的檔案（如果有的話）清空，選擇 Run 來建置執行

![](/img/posts/2019/use-codelite-to-program-c/codelite-10.png)

程式執行完成，開發環境建好啦！

## 小結

整個執行下來，最麻煩的不是軟體操作，而是一開始要選用哪個 IDE。原本想依照平常的開發環境，選用 VSCode，但因為需要 Compiler，又不想用 cygwin，只好研究 VSCode 跟 WSL 的串法，真的串起來後又發現自己不想寫 Makefile，只好回去選別的 IDE。

也想說是不是直接用 cl 來編譯，但查詢 VSCode 的[文件](https://code.visualstudio.com/docs/cpp/config-msvc)後，發現

>Start VS Code from the Developer Command Prompt
>
>To use MSVC in VS Code, you must start VS Code from a Developer Command Prompt for Visual Studio. An ordinary Windows command prompt, or a Bash prompt, does not have the necessary environment variables set.

如果有 Visual Studio，直接用 Visual Studio 就好啦，為了要寫個小程式還要特定安裝大型 IDE，好像有點誇張。而且 Visual Studio 不是跨平台，跟我的訴求不合。找了一陣子後，決定採用 CodeLite。

反倒後面安裝執行沒問題。人生就是這樣，做決定最困難。

## Reference

- [MinGW](http://mingw.org/)
- [CodeLite](https://codelite.org/)
