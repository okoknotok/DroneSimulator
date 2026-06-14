# 無人機編程模擬平台

這是原本 `Drone Blockly - 完整版 v3.4` 的升級版，保留原本 Babylon.js + Blockly 玩法，並加入本機進度、Builder metadata、Firebase 雲端同步入口、老師/學生模式和 Firebase Hosting 部署設定。

## 開始使用

```bash
npm install
npm run dev
```

## 主要功能

- 編程模式：Blockly 積木控制無人機完成 18 個關卡。
- 無盡 Cyberpunk：手動操控、射擊、收集和躲避。
- 關卡設計：自訂起點、終點、障礙物、檢查點和寶物。
- 本機儲存：關卡進度、最佳紀錄、Blockly 草稿和 Builder 草稿。
- Firebase：可選的雲端進度、提交記錄和自訂關卡儲存。
- 老師工具：本機成績 CSV 匯出和排行榜檢視。

## Firebase 設定

填寫 `public/js/firebase-config.js`：

```js
window.DRONE_FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
```

如果設定值留空，作品仍可完全離線使用。

## 建置與部署

```bash
npm run build
npm run preview
```

Firebase Hosting 部署請看 `docs/deploy.md`。
