---
title: 資料庫版本遷移：以 Go 為例
description: 我們通常稱呼資料庫版本遷移為 Migration，在 Laravel 或 RoR 中都有整合好的 Migration 工具，而 Golang 目前仍需要仰賴自己動手，golang-migrate 是現在比較成熟的專案。本文會講解如何使用 golang-migrate 的 CLI 跟函式庫，來建立資料庫 Migration。…
date: 2020-08-16
scheduled: 2020-08-16
tags:
  - Go
  - Database
layout: zh-tw/layouts/post.njk
---

接續[前面](/posts/2020/gorm-from-init-to-use.md)，繼續來討論資料庫議題吧。

在商務初期，追求的是驗證市場，這時資料庫往往只有相對簡單的版本，各種欄位也還不是很齊全。隨著商業模式逐漸成熟，資料庫會需要負擔更多的營運功能，也會需要在原有表格中加入新欄位。資料庫的版本管理問題就出現了。

我們通常稱呼資料庫版本遷移為 Migration，在 Laravel 或 RoR 中都有整合好的 Migration 工具，而 Golang 目前仍需要仰賴自己動手，golang-migrate 是現在比較成熟的專案。本文會講解如何使用 golang-migrate 的 CLI 跟函式庫，來建立資料庫 Migration。

## Introduction

既然說版本遷移是 Migration，為什麼不直接稱呼 Version 就好，它跟 Version 有什麼不同？兩者的區別可以看看下圖

![](/img/posts/2020/database-migration-by-go/db-1.jpg)

簡單來說，Version 指的是資料庫的狀態，而 Migration 指的是狀態到狀態之間的改變。因為後端程式會使用到資料庫，如果用到資料庫沒有的欄位，就會出現問題。對資料庫來說，表格的創建、欄位的新增等等，都是使用 SQL 來描述，如果將每次版本變遷用到的 SQL 記錄下來，等於是將版本記錄下來，並且隨時可以快進到最新開發版，或回退到穩定版本。這就是 Migration 的意義。

## Prepare Environment

一開始可以先用命令行工具來熟悉 Migration 的操作，參照[說明檔](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)，安裝 migrate，底下是 Linux 的安裝方式

```bash
curl -L [https://packagecloud.io/golang-migrate/migrate/gpgkey](https://packagecloud.io/golang-migrate/migrate/gpgkey) | apt-key add -
echo "deb [https://packagecloud.io/golang-migrate/migrate/ubuntu/](https://packagecloud.io/golang-migrate/migrate/ubuntu/) $(lsb_release -sc) main" > /etc/apt/sources.list.d/migrate.list
apt-get update
apt-get install -y migrate
```

安裝完成後，在專案目錄建立 Migration 用的資料夾

```
project
├── cmd
├── data
│   └── migrate
├── migrations
├── pkg
├── scripts
├── go.mod
└── README.md
```

初始化 Database

```bash
initdb -D ./data/migrate -U postgres
pg_ctl -D ./data/migrate -l logfile start
```

使用 migrate 創建 Migration 用的 SQL

```bash
migrate create -ext sql -dir migrations create_users_table
```

此時，目錄變成

```
project
├── cmd
├── data
│   └── migrate
├── migrations
│   ├──20200813223102_create_users_table.up.sql
│   └──20200813223102_create_users_table.down.sql
├── pkg
├── scripts
├── go.mod
└── README.md
```

20200813223102_create_users_table.up.sql 是 Migration 用的檔案，前面的數字是時間戳記，可以理解成版本號；中間的文字是描述；最後的 up 或 down 是關鍵字，用來表示該 SQL 是進還是退。

在兩個 Migration 檔案中加入 SQL 語法，例如 up 可以用來創建表格，加入

```sql
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    age SMALLINT NOT NULL,
    username VARCHAR(50) NOT NULL,
    budget INTEGER
);
```

而 down 用來撤銷表格，加入

```sql
DROP table IF EXISTS players;
```

這時使用 migrate，就能建立起 players 表格了

```bash
migrate -verbose -source file://migrations -database postgres://postgres:[@127](http://twitter.com/127).0.0.1:5432/postgres?sslmode=disable up 1
```

