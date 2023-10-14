import { LitElement, css } from "lit";
import { customElement } from "lit/decorators.js";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";

// Define interfaces for plugins
export interface RenderPlugin {
  apply: (
    composer: EffectComposer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) => void;
}

export interface LightingPlugin {
  apply: (scene: THREE.Scene) => void;
}

interface BaseAnimateOptions {
  showAxisHelper?: boolean;
  renderPlugin?: RenderPlugin;
  lightingPlugin?: LightingPlugin;
}

@customElement("base-animate-element")
export class BaseAnimateElement extends LitElement {
  static styles = css`
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `;

  protected scene?: THREE.Scene;
  protected camera?: THREE.PerspectiveCamera;
  protected clock: THREE.Clock = new THREE.Clock();
  protected renderer?: THREE.WebGLRenderer;
  protected composer?: EffectComposer;
  protected options: BaseAnimateOptions;

  private boundHandleResize: any;

  constructor(options: BaseAnimateOptions = {}) {
    super();
    this.options = this.validateOptions(options);
    this.boundHandleResize = this.handleResize.bind(this); // bind once and keep the reference
  }

  private validateOptions(options: BaseAnimateOptions): BaseAnimateOptions {
    return options;
  }

  protected beforeInitialize(): this {
    return this;
  }

  protected afterInitialize(): this {
    return this;
  }

  protected initialize() {
    this.beforeInitialize();
    this.initScene().initCamera().initRenderer().initComposer().initLighting();
    this.afterInitialize();
    return this;
  }

  public firstUpdated() {
    this.initialize();
    window.addEventListener("resize", this.boundHandleResize); // Use the bound function
  }

  protected getContainer() {
    return this.shadowRoot?.querySelector('[data-container="3d-scene"]');
  }

  protected initScene() {
    this.scene = new THREE.Scene();
    if (this.options.showAxisHelper) {
      const axisHelper = new THREE.AxesHelper(5);
      this.scene.add(axisHelper);
    }
    return this;
  }

  protected initCamera() {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.camera = new THREE.PerspectiveCamera(16, width / height, 0.1, 1000);
    return this;
  }

  protected initRenderer() {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    container?.appendChild(this.renderer.domElement);
    return this;
  }

  private applyDefaultRendering(
    composer: EffectComposer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    // Your default rendering logic here.
    // For example, you can add basic passes to the composer.
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
  }

  protected initComposer() {
    if (!this.scene || !this.clock || !this.camera || !this.renderer)
      return this;
    this.composer = new EffectComposer(this.renderer);
    if (this.options.renderPlugin) {
      this.options.renderPlugin.apply(this.composer, this.scene, this.camera);
    } else {
      this.applyDefaultRendering(this.composer, this.scene, this.camera);
    }
    return this;
  }

  protected initLighting() {
    if (!this.scene) return this;
    if (this.options.lightingPlugin) {
      this.options.lightingPlugin.apply(this.scene);
    } else {
      this.scene.add(new THREE.AmbientLight(0x757f8e, 3));
      const directionalLight = new THREE.DirectionalLight(0xfffecd, 1.5);
      directionalLight.position.set(100, 100, 100);
      this.scene.add(directionalLight);
    }
    return this;
  }

  disconnectedCallback(): void {
    window.removeEventListener("resize", this.boundHandleResize); // Use the bound function
    super.disconnectedCallback();
  }

  protected handleResize() {
    const container = this.shadowRoot?.querySelector("div");
    if (!container || !this.renderer || !this.camera || !this.composer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
}
