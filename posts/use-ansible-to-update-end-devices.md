---
title: 配置即代碼：Ansible 入門
description: 之前負責產品研發時，常常需要因應客戶需求，更新終端裝置上的應用程式。因為終端裝置在廠區可能一次就是幾十幾百台，如果用手動更新大概當天就不用做事了。Ansible 這類組態管理(Configuration Management)軟體就是為此而生。相對於同類軟體，Ansible 的系統需求單純，只要 Client 端有安裝 Python 即可，很適合資源受限的嵌入式系統。…
date: 2019-11-26
scheduled: 2019-11-26
tags:
  - Cloud Native
  - Ansible
layout: zh-tw/layouts/post.njk
---

之前負責產品研發時，常常需要因應客戶需求，更新終端裝置上的應用程式。因為終端裝置在廠區可能一次就是幾十幾百台，如果用手動更新大概當天就不用做事了。Ansible 這類組態管理(Configuration Management)軟體就是為此而生。相對於同類軟體，Ansible 的系統需求單純，只要 Client 端有安裝 Python 即可，很適合資源受限的嵌入式系統。

這篇會用 Ansible 來模擬簡單的 Python 應用程式更新，看看它如何處理 Deployment 的問題。

## Install Ansible and Setup Environment

首先在 Server 端安裝 Ansible，如果你使用的是 Ubuntu 的話，只需要執行

```bash
sudo apt-get install ansible
```

同時，使用一台 Raspberry Pi Model B 來當成終端裝置，沒有 RPi 也可以用 VirtualBox + Vagrant 搭建虛擬機來使用。

![](/img/posts/use-ansible-to-update-end-devices/rpi3-1.webp)

因為 Ansible 是使用 SSH 進行遠端操作，記得要打開 RPi 上的 SSH

```bash
sudo raspi-config
```

![](/img/posts/use-ansible-to-update-end-devices/rpi3-2.webp)

選擇 Interfacing Options 後，打開 P2 SSH。

最後要記得確認 RPi 上有 Python

```bash
python3 --version
```

## Setup Host Information

我們必須告訴 Ansible 要連接的主機是哪些，相關資訊是什麼，這些 Client 端的裝置，在 Ansible 術語中稱為 Inventory。先假設工作目錄為 playbook，則先在該目錄下新增一個 hosts，來描述終端裝置

```
playbook/
    hosts               *# inventory file for production servers*
```

該檔案內容為

```ini
pi ansible_host=192.168.5.10 ansible_user=pi
```

由內容可以知道，該裝置名稱是 pi，IP 是 192.168.5.10，而用來登入的使用者名稱為 pi。

接著可以執行 Ansible 的測試命令 ping，當裝置收到後，會回應 pong，表示兩者間通訊正常

```bash
# -i is inventory
# -m is command module

ken@ken-Lenovo-ideapad-330-15ICH:~/git/ansible/raspberry/playbooks$ ansible pi -i hosts -m ping
pi | SUCCESS => {
    "changed": false, 
    "ping": "pong"
}
```

## Setup Ansible Config File

因為每台裝置需要寫 hosts 來對應會很麻煩，如果裝置有共通欄位，例如 RPi 的 remote_user 都是 pi，能不能使用共同文件來設定？Ansible 的 config 檔就是為了滿足這個需求。我們在工作目錄下加入 config

```
playbook/
    hosts               *# inventory file for production servers
    ansible.cfg         *# ansible config file*
```

檔案內容如下

```ini
[defaults]
inventory = hosts
remote_user = pi
host_key_checking = False
```

將預設的 inventory 指向 hosts，預設的 user 設為 pi，如此一來，inventory file 中就無需描述多餘資訊，hosts 可以改成

```ini
pi ansible_host=192.168.5.10
```

因為 config 檔中已經指定 inventory 為 hosts，之後執行 Ansible 時就不用指定 -i 了。這次使用另外一個 Ansible 的命令來看 uptime 的時間

```bash
ken@ken-Lenovo-ideapad-330-15ICH:~/git/ansible/raspberry/playbooks$ ansible pi -m command -a uptime
pi | SUCCESS | rc=0 >>
    16:28:46 up  2:48,  4 users,  load average: 0.08, 0.05, 0.01
```

如上，可以看到 RPi 從啟動到下指令，中間經過 2:48。

## Write a Playbook

在前面的步驟中，我們透過 Ansible 對遠端裝置進行單次指令，但如果組態設定或部署需要一次進行多次指令的話，我們可以怎麼做？Ansible 有個工具稱為 playbook，類似劇本，只要 user 依照 yaml 格式編寫好，Ansible 就會根據 playbook 來執行指令。

為了使用 playbook，在工作目錄中加入 playbook 的檔案

```
playbook/
    hosts               *# inventory file for production servers
    ansible.cfg         *# ansible config file
    pi-update.yml       *# ansible playbook*
```

