import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';

@customElement('thumbnail-element')
export class ThumbnailElement extends LitElement {

  static styles = css`
    div {
      width: 100%;
      position: relative;
      aspect-ratio: 5 / 3;
      border-radius: 16px;
      overflow: hidden;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;

    }
  `;

  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera
  clock?: THREE.Clock;
  renderer?: THREE.WebGLRenderer;
  composer?: EffectComposer;
  parentObject?: THREE.Object3D;

  
  constructor() {
    super();
    this.clock = new THREE.Clock();
    this.animateScene = this.animateScene.bind(this);
  }
  getContainer(){
    return this.shadowRoot?.querySelector('div');
  }

  firstUpdated() {
    if(!this.initialize()) return;
    this.addObject();
    this.animateScene();
    window.addEventListener('resize', this.handleResize.bind(this)); // Register resize event listener
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  handleResize() {
    const container = this.shadowRoot?.querySelector('div');
    if (!container || !this.renderer || !this.camera || !this.composer) return;
  
    const width = container.clientWidth;
    const height = container.clientHeight;
  
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  initialize(){
    return this.initScene() && this.initCamera() && this.initRenderer() && this.initComposer() && this.initLighting();
  }


  initScene() {
    this.scene = new THREE.Scene();
    this.parentObject = new THREE.Object3D();
    this.scene.add(this.parentObject);

    // add objects to scene (Helper)
    const axisHelper = new THREE.AxesHelper( 5 );
    this.scene.add( axisHelper );
    return true;
  }

  initCamera() {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.camera = new THREE.PerspectiveCamera(16, width / height, 0.1, 1000);
    return true;
  }

  initRenderer() {
    const container = this.getContainer();
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    container?.appendChild(this.renderer.domElement);
    return true;
  }

  initComposer() {
    if (!this.scene || !this.clock || !this.camera || !this.renderer) return;
    this.composer = new EffectComposer(this.renderer);
    const renderPixelatedPass = new RenderPixelatedPass(16, this.scene, this.camera,{
      normalEdgeStrength: 1,
      depthEdgeStrength: 1,
    });
    this.composer.addPass(renderPixelatedPass);
    return true;
  }

  initLighting() {
    if (!this.scene) return;
    this.scene.add(new THREE.AmbientLight(0x757f8e, 3));
    const directionalLight = new THREE.DirectionalLight(0xfffecd, 1.5);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(directionalLight);
    const spotLight = new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, .02, 2);
    spotLight.position.set(2, 2, 0);
    const target = spotLight.target;
    this.scene.add(target);
    target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    this.scene.add(spotLight);
    return true;
  }


  addObject() {
    if (!this.scene || !this.clock || !this.camera || !this.renderer || !this.parentObject) return;

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
    return html`<div></div>`;
  }
}
