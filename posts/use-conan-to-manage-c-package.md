---
title: Conan：C/C++ 的套件管理工具
description: 開發 C++ 程式時，套件管理會是個困擾開發者的問題。沒有套件管理，當不同開發環境的使用者要開發程式時，不僅需要手動將相關的檔案塞進 repository 中，還會遇到相容性的問題，這使得兩個人的版本不相容，要花很多時間除錯。…
date: 2020-01-18
scheduled: 2020-01-18
tags:
  - C/C++
  - Conan
layout: zh-tw/layouts/post.njk
---

開發 C++ 程式時，套件管理會是個困擾開發者的問題，C++ 不像 Python 有 pip；node.js 有 npm；lua 有 rock；C# 有 Nuget。它就只是沒有。沒有套件管理，當不同開發環境的使用者要開發程式時，不僅需要手動將相關的檔案塞進 repository 中，還會遇到相容性的問題，例如小明使用 paho-c 1.3.0 開發，開發到一半時，另一位開發者小華引用了小明放在 repo 中 include 資料夾下的 header file，卻使用了自己的 1.3.1 shared library，這使得兩個人的版本不相容，要花很多時間除錯。

此外，當需要更新 repo 中的第三方套件版本時，需要手動將檔案放到 include 跟 libs 的資料夾，你引用多少套套件，你就要塞多少檔案進去；而跨平台的問題也是，Win32 可能要一份，Win64 要一份，Release 跟 Debug 的 Libs 各要一份，Linux 跟 Mac 再各要一份，最後 x86、arm、mips 再各要一份，自行排列組合一下就知道這個更新的痛苦了。為什麼我知道呢？因為我就是那個被困擾的人。

好在許多開發者都有同樣的問題，於是 Conan 出來了，這是一個 C++ 套件管理工具，用 Python 寫成，目的在於協助開發者解決上述的困擾。本文會簡單介紹 Conan 的用法，希望大家看完後都能如獲新生。

## Install conan

首先來安裝 conan 這套工具，由於 conan 是用 python 寫的，也有在 pip 的 remote repo 中，因此只要用 pip 即可安裝

```bash
ken@DESKTOP-2R08VK6:~/git/conan/build$ pip3 install conan
Collecting conan
    Downloading [https://files.pythonhosted.org/packages/2e/b7/560406ecd9d20e308498ce378dc8c1e0bc932f44d5377bc0ca62ec8dd75b/conan-1.21.1.tar.gz](https://files.pythonhosted.org/packages/2e/b7/560406ecd9d20e308498ce378dc8c1e0bc932f44d5377bc0ca62ec8dd75b/conan-1.21.1.tar.gz) (552kB)
    100% |████████████████████████████████| 552kB 761kB/s 
Collecting Jinja2<3,>=2.3 (from conan)
...
```

安裝完記得重新讀取 .profile，引入 conan 指令

```bash
source ~/.profile
```

## Prepare Environment

