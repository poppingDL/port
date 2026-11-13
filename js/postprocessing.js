// ========== 后期处理：Depth of Field（景深）+ Bloom 辉光 ==========
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * 创建带 DOF 景深的 EffectComposer
 * 注意：BokehPass 的 focus 是相机到对焦面的距离，必须跟相机距离同步更新，
 * 否则会把整个场景虚化（画面看起来像空白）。
 */
export function createComposer(renderer, scene, camera, width, height) {
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);

  // 基础渲染通道
  composer.addPass(new RenderPass(scene, camera));

  // 景深：对焦在港口主体上，前后景自然虚化
  const bokehPass = new BokehPass(scene, camera, {
    focus: 95.0,
    aperture: 0.0005,
    maxblur: 0.005
  });
  composer.addPass(bokehPass);

  // 轻度辉光，强化深色科技风（灯光、标牌、岸桥发光条）
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.32,  // strength
    0.55,  // radius
    0.82   // threshold
  );
  composer.addPass(bloomPass);

  // 颜色输出通道（保证色彩空间正确）
  composer.addPass(new OutputPass());

  return {
    composer,
    bokehPass,
    bloomPass,
    /** 每帧根据相机到主体的距离更新对焦距离 */
    updateFocus(distance) {
      bokehPass.uniforms.focus.value = distance;
    },
    setSize(w, h) {
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
    },
    render() {
      composer.render();
    }
  };
}
