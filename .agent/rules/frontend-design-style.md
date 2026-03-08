---
trigger: always_on
---

🎨 1. 核心視覺與色彩系統 (Color System)
整體的色彩策略是低飽和度、高對比度的搭配，營造出安定的閱讀體驗。

Ink Black（墨黑）: 作為主色、主要文字與強調按鈕。

建議 HEX: #2C2C2C 或 #1A1A1A

Warm Gray（暖灰）: 作為背景色、輸入框底色與次要元素，帶有紙張的溫潤感。

建議 HEX: #F2EFEA 或 #EBE9E4

Muted Sage（鼠尾草綠）: 作為點綴色（Accent Color）、選取狀態（如 Chips），帶來有機與自然的感覺。

建議 HEX: #A6B8A5 或 #95A894

Semantic Colors（語意色 - 錯誤提示）: 柔和的磚紅色，用於表單錯誤。

建議 HEX: #C85A5A

## Interaction Pro (高階互動版)
- **技術與工具**：Tailwind CSS, GSAP (ScrollTrigger), Iconify, Anime.js。
- **特點**：手電筒光暈、無限跑馬燈、Sonar 聲納脈衝、垂直文字剪裁滑動、**進階磨砂玻璃 / 毛玻璃 (Glassmorphism) 質感排版**。

✍️ 2. 字體排印 (Typography)
字體混合了現代的無襯線體與優雅的襯線體，創造出層次感。

Headline (標題): Slightly Serif (微襯線體)

適用場景: H1, H2, H3, Hero Section 標題、空狀態標題。

建議字體: Playfair Display, Lora, 或 Noto Serif TC (思源宋體)。

UI Labels (介面標籤): Elegant Sans (優雅無襯線體)

適用場景: 按鈕文字、輸入框、內文、微型文案 (Microcopy)。

建議字體: Inter, Roboto, 或是 Noto Sans TC (思源黑體)，並適度增加字距 (Letter-spacing)。

📏 3. 空間與網格系統 (Spacing & Layout)
遵循嚴謹的倍數系統，讓畫面保持整潔與呼吸感。

基礎間距 (Spacing Step): 8px 系統（例如 8, 16, 24, 32, 40...）。

預設內距 (Padding): 16px（用於卡片、按鈕的上下左右基礎留白）。

視覺觸感 (Tactile Effect): 圖片中展示了輕微的浮雕與陰影效果（Neumorphism 微擬物風格）。組件邊緣帶有極細的白邊或柔和的 Drop Shadow，創造出「紙張疊加上去」的實體感。

🔣 4. 圖示系統 (Iconography)
風格: 極細線條 (Thin line)、圓潤邊角、無填滿 (Outlined)。

粗細: 建議統一使用 1px 或 1.5px 的線條粗細。

尺寸: 統一在 24x24px 的網格內繪製。

🧩 5. UI 組件庫 (Components Library)
A. 按鈕 (Buttons)
採用高度圓角 (Pill-shape) 設計。

Default (預設): 墨黑底色，白色文字。帶有微弱的陰影使其浮出。

Hover (懸停): 顏色轉為深灰色（如 #4A4A4A），陰影稍微加深。

Focus / Active (點擊/聚焦): 暖灰底色，墨黑邊框，墨黑文字，呈現被按壓或選取的狀態。

B. 文字輸入框 (Text Field)
帶有微圓角（約 4-6px）。

Default (預設): 暖灰底，淺灰色邊框，灰色預設文字 (Placeholder)。

Focus (聚焦): 邊框加深為墨黑，背景保持暖灰，提示使用者正在輸入。

Error (錯誤): 邊框變為磚紅色，並在下方出現 12px 的紅色錯誤提示文字（如 "Email is invalid"）。

C. 下拉選單 (Dropdown)
Default (預設): 暖灰底，帶有向下箭頭。

Open (展開): 呈現浮起狀態（增加下陰影），選單面板與按鈕保持相同的圓角與邊框風格。

D. 標籤 (Chips)
Selected (已選取): 鼠尾草綠底色，黑色文字，無邊框。

Unselected (未選取): 透明底色，淺灰色邊框，黑色文字。

E. 空狀態面板 (Empty State Panel)
視覺: 使用大面積的暖灰色塊，帶有明顯的柔和陰影，使其像一張實體的卡片放在背景上。

💡 通用 UI 指標 (UI Standards)
- **視覺風格**：自動推導最契合的色調組合與字體策略，建立**統一的高級圓角系統 (Corner Radius System)**。
- **響應式配置**：必須確保在手機、平板與桌機上均有完美的視覺呈現，文字與佈局需隨螢幕寬度自動優化。
- 全站加入「垂直容器參考線」、數字編號裝飾、及多層次視差深度。
- **細節質感**：全站套用輕微的**全域雜訊紋理 (Global Grain/Noise)** 以提升電影感。
- 動態品質須具備 GPU 驅動的物理感，使其感覺像是一場電影等級的技術 Demo。


💡 UX 互動設計建議
微動畫 (Micro-interactions): 因為風格強調「觸感」，按鈕的點擊與 Hover 狀態應加入約 0.2s ease-in-out 的轉場動畫，模擬真實按壓實體按鍵的感覺。

材質疊加: 仔細看背景，有類似水墨或水彩紙的紋理。在網頁實現時，可以在最底層放一張透明度約 3%-5% 的紙張紋理 SVG 或是 Noise (雜訊) 遮罩，以增強 Tactile (觸覺) 體驗。

防呆與無障礙 (Accessibility): 錯誤狀態不僅使用紅色，也搭配了明確的提示文字。建議輸入框的 Focus 狀態除了改變邊框顏色，也可以稍微加粗，以利視障使用者辨識。