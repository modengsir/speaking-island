# 素材与第三方说明

## 应用与模型

应用源代码及本项目制作的插画、动画代码与示范音频按根目录 MIT 许可证提供；下列第三方内容保留其独立许可证。Ming、百灵及其他产品名称仅用于说明使用的接口。仓库不包含 Ming 模型权重，不修改这些模型各自的许可证，也不包含任何服务调用额度或账号权限。

在线语音由蚂蚁百灵提供。使用者需要配置自己的密钥，API 使用受提供方的服务条款和账号权限约束。

## 绘本素材与音频

| 路径 | 来源 / 用途 |
| --- | --- |
| `public/media/picnic-background-v2.png` | 为本项目制作的 AI 生成野餐背景 |
| `public/media/mimi-bear-v2.png` | 为本项目制作的 AI 生成小熊角色；分层动效由 CSS 与组件实现 |
| `public/media/voice/v2/*.mp3` | Ming-3.0-tts 实际合成的 23 段固定英文示范，文本见同目录清单 |
| `public/media/connection-check-pear.wav` | 固定合成英语样例 “A pear, please.”；只用于连接检测 |
| `public/favicon.svg` | 本项目的图形标识 |

这些音频不包含真实儿童录音，没有使用孩子的声音进行克隆。缓存配音与在线 TTS 使用相同的模型别名；缓存文件本身不包含 API 密钥或用户识别记录。

## 字体

`public/fonts/island-title-black.ttf` 是用于「开口小岛」四个标题字的 Noto Sans SC 黑体子集，字体内部家族名为 Noto Sans SC Black，CSS 中使用 **Island Title Black** 别名，保留 900 字重。它沿用 **SIL Open Font License 1.1**，不改用 MIT。字体版权及完整许可证随文件保存于 [OFL-NotoSansSC.txt](public/fonts/OFL-NotoSansSC.txt)。

## 软件依赖

直接运行与构建依赖采用以下许可证；实际版本以 `package-lock.json` 为准。安装后，各依赖包内含相应许可证及版权声明，分发其代码时需保留。

| 依赖 | 许可证 |
| --- | --- |
| Next.js | MIT |
| React / React DOM | MIT |
| Lucide React | ISC |
| Tailwind CSS / @tailwindcss/postcss | MIT |
| TypeScript | Apache-2.0 |
| @types/node / @types/react / @types/react-dom | MIT |

传递依赖及其许可证见 `package-lock.json` 与各安装包。生成的生产构建可能包含依赖的运行时代码。
