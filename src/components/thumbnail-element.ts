import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { stopGoEased } from 'src/utils/animate/animate';
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
  torus?: THREE.Mesh;
  composer?: EffectComposer;
  parentObject?: THREE.Object3D;

  
  constructor() {
    super();
    this.animateScene = this.animateScene.bind(this);

  }



  firstUpdated() {
    this.init();
    this.animateScene();
    window.addEventListener('resize', this.handleResize.bind(this)); // Register resize event listener
  }

  handleResize() {
    const container = this.shadowRoot?.querySelector('div');
    if (!container || !this.renderer || !this.camera || !this.composer) return;
  
    const width = container.clientWidth;
    const height = container.clientHeight;
  
    // Update camera aspect ratio and recompute the projection matrix.
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  
    // Update renderer and composer sizes.
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
  

  init() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    
    const container = this.shadowRoot?.querySelector('div');
    const width = container?.clientWidth || 0;
    const height = container?.clientHeight || 0;
    
    this.camera = new THREE.PerspectiveCamera(16, width / height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    container?.appendChild(this.renderer.domElement);
    
    // Setup EffectComposer and RenderPixelatedPass
    this.composer = new EffectComposer(this.renderer);
    const renderPixelatedPass = new RenderPixelatedPass(16, this.scene, this.camera,{
      depthEdgeStrength: 1,
    });
    this.composer.addPass(renderPixelatedPass);

    this.parentObject = new THREE.Object3D();
    this.scene.add(this.parentObject);
    


    const geometry = new THREE.TorusGeometry( 2, 1, 10, 50 ); 
    const material = new THREE.MeshPhongMaterial({
			color: 0x68b7e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff
    });

    this.torus = new THREE.Mesh(geometry, material); // 'cube' object will now represent an icosahedron
    this.parentObject.add(this.torus);





    // const axisHelper = new THREE.AxesHelper( 5 );
    // this.scene.add( axisHelper );


    this.parentObject.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 6);

    // this.camera.position.x = 6;
    this.camera.position.y = 0;
    this.camera.position.z = 8;
    // this.camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);




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
  }

  animateScene() {
    if (!this.parentObject || !this.scene || !this.camera || !this.renderer || !this.torus || !this.clock) return;

    requestAnimationFrame(this.animateScene);

    // this.cube.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 100);
    // this.parentObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 100);


    // const t = this.clock.getElapsedTime();
    
    // if(this.torus.material instanceof THREE.MeshPhongMaterial) {
    //   this.torus.material.emissiveIntensity = Math.sin(t * 3) * .5 + .5;
    // }
    // this.cube.position.y = .7 + Math.sin(t * 2) * .05;
    // this.parentObject.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;
    // this.parentObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 100);
    this.parentObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 200);
    // const rendererSize = this.renderer.getSize(new THREE.Vector2());

    this.composer?.render();
  }

  render() {
    return html`<div></div>`;
  }
}
