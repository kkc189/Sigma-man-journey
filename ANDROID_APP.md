# Android App 打包说明

这个项目已经接入 Capacitor，可以把当前 Next.js 网页打包成 Android App。

## 已完成

- Android 工程目录：`android/`
- App ID：`com.lifegrowth.record`
- App 名称：`男神进化日记`
- Android 网页资源目录：`out/`
- App 图标已使用 `public/icons/icon-512.png` 生成
- 已加入前台 GPS 权限：
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.ACCESS_FINE_LOCATION`
- 已加入 Supabase 邮箱登录 App 回调：
  - `com.lifegrowth.record://auth-callback`

## 常用命令

```bash
npm run build:android:web
```

生成 Android App 使用的静态网页资源到 `out/`。

```bash
npm run android:sync
```

重新构建网页，并同步到 `android/` 原生工程。

```bash
npm run android:open
```

同步后用 Android Studio 打开工程。

```bash
npm run android:apk
```

直接构建 debug APK。

debug APK 默认输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 电脑需要安装

- Java 21：`/opt/homebrew/opt/openjdk@21`
- Android SDK：`/opt/homebrew/share/android-commandlinetools`
- Android SDK Platform：`android-36`
- Android Build Tools：`35.0.0`、`36.0.0`
- Android Platform Tools：`37.0.0`

当前这台 Mac 已经可以直接运行：

```bash
npm run android:apk
```

如果要用图形界面调试，也可以安装 Android Studio，然后运行：

```bash
npm run android:open
```

## Supabase 需要额外配置

如果要让 Android App 的邮箱免密码登录正常回到 App，需要在 Supabase Dashboard 里加入 Redirect URL：

```text
com.lifegrowth.record://auth-callback
```

位置：

```text
Authentication > URL Configuration > Redirect URLs > Add URL
```

网页版本继续使用原来的站点 URL，例如：

```text
https://life-growth-record.vercel.app
```

## 注意

这个 Android App 会把网页界面打包进 APK，所以打开界面不依赖 Vercel。

但是云端登录、保存记录、一起跑步这些功能仍然需要访问 Supabase。如果中国大陆网络访问 Supabase 不稳定，后续需要把后端和数据库迁到国内服务器。

目前已生成 debug APK：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```
