---
title: 更好的選擇？用 JWT 取代 Session 的風險
description: 
date: 2023-01-13
scheduled: 2023-01-13
tags:
layout: zh-tw/layouts/post.njk
draft: true
---

Ticket
https://atlassian.net/browse/{TicketNumber}

Description
Refer to Writing good CL descriptions to write a CL description to describe what change is being made and why it was made.

Example for Functionality change

Example for Refactoring

Example for Small CL


For example:
rpc: remove size limit on RPC server message freelist.
Servers like FizzBuzz have very large messages and would benefit from reuse. Make the freelist larger, and add a goroutine that frees the freelist entries slowly over time, so that idle servers eventually release all freelist entries.

Test
Providing screenshots to prove CLs meet expectations by integrating with Postman/BloomRPC/curl or running related unit tests.

Dependency

Expected Reviewers/Watchers

to:
cc:

Author Checklist

Check the spec has been confirmed with PM/QA/FE/BE and other stakeholders.
Check target branch is correct and whether it needed to delete the request branch after the MR merged.
Check commits are separated well and in compliance with Commit Format.
Check pipeline stages are passed.
Check all threads are replied to even if there is no change made.

加上 GitLab 的操作方式

## Reference