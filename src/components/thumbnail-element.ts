import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as THREE from 'three';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { BaseAnimateElement, type LightingPlugin, type RenderPlugin } from './common/animate/base-animate-element';

const defaultRenderPlugin: RenderPlugin = {
  apply: (composer, scene, camera) => {
    const renderPixelatedPass = new RenderPixelatedPass(16, scene, camera, {
      normalEdgeStrength: 1,
      depthEdgeStrength: 1,
    });
    composer.addPass(renderPixelatedPass);
  },
};

const defaultLightingPlugin: LightingPlugin = {
  apply: (scene) => {
    scene.add(new THREE.AmbientLight(0x757f8e, 3));
    const directionalLight = new THREE.DirectionalLight(0xfffecd, 1.5);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    scene.add(directionalLight);
    const spotLight = new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, .02, 2);
    spotLight.position.set(2, 2, 0);
    const target = spotLight.target;
    scene.add(target);
    target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    scene.add(spotLight);
  },
};

@customElement('thumbnail-element')
export class ThumbnailElement extends BaseAnimateElement {

  static styles = css`
    div {
      width: 100%;
      position: relative;
      aspect-ratio: 5 / 3;
      border-radius: 16px;
      overflow: hidden;
    }
  `;

  parentObject?: THREE.Object3D;

  constructor() {
    super({
      showAxisHelper:true,
      renderPlugin: defaultRenderPlugin,
      lightingPlugin: defaultLightingPlugin,
    });
    this.animateScene = this.animateScene.bind(this);
  }

  firstUpdated() {
    super.firstUpdated();
    this.addObject();
    this.animateScene();
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  addObject() {
    if (!this.scene || !this.clock || !this.camera || !this.renderer) return;
    this.parentObject = new THREE.Object3D();
    this.scene.add(this.parentObject);
    this.parentObject.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 6);
    
    // add objects to scene (Child Object)
    const geometry = new THREE.TorusGeometry( 2, 1, 10, 50 ); 
    const material = new THREE.MeshPhongMaterial({
			color: 0xFFC0CB,
      emissive: 0x4f7e8b,
      shininess: 50,
      specular: 0xffffff,
    });
    const torus = new THREE.Mesh(geometry, material)
    this.parentObject.add(torus);

    // set camera position
    this.camera.position.y = 0;
    this.camera.position.z = 8;
  }

  animateScene() {
    if (!this.composer || !this.parentObject || !this.scene || !this.camera || !this.renderer || !this.clock) return;
    requestAnimationFrame(this.animateScene);
    this.parentObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 200);
    this.composer.render();
  }

  render() {
    return html`
    <div data-container="3d-scene"></div>`;
  }
}
