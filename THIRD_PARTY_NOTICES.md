# Third-Party Notices

本项目包含以下第三方开源代码，均已本地化到 `vendor/` 目录，运行时不依赖外部 CDN。

## three.js

- 版本：r160 (0.160.0)
- 主页：https://threejs.org
- 仓库：https://github.com/mrdoob/three.js
- 许可证：MIT
- 版权：Copyright © 2010-2024 three.js authors

本地化文件：

| 路径 | 说明 |
| --- | --- |
| `vendor/three/build/three.module.js` | three.js 核心（ES Module） |
| `vendor/three/examples/jsm/postprocessing/EffectComposer.js` | 后期处理链 |
| `vendor/three/examples/jsm/postprocessing/RenderPass.js` | 场景渲染通道 |
| `vendor/three/examples/jsm/postprocessing/BokehPass.js` | Depth of Field 景深 |
| `vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js` | 辉光 |
| `vendor/three/examples/jsm/postprocessing/OutputPass.js` | 色彩空间输出 |
| `vendor/three/examples/jsm/postprocessing/{Pass,ShaderPass,MaskPass}.js` | 通道基类与依赖 |
| `vendor/three/examples/jsm/shaders/{CopyShader,BokehShader,OutputShader,LuminosityHighPassShader}.js` | 对应着色器 |
| `vendor/three/LICENSE` | 原始 MIT 许可证文本 |

MIT License 全文见 `vendor/three/LICENSE`。
