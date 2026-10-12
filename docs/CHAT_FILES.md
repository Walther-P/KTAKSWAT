# 通訊附件（2026-10-12）

KTAK GPT-6 與 KTAK SWAT 共用的通訊文件功能：

- 每檔上限 50 MiB（畫面簡稱 50 MB；52,428,800 bytes），未升級付費服務。
- 支援 doc/docx、xls/xlsx、ppt/pptx、PDF、ODT/ODS/ODP、RTF、TXT/CSV/JSON/XML、ZIP/7z/RAR、KML/KMZ、JPEG/PNG/WebP。
- 電腦將一個檔案拖進聊天室，確認檔名後按「送出」。多文件可先壓縮成 ZIP。
- 手機點「檔案」選取；大檔傳送期間請保持 App 在前景。iOS 切換背景可能暫停上傳。
- 分段上傳、進度、短暫斷線自動重試；失敗保留待傳附件。重新開啟 App 不保留本機 File 物件。
- 房間權限維持原規則；附件儲存桶仍為私人，沒有公開檔案網址。
- 免費方案的總儲存空間／流量限制仍適用，50 MB 是單檔限制。

部署設定：共享測試後端 pvkbdmpwfrojmftncxmy 的 ktak-chat 桶 file_size_limit=52428800，原 MIME 清單另加入 ODF、RTF、7z、RAR。未修改 ktak-object-media 或正式 3.5 後端。

驗證：node scripts/test-gpt6-chat-files.mjs；實際儲存測試 scripts/test-gpt6-chat-storage.mjs 需既有虛構使用者 session，測試後刪除所有測試物件與房間。不要提交 session 或服務金鑰。
