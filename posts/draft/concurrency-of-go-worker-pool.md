---
title: Goroutine 的併發治理：管理 Worker Pool
description: 
date: 2022-10-22
scheduled: 2022-10-22
tags:
  - Go
  - Concurrency
layout: zh-tw/layouts/post.njk
draft: true
---

需求

Execute concurrent job by goroutine
Flexibility with the definition of job running
Limiting the number of jobs executed over a period of time

用圖片

生成、執行

拆分一下流程

Job 的 Do 的封裝

結束

Benchmark

怎麼選取 metric

## Reference

- [Go by Example: Worker Pools](https://gobyexample.com/worker-pools)
- Concurrency in Go
- [Implementing a worker pool](https://hspazio.github.io/2017/worker-pool/)
- [Handling 1 Million Requests per Minute with Go](http://marcio.io/2015/07/handling-1-million-requests-per-minute-with-golang/)
- [Explain to me Go Concurrency Worker Pool Pattern like I’m five](https://itnext.io/explain-to-me-go-concurrency-worker-pool-pattern-like-im-five-e5f1be71e2b0)
- [gammazero/workerpool: Concurrency limiting goroutine pool](https://github.com/gammazero/workerpool)
