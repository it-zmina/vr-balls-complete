import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import {FlashLightController} from "./controllers/FlashLightController";
import {DragController} from "./controllers/DragController";
import {SelectController} from "./controllers/SelectController";


class App {
  constructor() {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // this.camera = new THREE.PerspectiveCamera(60,
    //     window.innerWidth / window.innerHeight, 0.1, 100)
    // this.camera.position.set(0, 0, 4)
    this.camera = new THREE.PerspectiveCamera(50,
        window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set( 0, 1.6, 3 )

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x505050)

    // const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3)
    const ambient = new THREE.HemisphereLight( 0x606060, 0x404040, 1)
    this.scene.add(ambient)

    const light = new THREE.DirectionalLight(0xffffff)
    // light.position.set(0.2, 1, 1)
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

    this.raycaster = new THREE.Raycaster()
    this.workingMatrix = new THREE.Matrix4()


    // this.initSceneCube()
    this.initScene()
    this.setupVR()

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
  }

  setupVR(){
    this.renderer.xr.enabled = true
    document.body.appendChild( VRButton.createButton( this.renderer ) )

    let i = 0
    // this.controllers[i] = new DragController(this.renderer, i++, this.scene,
    //     this.movableObjects)
    // this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene,
    //     this.movableObjects, this.highlight)
    this.controllers[i] = new SelectController(this.renderer, i++, this.scene,
        this.movableObjects, this.highlight)
  }


  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  render() {
    if (this.mesh) {
      this.mesh.rotateX(0.005)
      this.mesh.rotateY(0.01)
    }

    if (this.controllers) {
      this.controllers.forEach(controller => controller.handle())
    }

    this.renderer.render(this.scene, this.camera)
  }
}

export {App}