-source 用來表示 migrations 放置的位置；-database 是用來連資料庫的協定；up 1 表示要進 1 個版本。

輸入命令後，使用 DBeaver 連接資料庫，可以看到右側導航欄有 players 跟 schema_migrations 的資訊

![](/img/posts/2020/database-migration-by-go/db-2.png)

接著可以試著下 down 的指令

```bash
migrate -verbose -source file://migrations -database postgres://postgres:[@127](http://twitter.com/127).0.0.1:5432/postgres?sslmode=disable down 1
```

會對資料庫執行 down，撤銷掉剛剛建立的 players 表格

![](/img/posts/2020/database-migration-by-go/db-3.png)

## Create Migrate Tool

migrate 可以進行資料庫的 Migration，但如果想要在應用程式中執行，應該如何做呢？

我們先建立 migrate 的專案

```
project
├── cmd
│   └── migrate
│       └── main.go
├── data
│   └── migrate
├── migrations
├── pkg
│   └── migrate
│       └── migrate.go
├── scripts
├── go.mod
└── README.md
```

其中套件 migrate 引入 migrate 庫，內容是

```go
package migrate

import (
    "log"
    "os"
    "path/filepath"

    "github.com/golang-migrate/migrate/v4"
)

type Migration struct {
    client *migrate.Migrate
}

func New() *Migration {
    m := Migration{}
    path, err := os.Executable()
    if err != nil {
        log.Panic(err)
    }
    path = "file://" + filepath.Join(path, "..", "..", "migrations")
    m.client, err = migrate.New(path, "postgres://postgres:[@localhost](http://twitter.com/localhost):5432/postgres?sslmode=disable")
    if err != nil {
        log.Panic(err)
    }
    return &m
}

// Up to newest version
func (m *Migration) Up() {
    if err := m.client.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }
}

// Down to oldest current
func (m *Migration) Down() {
    if err := m.client.Down(); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }
}
```

前面引入套件後，建立一個 struct 用來操作客戶端

```go
type Migration struct {
    client *migrate.Migrate
}
```

這個客戶端會在初始化後，回傳給應用程式

```go
func New() *Migration {
    m := Migration{}
    path, err := os.Executable()
    if err != nil {
        log.Panic(err)
    }
    path = "file://" + filepath.Join(path, "..", "..", "migrations")
    m.client, err = migrate.New(path, "postgres://postgres:[@localhost](http://twitter.com/localhost):5432/postgres?sslmode=disable")
    if err != nil {
        log.Panic(err)
    }
    return &m
}
```

初始化的訊息包括資料庫路徑與連接的通訊協定，類似前面使用 migrate 命令行工具的參數

底下再新增 Up 跟 Down 方法，調用 migrate 的 Up 跟 Down

```go
// Up to newest version
func (m *Migration) Up() {
    if err := m.client.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }
}

// Down to oldest current
func (m *Migration) Down() {
    if err := m.client.Down(); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }
}
```

Up 會將資料庫由現在版本升到最新版本；Down 會將資料庫由現在版本降為最舊版本。

應用程式 main.go 的內容則是

```go
package main

import (
    "example/pkg/migrate"
    "flag"

    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
    var up, down bool
    flag.BoolVar(&up, "up", false, "up to newest")
    flag.BoolVar(&down, "down", false, "down to oldest")
    flag.Parse()

    client := migrate.New()
    if up {
        client.Up()
    }
    if down {
        client.Down()
    }
}
```

在前面用 “github.com/golang-migrate/migrate/v4/database/postgres” 跟 “github.com/golang-migrate/migrate/v4/source/file” 引入 driver。

```go
import (
    "example/pkg/migrate"
    "flag"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)
```

後面設定命令行參數，如果有帶 up 就執行 Up，如果帶 down 就執行 Down。

在 migrations 下新增兩個 migration

```
project
├── cmd
│   └── migrate
│       └── main.go
├── data
│   └── migrate
├── migrations
│   ├── 000001_create_players.up.sql
│   ├── 000001_create_players.down.sql
│   ├── 000002_managers.up.sql
│   └── 000002_managers.down.sql
├── pkg
│   └── migrate
│       └── migrate.go
├── scripts
├── go.mod
└── README.md
```