內容如下

```yaml
- name: Update python script
  hosts: end-devices
  become: True
  tasks:
  - name: copy python file
    copy: src=files/hello.py dest=/home/pi/ansible/hello.py mode=0644
  - name: run python file
    command: python3 /home/pi/ansible/hello.py
```

在這個 playbook 中，執行對象是 end-devices 這個 inventory 群組。這個 playbook 存在兩個 task，第一個用來將 hello.py 這支 python 的 copy 到終端裝置；第二個用來執行終端裝置上的 python 程式。

可以看到，inventory 由原先的 hosts 改為 end-devices，這是因為 inventory 可能是由多台機器組成的群組，因此我們改寫原先的 inventory file，將它變成

```ini
[end-devices]
pi ansible_host=192.168.5.10
```

在開頭加入群組名稱。

接著，在工作目錄創建要複製過去的檔案

```
playbook/
    hosts               *# inventory file for production servers
    ansible.cfg         *# ansible config file
    pi-update.yml       *# ansible playbook
    files/              *# files
      hello.py
```

hello.py 是個 python 的程式碼，用來印出 “Hello, world”

```py
print("Hello, world")
```

相關準備完成了，來看看執行的結果。執行 playbook 需要使用 ansible-playbook 這個命令

```bash
ken@ken-Lenovo-ideapad-330-15ICH:~/git/ansible/raspberry/playbooks$ ansible-playbook pi-update.yml

PLAY [Update python script] ********************************************************************

TASK [Gathering Facts] ********************************************************************
ok: [pi]

TASK [copy python file] ********************************************************************
changed: [pi]

TASK [run python file] ********************************************************************
changed: [pi]

PLAY RECAP ********************************************************************
pi                  : ok=3    changed=2    unreachable=0    failed=0
```

Ansible 會先收集裝置上的資訊，然後依照 playbook 來執行 task，changed 表示裝置被實際變動，由結果可看到 Ansible 將 hello.py 複製到 RPi 上，並且執行 python script。

## Add Debug Information

但是 hello.py 有印出 “Hello, world”，為什麼在執行結果沒看到呢？這是因為印出的資訊是在 RPi 上，如果要將輸出結果顯示到 Ansible 的結果中，可以修改 playbook 如下

```yaml
- name: Update python script
  hosts: end-devices
  become: True
  tasks:
  - name: copy python file
    copy: src=files/hello.py dest=/home/pi/ansible/hello.py mode=0644
  - name: run python file
    command: python3 /home/pi/ansible/hello.py
    register: hello
  - debug: var=hello
```

將 task 的結果用 register 註冊為 variable，再使用 debug 印出，方便除錯。

好的，再執行一次 ansible-playbook

```bash
ken@ken-Lenovo-ideapad-330-15ICH:~/git/ansible/raspberry/playbooks$ ansible-playbook pi-update.yml

PLAY [Update python script] ********************************************************************

TASK [Gathering Facts] ********************************************************************
ok: [pi]

TASK [copy python file] ********************************************************************
ok: [pi]

TASK [run python file] ********************************************************************
changed: [pi]

TASK [debug] ********************************************************************
ok: [pi] => {
    "hello": {
        "changed": true, 
        "cmd": [
            "python3", 
            "/home/pi/ansible/hello.py"
        ], 
        "delta": "0:00:00.779588", 
        "end": "2019-11-25 20:06:11.911999", 
        "failed": false, 
        "rc": 0, 
        "start": "2019-11-25 20:06:11.132411", 
        "stderr": "", 
        "stderr_lines": [], 
        "stdout": "Hello, world", 
        "stdout_lines": [
            "Hello, world"
        ]
    }
}

PLAY RECAP ********************************************************************
pi                 : ok=4    changed=1    unreachable=0    failed=0
```

這次就可以看到 stdout 結果是 “Hello, world”，同時因為 hello.py 已經複製過了，第一個 task 狀態改為 ok，而非 changed。

## 小結

初次上路，好在沒有翻車。Ansible 相對 expect 這類響應式腳本複雜不少，但需要的 cost 真的很低，只需要 python 就可以運行。優點是 framework 架構完整，修改性跟移植性高，當專案成長到一定規模，expect 維護起來很麻煩時，就可以考慮用 Ansible 來補充。

## Reference

- [《Ansible：建置與執行》](https://www.tenlong.com.tw/products/9789864768264)
- [Ansible Documentation
](https://docs.ansible.com/)
- [讓您安心執行 Ansible playbook 的小技巧（2）](https://medium.com/laraveldojo/%E8%AE%93%E6%82%A8%E5%AE%89%E5%BF%83%E5%9F%B7%E8%A1%8C-ansible-playbook-%E7%9A%84%E5%B0%8F%E6%8A%80%E5%B7%A7-2-856a60b19898?source=---------14------------------)
