import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {SelectController} from "./controllers/SelectController";
import {CanvasUI} from "./utils/CanvasUI";
import {FlashLightController} from "./controllers/FlashLightController";
import {DragController} from "./controllers/DragController";

import blimp from "../assets/Blimp.glb"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

class App {
  constructor() {
    const container = document.createElement('div')
    document.body.appendChild(container)

    this.camera = new THREE.PerspectiveCamera(50,
        window.innerWidth / window.innerHeight, 0.1, 200)
    this.camera.position.set( 0, 1.6, 3 )

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x505050)

    const ambient = new THREE.HemisphereLight( 0x606060, 0x404040, 1)
    this.scene.add(ambient)

    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set( 1, 1, 1 ).normalize()
    this.scene.add(light)

    this.renderer = new THREE.WebGLRenderer({antialias: true})
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputEncoding = THREE.sRGBEncoding
    container.appendChild(this.renderer.domElement)

    this.controllers = []
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 1.6, 0)
    this.controls.update()

    // this.initSceneCube()
    this.initScene()
    this.initBoxes()
    this.setupVR()

    this.clock = new THREE.Clock()
    this.elapsedTime = 0

    this.renderer.setAnimationLoop(this.render.bind(this))
    window.addEventListener('resize', this.resize.bind(this))
  }

  random( min, max ){
    return Math.random() * (max-min) + min;
  }

  initSceneCube() {
    const geometry = new THREE.BoxBufferGeometry()
    const material = new THREE.MeshStandardMaterial({color: 0xFF0000})

    this.mesh = new THREE.Mesh(geometry, material)

    this.scene.add(this.mesh)

    const geometrySphere = new THREE.SphereGeometry( .7, 32, 16 )
    const materialSphere = new THREE.MeshBasicMaterial( { color: 0xffff00 } )
    const sphere = new THREE.Mesh( geometrySphere, materialSphere )
    this.scene.add( sphere )

    // sphere.position.set(1.5, 0, 0)
  }

  initScene(){
    this.radius = 0.08

    this.movableObjects = new THREE.Group();
    this.scene.add( this.movableObjects );

    this.room = new THREE.LineSegments(
        new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ),
        new THREE.LineBasicMaterial( { color: 0x808080 } )
    )
    this.room.geometry.translate( 0, 3, 0 )
    this.scene.add( this.room )

    const geometry = new THREE.IcosahedronBufferGeometry( this.radius, 2 )

    for ( let i = 0; i < 200; i ++ ) {

      const object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) )

      object.position.x = this.random( -2, 2 )
      object.position.y = this.random( 0, 2 )
      object.position.z = this.random( -2, 2 )

      // this.room.add( object )
      this.movableObjects.add( object )
    }

    this.highlight = new THREE.Mesh ( geometry, new THREE.MeshBasicMaterial( {
      color: 0xFFFFFF, side: THREE.BackSide }))
    this.highlight.scale.set( 1.2, 1.2, 1.2)
    this.scene.add( this.highlight )

    const self = this

    this.loadAsset(blimp, .5, .5, 1, scene => {
      const scale = 5
      scene.scale.set(scale, scale, scale)
      self.blimp = scene
    })
  }

  initBoxes() {
    this.scene.background = new THREE.Color(0xA0A0A0)
    this.scene.fog = new THREE.Fog(0xA0A0A0, 50,100)
    // ground
    const ground = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(200, 200),
        new THREE.MeshPhongMaterial({color: 0x999999, depthWrite: false}))
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)

    var grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000)
    grid.material.opacity = 0.2
    grid.material.transparent = true
    this.scene.add(grid)

    const geometry = new THREE.BoxGeometry(5,5,5)
    const material = new THREE.MeshPhongMaterial({color: 0xAAAA22})
    const edges = new THREE.EdgesGeometry(geometry)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000, linewidth: 2}))

    this.colliders = []

    for (let x=-100; x < 100; x += 10) {
      for (let z=-100; z < 100; z += 10) {
        if (x == 0 && z == 0) {
          continue
        }
        const box = new THREE.Mesh(geometry, material)
        box.position.set(x, 2.5, z)
        const edge = line.clone()
        edge.position.copy(box.position)
        this.scene.add(box)
        this.scene.add(edge)
        this.colliders.push(box)
      }
    }
  }

  loadAsset(gltfFilename, x, y, z, sceneHandler) {
    const self = this
    const loader = new GLTFLoader()
    loader.load(gltfFilename, (gltf) => {
          const gltfScene = gltf.scene
          self.scene.add(gltfScene)
          gltfScene.position.set(x, y, z)
          if (sceneHandler) {
            sceneHandler(gltfScene)
          }
        },
        null,
        (error) => console.error(`An error happened: ${error}`)
    )
  }

  createUI(){
    const config = {
      panelSize: { height: 0.8 },
      height: 500,
      body: { type: "text" }
    }
    const ui = new CanvasUI( { body: "" }, config );
    ui.mesh.position.set(0, 1.5, -1);
    this.scene.add( ui.mesh );
    return ui;
  }

  updateUI(ui, buttonStates){
    if (!buttonStates) {
      return
    }

    const str = JSON.stringify(buttonStates, null, 2);
    if (!ui.userData || ui.userData.strStates === undefined
        || ( str != ui.userData.strStates)){
      ui.updateElement( 'body', str );
      ui.update();
      if (!ui.userData) {
        ui.userData = {}
      }
      ui.userData.strStates = str;
    }
  }

  setupVR(){
    this.renderer.xr.enabled = true
    document.body.appendChild( VRButton.createButton( this.renderer ) )

    this.dolly = new THREE.Object3D();
    this.dolly.position.z = 0;
    this.dolly.add( this.camera );
    this.scene.add( this.dolly );

    this.dummyCam = new THREE.Object3D();
    this.camera.add( this.dummyCam );

    const self = this
    let i = 0
    this.controllers[i] = new DragController(this.renderer, i++, this.scene,
        this.movableObjects, this.dolly)
    this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene,
        this.movableObjects, this.highlight, this.dolly)
    // this.controllers[i] = new SelectController(this.renderer, i++, this.scene,
    //     this.movableObjects, this.highlight, this.dolly)

    if (this.controllers.length > 1) {
      this.leftUi = this.createUI()
      this.leftUi.mesh.position.set(-.6, 1.5, -1)
      this.rightUi = this.createUI()
      this.rightUi.mesh.position.set(.6, 1.5, -1)
    } else {
      this.leftUi = this.createUI()
    }

  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  controllerAction(dt) {
    if (!this.renderer.xr.isPresenting && this.controllers.length === 0) {
      return
    }

    if (this.blimp && this.controllers[0].buttonStates) {
      const buttonStates = this.controllers[0].buttonStates
      if (buttonStates["xr_standard_thumbstick"].button) {
        const scale = 10
        this.blimp.scale.set(scale, scale, scale)
      } else if (this.blimp) {
        const scale = 5
        this.blimp.scale.set(scale, scale, scale)
      }
      const xAxis = buttonStates["xr_standard_thumbstick"].xAxis
      const yAxis = buttonStates["xr_standard_thumbstick"].yAxis
      this.blimp.rotateY(0.1 * xAxis)
      this.blimp.translateY(.02 * yAxis)
    }

    if (this.controllers[0].buttonStates && this.controllers[0]
        .buttonStates["xr_standard_trigger"]
        // .buttonStates["xr_standard_squeeze"]
    ) {
      const speed = 2
      const quaternion = this.dolly.quaternion.clone()
      let worldQuaternion = new THREE.Quaternion()
      this.dummyCam.getWorldQuaternion(worldQuaternion)
      this.dolly.quaternion.copy(worldQuaternion)
      this.dolly.translateZ(-dt * speed)
      this.dolly.position.y = 0
      this.dolly.quaternion.copy(quaternion)
    }
  }

  render() {
    const dt = this.clock.getDelta()
    if (this.mesh) {
      this.mesh.rotateX(0.005)
      this.mesh.rotateY(0.01)
    }

    if (this.renderer.xr.isPresenting && this.controllers) {
        this.controllers.forEach(controller => controller.handle())
    }

    this.controllerAction(dt)

    this.showDebugText(dt)

    this.renderer.render(this.scene, this.camera)
  }

  showDebugText(dt) {
    if (this.renderer.xr.isPresenting) {
      this.elapsedTime += dt
      if (this.elapsedTime > 0.3) {
        this.elapsedTime = 0
        if (this.controllers.length > 0) {
          this.updateUI(this.leftUi, this.controllers[0].buttonStates)
        }
        if (this.controllers.length > 1) {
          this.updateUI(this.rightUi, this.controllers[1].buttonStates)
        }
      }
    } else {
      // this.stats.update()
    }
  }
}

export {App}
