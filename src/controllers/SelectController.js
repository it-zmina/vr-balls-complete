import {Controller} from "./Controller";
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import flashLightPack from "../../assets/flash-light.glb";
import {SpotLightVolumetricMaterial} from "../utils/SpotLightVolumetricMaterial";

export class SelectController extends Controller{
  constructor(renderer, index, scene, movableObjects, highlight, dolly) {
    super(renderer, index)
    this.scene = scene
    this.movableObjects = movableObjects
    this.highlight = highlight
    this.dolly = dolly
    this.workingMatrix = new THREE.Matrix4()
    this.rayCaster = new THREE.Raycaster();

    this.build()
  }

  build() {
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
    this.controller.addEventListener( 'connected', function (event) {
      self.buildController.call(self, event.data, this)
    })

    this.scene.add(this.controller)
  }

  buildController(data, controller) {
    if (data.targetRayMode === 'tracked-pointer') {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ])
      const line = new THREE.Line(geometry)
      line.name = 'line'
      line.scale.z = 0

      this.controller.add(line)
      this.controller.userData.selectPressed = false

      const grip = this.renderer.xr.getControllerGrip(this.index)
      grip.add(new XRControllerModelFactory().createControllerModel(grip))
      this.scene.add(grip)

      this.dolly.add(controller)
      this.dolly.add(grip)
    } else if (data.targetRayMode === 'gaze') {
    }
  }

  handle() {
    super.handle()
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