// BaseAnimateElement.ts
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';


@customElement('base-animate-element')
export class BaseAnimateElement extends LitElement {
  protected scene?: THREE.Scene;
  protected camera?: THREE.PerspectiveCamera;
  protected clock: THREE.Clock = new THREE.Clock();
  protected renderer?: THREE.WebGLRenderer;
  protected composer?: EffectComposer;

  protected getContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector('div');
  }

  protected initScene(): boolean {
    this.scene = new THREE.Scene();
    return true;
  }

  protected initCamera(): boolean {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.camera = new THREE.PerspectiveCamera(16, width / height, 0.1, 1000);
    return true;
  }

  protected initRenderer(): boolean {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    container?.appendChild(this.renderer.domElement);
    return true;
  }

  protected handleResize(): void {
    const container = this.getContainer();
    if (!container || !this.renderer || !this.camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  firstUpdated(): void {
    if (!this.initScene() || !this.initCamera() || !this.initRenderer()) return;
    this.addCustomObject();
    this.animateScene();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  protected addCustomObject(): void {
    // To be overridden by subclasses
  }

  protected animateScene(): void {
    // To be overridden by subclasses
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    super.disconnectedCallback();
  }
}