來看一下專案環境，假設我們[參照前篇](https://medium.com/@ken00535/use-cmake-to-build-cross-platform-application-8888db861cb3)，用 cmake 來進行編譯，工作目錄會長

```
project/
├── build/
├── src/
|   ├── CMakeLists.txt
|   └── hello.cpp
├── CMakeLists.txt
├── conanfile.txt
└── README
```

其中 src 放原始碼，hello.cpp 內容為經典的 hello, world

```cpp
#include "Poco/Thread.h"
#include "Poco/Runnable.h"
#include <iostream>

class HelloRunnable: public Poco::Runnable
{
    virtual void run()
    {
        std::cout << "Hello, world!" << std::endl;
    }
};

int main()
{
    HelloRunnable runnable;
    Poco::Thread thread;
    thread.start(runnable);
    thread.join();
    return 0;
}
```

這邊使用 Poco 的 Lib 來創建 thread，並呼叫一個印出 Hello, world 的 Runnable。之所以用 Poco 是因為 conan 官方也用 Poco 當範例，而且方便進行跨平台。Lib 本身不是重點，重點是有使用了一個第三方套件。

關於 CMakeLists.txt 的使用請參照前篇，不再多述，兩個 CMakeLists.txt 分別是

```bash
# .CmakeLists.txt

CMAKE_MINIMUM_REQUIRED(VERSION 2.6)
PROJECT(HELLOLIB)
ADD_SUBDIRECTORY(src)
```

以及

```bash
# .src/CmakeLists.txt

ADD_EXECUTABLE(hello hello.cpp)
```

## Edit conanfile

conan 使用 conanfile.txt 來管理套件，conanfile 的格式有點像 TOML，但我找不到官方說法，對使用者來說也許不用想太多，只要知道是某種配置文件就行，它的內容是

```ini
[requires]
Poco/1.9.4@pocoproject/stable

[generators]
cmake
```

這段內容表示依賴套件是 Poco，版本 1.9.4，來源 pocoproject/stable，產生cmake 模組。

接著進到 build 目錄，使用 conan

```bash
ken@DESKTOP-2R08VK6:~/git/conan/build$ conan install ..
Configuration:
[settings]
arch=x86_64
arch_build=x86_64
build_type=Release
compiler=gcc
compiler.libcxx=libstdc++
compiler.version=7
os=Linux
os_build=Linux
[options]
[build_requires]
[env]

conanfile.txt: Installing package
Requirements
    OpenSSL/1.0.2o@conan/stable from 'conan-center' - Cache
    Poco/1.9.4@pocoproject/stable from 'conan-center' - Cache
    zlib/1.2.11@conan/stable from 'conan-center' - Cache
Packages
    OpenSSL/1.0.2o@conan/stable:b781af3f476d0aa5070a0a35b544db7a3c193cc8 - Cache
    Poco/1.9.4@pocoproject/stable:57e3039664a87aab5ccabd995efae6da01c1ff17 - Cache
    zlib/1.2.11@conan/stable:d50a0d523d98c15bb147b18fa7d203887c38be8b - Cache

zlib/1.2.11@conan/stable: Already installed!
OpenSSL/1.0.2o@conan/stable: Already installed!
Poco/1.9.4@pocoproject/stable: Already installed!
conanfile.txt: Generator cmake created conanbuildinfo.cmake
conanfile.txt: Generator txt created conanbuildinfo.txt
conanfile.txt: Generated conaninfo.txt
conanfile.txt: Generated graphinfo
```

然後工作目錄就變成

```
project/
├── build/
|   ├── ...
|   ├── conanbuildinfo.cmake
|   └── ...
├── src/
|   ├── CMakeLists.txt
|   └── hello.cpp
├── CMakeLists.txt
├── conanfile.txt
└── README
```

跟之前對照，多出了 cmake 模組 conanbuildinfo.cmake

## Modify CMakeLists

之所以要有 cmake 模組，就是為了讓 cmake 引用，因此要回頭改 CMakeLists.txt，將 conan 相關的指令加進去

```bash
# .CMakeLists.txt

CMAKE_MINIMUM_REQUIRED(VERSION 2.6)
PROJECT(HELLOLIB)

INCLUDE(${CMAKE_BINARY_DIR}/conanbuildinfo.cmake)
CONAN_BASIC_SETUP()

INCLUDE_DIRECTORIES(${CONAN_INCLUDE_DIRS})
MESSAGE(STATUS ${CONAN_INCLUDE_DIRS})
ADD_SUBDIRECTORY(src)
```

其中 INCLUDE 是引用 conan 產生的 cmake 模組；CONAN_BASIC_SETUP 會設定 conan 需要的變數；INCLUDE_DIRECTORIES 是引用 conan 相關的 header file，免去手動搬運 header file 的麻煩。MESSAGE 可加可不加，這邊是用來印出 conan header file 的所在目錄，讓開發者心底踏實一點。

而另一個 CMakeLists.txt 則改成

```bash
# .src/CMakeLists.txt

ADD_EXECUTABLE(hello hello.cpp)
TARGET_LINK_LIBRARIES(hello ${CONAN_LIBS})
```

非常單純，就是鏈結 conan 相關的 lib。

## Build

關鍵的時候到了，用 cmake 配置並編譯

```bash
ken@DESKTOP-2R08VK6:~/git/conan/build$ cmake ..
-- The C compiler identification is GNU 7.4.0
...
-- /home/ken/.conan/data/Poco/1.9.4/pocoproject/stable/package/57e3039664a87aab5ccabd995efae6da01c1ff17/include/home/ken/.conan/data/OpenSSL/1.0.2o/conan/stable/package/b781af3f476d0aa5070a0a35b544db7a3c193cc8/include/home/ken/.conan/data/zlib/1.2.11/conan/stable/package/d50a0d523d98c15bb147b18fa7d203887c38be8b/include
...
```

可以看到 conan 抓下來的檔案會放在 user 家目錄的 .conan。

```bash
ken@DESKTOP-2R08VK6:~/git/conan/build$ cmake --build .
Scanning dependencies of target hello
[ 50%] Building CXX object src/CMakeFiles/hello.dir/hello.cpp.o
[100%] Linking CXX executable ../bin/hello
[100%] Built target hello
```

編譯完成，來執行看看

```bash
ken@DESKTOP-2R08VK6:~/git/conan/build$ ./bin/hello 
Hello, world!
```

結束！conan 自動抓完 header file 跟 library，開發者不要再煩惱套件跟庫管理了，專心來享受寫程式的快樂吧。

## 小結

看到 conan 能自動管理套件，真的不是個「爽」字能形容，套句強者我同事的話：「我不常寫 C++，因為它的套件管理太可怕了」。有使用開源程式碼開發的人，應該非常能了解這種感受。

在使用 conan 開發途中，難免踩到一些坑，直接上 GitHub 發問後，沒想到 conan 的 Contributor 在短短幾小時內就快速回覆，還 involve 相關專案的 Contributor 一起來確認，現在開源社群的活躍度已經這麼厲害了嗎？

要說 conan 的問題，可能是普及度還不夠，有時需要的 library 不一定會有，但我覺得這沒有關係，只要會 python，就可以捲起袖子，把自己要用的 library 打包後回饋，讓其他人也能快速利用同樣的資源。畢竟人生苦短，不要重複造輪子，我們可以面朝大海。

## Reference

- [Conan Official Website](https://conan.io/)
- [常用的 conan cmake 變數](https://docs.conan.io/en/latest/reference/generators/cmake.html)
- [C++包管理器 — — conan](http://blog.guorongfei.com/2018/04/23/conan-tutorial/)
