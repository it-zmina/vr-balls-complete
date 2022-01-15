import * as THREE from "three";
import {Controller} from "./Controller";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import flashLightPack from "../../assets/flash-light.glb";
import {SpotLightVolumetricMaterial} from "../utils/SpotLightVolumetricMaterial";

export class FlashLightController extends Controller {
  raycaster = new THREE.Raycaster()
  spotlights = {}

  constructor(renderer, index, scene, movableObjects, highlight) {
    super(renderer, index)
    this.scene = scene
    this.movableObjects = movableObjects
    this.highlight = highlight
    this.build(index)
  }

  build(index) {
    this.workingMatrix = new THREE.Matrix4()

    const self = this

    function onSelectStart() {
      this.userData.selectPressed = true
      if (self.spotlights[this.uuid]) {
        self.spotlights[this.uuid].visible = true
      } else {
        this.children[0].scale.z = 10
      }
    }

    function onSelectEnd () {
      self.highlight.visible = false
      this.userData.selectPressed = false
      if (self.spotlights[this.uuid]) {
        self.spotlights[this.uuid].visible = false
      } else {
        this.children[0].scale.z = 0
      }
    }

    this.controller.addEventListener( 'selectstart', onSelectStart );
    this.controller.addEventListener( 'selectend', onSelectEnd );
    this.controller.addEventListener( 'connected', function (event) {
      self.buildFlashLightController.call(self, event.data, this)
    })
    this.controller.addEventListener( 'disconnected', function () {
      while(this.children.length > 0) {
        this.remove(this.children[0])
      }
      this.controller = null
    })

    this.scene.add(this.controller)
  }

  handle() {
    if (this.controller.userData.selectPressed) {
      this.workingMatrix.identity().extractRotation(this.controller.matrixWorld)

      this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld)

      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

      const intersects = this.raycaster.intersectObjects(this.movableObjects.children)

      if (intersects.length > 0) {
        if (intersects[0].object.uuid !== this.highlight.uuid) {
          intersects[0].object.add(this.highlight)
        }
        this.highlight.visible = true
      } else {
        this.highlight.visible = false
      }
    }
  }

  buildFlashLightController(data, controller) {
    let geometry, material, loader

    const self = this

    if (data.targetRayMode === 'tracked-pointer') {
      loader = new GLTFLoader()
      loader.load(flashLightPack, (gltf) => {
            const flashLight = gltf.scene.children[2]
            const scale = 0.6
            flashLight.scale.set(scale, scale, scale)
            controller.add(flashLight)
            const spotlightGroup = new THREE.Group()
            self.spotlights[controller.uuid] = spotlightGroup

            const spotlight = new THREE.SpotLight(0xFFFFFF, 2, 12, Math.PI / 15,
                0.3)
            spotlight.position.set(0, 0, 0)
            spotlight.target.position.set(0, 0, -1)
            spotlightGroup.add(spotlight.target)
            spotlightGroup.add(spotlight)
            controller.add(spotlightGroup)

            spotlightGroup.visible = false

            geometry = new THREE.CylinderBufferGeometry(0.03, 1, 5, 32, true)
            geometry.rotateX(Math.PI / 2)
            material = new SpotLightVolumetricMaterial()
            const cone = new THREE.Mesh(geometry, material)
            cone.translateZ(-2.6)
            spotlightGroup.add(cone)
          },
          null,
          (error) => console.error(`An error happened: ${error}`)
      )
    } else if (data.targetRayMode === 'gaze') {
      geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
      controller.add(new THREE.Mesh(geometry, material))
    }
  }
}