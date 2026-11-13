// ========== 后期处理：Depth of Field（景深）==========
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * 创建带 DOF 景深效果的 EffectComposer
 * focusDistance / focalLength / aperture 控制景深范围，突出中央港口主体
 */
export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  // 基础渲染通道
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bokeh 景深通道
  const bokehPass = new BokehPass(scene, camera, {
    focus: 35.0,       // 焦距（与相机到主体的距离匹配）
    aperture: 0.0025,  // 光圈，越大虚化越强
    maxblur: 0.006     // 最大模糊量
  });
  bokehPass.enabled = true;
  composer.addPass(bokehPass);

  // 颜色输出通道（保证色彩空间正确）
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  composer.userData.bokehPass = bokehPass;
  return composer;
}
