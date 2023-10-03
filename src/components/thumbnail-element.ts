import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as THREE from 'three';
import { BaseAnimateElement } from './common/animate/base-animate-element';



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
    if (!this.parentObject || !this.scene || !this.camera || !this.renderer || !this.clock) return;
    requestAnimationFrame(this.animateScene);
    this.parentObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 200);
    this.composer?.render();
  }

  render() {
    return html`
    <div data-container="3d-scene"></div>`;
  }
}