因為是手動新增，前面版本編號就不用 timestamp 了，改成用流水號；create_players 的內容跟前面一樣；managers 則用來新增一個表格 managers。

up 是

```sql
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    age SMALLINT NOT NULL,
    username VARCHAR(50) NOT NULL,
    salary INTEGER
);
```

down 是

```sql
DROP table IF EXISTS managers;
```

編譯並執行

```bash
./bin/migrate -up
```

這次改用 psql 來看成果

```bash
psql -U postgre
```

輸入 psql 指令

```bash
postgres=# using postgres
postgres-# \c postgres
You are now connected to database "postgres" as user "postgres".
postgres-# \dt
                List of relations
Schema |       Name        | Type  |  Owner   
-------+-------------------+-------+----------
public | managers          | table | postgres
public | players           | table | postgres
public | schema_migrations | table | postgres
(3 rows)
```

改成跑 down

```bash
./bin/migrate -down
```

結果變成

```bash
postgres-# \dt
            List of relations
Schema |       Name        | Type  |  Owner   
-------+-------------------+-------+----------
public | schema_migrations | table | postgres
(1 row)
```

可以看到 Up 跟 Down 有確實發揮作用。

## Force to Specific Version

資料庫能 Migration 很方便，但如果接手的是原先專案，建立時沒有設定 Migration，到專案中期才要導入，是不是只能把資料庫砍掉重建，由最初的版本慢慢 Up 起來？migrate 對應這狀況，提供 Force 函式，可以用來強制設定資料庫版本，使用 Force 後，資料庫就會認定當前版本為指令版本，用該版本來做 Migration。

為加入 Force，在 pkg/migrate/migrate.go 新增

```go
// Force sets a migeration version to
func (m *Migration) Force(version int) {
    if err := m.client.Force(version); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }
}
```

也在 cmd/migrate/main.go 中新增

```go
func main() {
    var version int
    // ...
    if version != -1 {
        client.Force(version)
    }
    // ...
}
```

Force 吃的參數就是版本號。

為驗證 Force 有成功運作，試著砍掉版本資訊的 schema_migrations

```bash
postgres-# drop table if exists schema_migrations;
```

啟動應用程式，指定版本為 1

```bash
./bin/migrate -force 1
```

再 up 上去

```bash
./bin/migrate -up
```

觀察結果

```bash
postgres=# \dt
            List of relations
Schema |       Name        | Type  |  Owner   
-------+-------------------+-------+----------
public | managers          | table | postgres
public | schema_migrations | table | postgres
(2 rows)
```

由於 Version 被指定為 1，在 Up 時就跳過 Migration 1，直接跑 Migration 2，因此最後的 table 中沒有 players。可見版本指定成功。

## 小結

Migration 在資料庫開發中會常用到，畢竟現在的軟體都是持續開發、持續交付，難免有需要升級的時候，而如果升級的版本出了問題，也會需要回滾到舊版。由於資料庫本身不會進 Git Repository，我們只能仰賴 Migration 來做管理。

Golang 的設計以函式庫為核心，不訴求框架，某方面來講給予開發者更多的權力，讓開發者能選擇要用的工具；但無形中也增加了開發的門檻，像這類 Migration 的工具就需要自行整合。我認為可見的未來內，Golang 的發展方向應該不會變，樂觀點想，只要生態系夠活躍，這也許不是什麼大問題。

P.S.

我現在有將 Medium 中實作的專案放到 [GitHub(按我)](https://github.com/ken00535/golang-medium-example) 囉，有興趣的人可以 clone 來玩玩看。

## Reference

- [golang-migrate GitHub](https://github.com/golang-migrate/migrate)
- [golang-migrate命令行的使用](https://zhuanlan.zhihu.com/p/69472163)
- [Ruby on Rails-談Migration概念與用法](https://medium.com/@weilihmen/ruby-on-rails-%E8%AB%87migration%E6%A6%82%E5%BF%B5%E8%88%87%E7%94%A8%E6%B3%95-22a52714f51f)
