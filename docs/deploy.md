# Deploy To Firebase Hosting

Firebase Hosting 部署的是 **`dist/` 資料夾**（`npm run build` 的產物），**不是**開發用的 `npm run dev`。

## 本機怎麼測？

| 指令 | 用途 | 網址 |
|------|------|------|
| `npm run dev` | 開發模式（熱更新） | http://localhost:5173 |
| `npm run build && npm run preview` | **模擬 Firebase 正式版** | http://localhost:4173 |
| `npm run deploy` | 建置後上傳 Firebase | 你的 `.web.app` 網域 |

> 若直接雙擊 `index.html`、或沒先 `npm run build` 就部署，Babylon / 天氣模組會載入失敗。

## 1. Configure Firebase

1. Create a Firebase project.
2. Register a Web App.
3. Copy the Web App config into `public/js/firebase-config.js`.
4. Copy `.firebaserc.example` to `.firebaserc`.
5. Replace `your-firebase-project-id` with the real project id.

## 2. Build

```bash
npm run build
```

## 3. Deploy

```bash
npm run deploy
```

The deploy command uses `npx firebase-tools deploy --only hosting`, so it will ask for Firebase login/project access if the machine is not authenticated.
