import {Controller} from "./Controller";
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import * as THREE from "three";

export class SelectController extends Controller{
  constructor(renderer, index, scene, movableObjects, highlight) {
    super(renderer, index)
    this.scene = scene
    this.movableObjects = movableObjects
    this.highlight = highlight
    this.workingMatrix = new THREE.Matrix4()
    this.rayCaster = new THREE.Raycaster();

    this.build(index)
  }

  build(index) {
    const controllerModelFactory = new XRControllerModelFactory()
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ])
    const line = new THREE.Line(geometry)
    line.name = 'line'
    line.scale.z = 0

    this.controller.add(line)
    this.controller.userData.selectPressed = false

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

    this.controller.addEventListener( 'selectstart', onSelectStart );
    this.controller.addEventListener( 'selectend', onSelectEnd );

    this.scene.add(this.controller)
  }

  handle() {
    if (this.controller.userData.selectPressed) {
      this.controller.children[0].scale.z = 10
      this.workingMatrix.identity().extractRotation( this.controller.matrixWorld)

      this.rayCaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld)

      this.rayCaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

      const intersects = this.rayCaster.intersectObjects(this.movableObjects.children)

      if (intersects.length > 0) {
        if (intersects[0].object.uuid !== this.highlight.uuid) {
          intersects[0].object.add(this.highlight)
        }
        this.highlight.visible = true
        this.controller.children[0].scale.z = intersects[0].distance
      } else {
        this.highlight.visible = false
      }
    }
  }
}