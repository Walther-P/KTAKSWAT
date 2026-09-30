# KTAK SWAT

以 KTAK GPT-6 為基礎的獨立共同編輯版本。2026-09-30：程式與核心後端測試完成，GitHub 儲存庫已建立，Pages 發佈與線上驗收進行中。

## 使用方式
建立任務（名稱、暱稱可留空）→ 分享房間 → 傳送完整連結。收到連結的人匿名加入，無需設定房間密碼或選擇角色。持有連結即擁有完整查看、編輯與刪除內容的權限。首次使用保留 Cloudflare 安全驗證；推播仍須使用者允許。

保留任務簡報、Google／OSM 地圖、圖樣、戰術板、聊天室、派遣、SOS、雷達與即時影像等既有功能。「指揮」頁籤更名「協作」。現有 GPT-6 與 3.5 不受修改。

## GitHub 發佈待辦
1. 在 Walther-P 帳號建立公開 KTAKSWAT 儲存庫，初始化 README，讓既有 GitHub 連線可存取它。
2. 將此原始碼放入 main。在 Settings → Pages 選 GitHub Actions，執行 Publish KTAK SWAT workflow。
3. 在既有 Cloudflare Turnstile widget 的 Hostname Management 加入 walther-p.github.io。若 Google 金鑰有 referrer 限制，需允許實際 GitHub Pages 網址。
4. 發佈後驗證 HTTPS 首次建立房間、分享連結匿名加入、Google 地圖、推播訂閱、PWA 更新。尚未完成這些線上驗收。

## 開發
Node.js 22；npm ci；npm run build；node scripts/test-swat.mjs。dist 是可發佈網站。
config/build-public.json 只有已公開於前端的服務設定，不含 service-role、Turnstile secret 或管理密碼。

SWAT 使用現有 GPT-6 測試後端，但房間另行登記，SWAT 連結不能用來加入一般 GPT-6 房間。supabase/swat-link-rooms.sql 已在測試後端套用；請勿任意重跑歷史 SQL。實作沿用後端既有最高房間權限，SWAT 介面不暴露角色分級。

## 驗證結果與限制
- 建置成功；原有 12 項派案測試通過。
- SWAT 品牌、入口、獨立儲存、PWA 子路徑及程式語法檢查通過。
- 實際資料庫交易測試：無密碼開房、有效連結加入、第二位成員修改第一位成員的簡報與圖樣、無效連結拒絕、未加入者讀寫拒絕、連結雜湊資料表不可直接讀取。測試後 rollback，未留下測試房間。
- 手機寬度本機介面確認：角色與密碼設定移除、共同編輯說明和分享入口正常。UI fixture 不代表登入與同步完整驗收。
- 尚未驗證 GitHub Pages 線上首次登入、實機 iOS、背景推播；不可宣稱已上線或所有功能全數重測。
