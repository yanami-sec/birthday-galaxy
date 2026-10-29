# 可选背景音乐

开源版默认静音，不附带商业音乐。请使用你拥有相应使用与分发授权的音频。

将文件放入此目录，例如 `my-birthday.mp3`，再修改 `web/app.js`：

```js
const BACKGROUND_MUSIC = { src: "audio/my-birthday.mp3", title: "我的生日音乐" };
```

点击开场蛋糕后才会播放，页面中可静音。音频默认被 `.gitignore` 排除；部署前请自行确认音频的使用范围。
