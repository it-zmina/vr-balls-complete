import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import {FlashLightController} from "./controllers/FlashLightController";

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
    // this.buildDragController(i++)
    this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene,
        this.movableObjects, this.highlight)
    // this.buildStandardController(i++)
    // this.flashLightController(i++)
    // this.buildStandardController(i++)
  }

  buildStandardController(index) {
    const controllerModelFactory = new XRControllerModelFactory()
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ])
    const line = new THREE.Line(geometry)
    line.name = 'line'
    line.scale.z = 0

    const controller = this.renderer.xr.getController(index)

    controller.add(line)
    controller.userData.selectPressed = false

    const grip = this.renderer.xr.getControllerGrip(index)
    grip.add(controllerModelFactory.createControllerModel(grip))
    this.scene.add(grip)

    const self = this

    function onSelectStart() {
      this.children[0].scale.z = 10
      this.userData.selectPressed = true
    }

    function onSelectEnd () {
      this.children[0].scale.z = 0
      self.highlight.visible = false
      this.userData.selectPressed = false
    }

    controller.addEventListener( 'selectstart', onSelectStart );
    controller.addEventListener( 'selectend', onSelectEnd );

    controller.handle = () => this.handleController(controller)

    this.scene.add(controller)
    this.controllers[index] = controller
  }

  buildDragController(index) {
    const controllerModelFactory = new XRControllerModelFactory()
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ])
    const line = new THREE.Line(geometry)
    line.name = 'line'
    line.scale.z = 0

    const controller = this.renderer.xr.getController(index)

    controller.add(line)
    controller.userData.selectPressed = false

    const grip = this.renderer.xr.getControllerGrip(index)
    grip.add(controllerModelFactory.createControllerModel(grip))
    this.scene.add(grip)

    const self = this

    function onSelectStart(event) {
      const controller = event.target;
      const intersections = getIntersections(controller);

      if (intersections.length > 0) {
        const intersection = intersections[0];
        const object = intersection.object;
        object.material.emissive.b = 1;
        controller.attach(object);
        controller.userData.selected = object;
      }
    }

    function onSelectEnd(event) {
      const controller = event.target;

      if (controller.userData.selected !== undefined) {
        const object = controller.userData.selected;
        object.material.emissive.b = 0;
        self.movableObjects.attach(object);
        controller.userData.selected = undefined;
      }
    }

    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);

    const tempMatrix = new THREE.Matrix4();
    const rayCaster = new THREE.Raycaster();
    const intersected = [];

    controller.handle = () => {
      cleanIntersected();
      intersectObjects(controller)
    }

    this.scene.add(controller)
    this.controllers[index] = controller

    function getIntersections(controller) {

      tempMatrix.identity().extractRotation(controller.matrixWorld);

      rayCaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      rayCaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      return rayCaster.intersectObjects(self.movableObjects.children);
    }

    function intersectObjects(controller) {
      // Do not highlight when already selected
      if (controller.userData.selected !== undefined) return;

      const line = controller.getObjectByName('line');
      const intersections = getIntersections(controller);

      if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;
        object.material.emissive.r = 1;
        intersected.push(object);

        line.scale.z = intersection.distance;
      } else {
        line.scale.z = 5;
      }
    }

    function cleanIntersected() {
      while (intersected.length) {
        const object = intersected.pop();
        object.material.emissive.r = 0;
      }
    }
  }

  handleController(controller) {
    if (controller.userData.selectPressed) {
      controller.children[0].scale.z = 10
      this.workingMatrix.identity().extractRotation( controller.matrixWorld)

      this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)

      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

      const intersects = this.raycaster.intersectObjects(this.room.children)

      if (intersects.length > 0) {
        if (intersects[0].object.uuid !== this.highlight.uuid) {
          intersects[0].object.add(this.highlight)
        }
        this.highlight.visible = true
        controller.children[0].scale.z = intersects[0].distance
      } else {
        this.highlight.visible = false
      }
    }
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
