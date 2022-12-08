---
title: 監控節點的度量指標：Grafana 串接 Prometheus
description: 在前面的討論中，我們可以用 Prometheus 去監控 End Devices，但 Prometheus 內建的 Dashboard 只是為了開發用，缺乏許多進階功能，在真正需要資料視覺化時並不方便。因此 Prometheus 通常會跟 Grafana 搭配使用。…
date: 2019-11-30
scheduled: 2019-11-30
tags:
  - Observability
  - Prometheus
layout: zh-tw/layouts/post.njk
---

在[前面的討論](https://blog.kenwsc.com/posts/use-prometheus-to-monitor-end-devices/)中，我們可以用 Prometheus 去監控 End Devices，但 Prometheus 內建的 Dashboard 只是為了開發用，缺乏許多進階功能，在真正需要資料視覺化時並不方便。因此 Prometheus 通常會跟 Grafana 搭配使用。

Grafana 是一套開源的 Dashboard 平台，之前開發產品時，有用過 Grafana 來呈現 Database 中的資料。其實用起來還是偏 Monitor Host，並不適合用在 Domain Data Visualization，但在開發初期，我們可以先借用 Grafana 的呈現能力來確認方向（反正開發初期規格會一直修改，重要的是工具能否快速調整，實不實用倒是其次）。

## Install Grafana

跟 Prometheus 一樣，用 docker 來安裝

```bash
docker run -p 3000:3000 --user root --name grafana -v "$PWD"/docker/grafana:/var/lib/grafana grafana/grafana &
```

用 -p 將 port forward 到 3000；用 -v 將 grafana 內的資料 bind 到家目錄的資料夾。

安裝完成後，在瀏覽器輸入 URL，應該能看到登入畫面

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-1.png)

## Setup Data Source

輸入預設的帳號密碼 admin:admin 後登入

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-2.png)

需要在 Grafana 中加入 Data source，Grafana 才知道要去哪裡抓資料，點選 Add data source 的圖示

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-3.png)

第一個就是 Prometheus，不用猶豫，點下去

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-4.png)

在 URL 中輸入 Promethues 的 URL，port 沒改的話就是 9090。儲存並測試。

## Create Dashboard

有了資料來源後，要緊接著加入 Dashboard，Grafana 有提供 Prometheus 的範例 Dashboard，我們來看看

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-5.png)

點選上方的 Dashboards 分頁，加入預設的 Dashboard

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-6.png)

華麗的 Dashboard 就跑出來了！是不是很簡單！雖然這張表的數據不是我們要的，但光看就是很威啊。

## Add Panel

有了範例後，參照 Grafana 的說明慢慢手動調整各個 Panel，就能調出想要的效果啦。假設今天想 Monitor end devices 的 CPU usage，我們可以加入一個新的 Panel

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-7.png)

用 Add Query 加入查詢式

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-8.png)

查詢式用的是 Prometheus 的查詢語言 PromQL，照樣輸入

```sql
100 - (avg by (instance) (irate(node_cpu_seconds_total{job="node",mode="idle"}[5m])) * 100)
```

![](/img/posts/use-grafana-to-show-prometheus-data/grafana-9.png)

查詢結果就自動變成圖表了。

## 小結

以 Dashboard 來講，Grafana 真的很強大，呈現的樣式多，查詢語言容易上手，但是 Grafana 不適合用來進行資料處理，如果需要呈現處理後的資料，而查詢語言本身又沒有相關的聚合指令的話，記得先處理完後再丟進 Database，或者在 Database 跟 Grafana 中間加入一個中間層，不要用 Grafana 硬幹。

## Reference

- [使用 Prometheus 和 Grafana 打造 Flask Web App 監控預警系統](https://blog.techbridge.cc/2019/08/26/how-to-use-prometheus-grafana-in-flask-app/)
- [Grafana Labs](https://grafana.com/)
