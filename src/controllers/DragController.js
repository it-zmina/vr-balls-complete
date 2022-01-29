import {Controller} from "./Controller";
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import * as THREE from "three";

export class DragController extends Controller {
  intersected = [];

  constructor(renderer, index, scene, movableObjects) {
    super(renderer, index)
    this.scene = scene
    this.movableObjects = movableObjects
    this.workingMatrix = new THREE.Matrix4();
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

    function onSelectStart(event) {
      const controller = event.target;
      const intersections = self.getIntersections(controller);

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

    this.controller.addEventListener('selectstart', onSelectStart);
    this.controller.addEventListener('selectend', onSelectEnd);



    this.scene.add(this.controller)
  }

  getIntersections() {

    this.workingMatrix.identity().extractRotation(this.controller.matrixWorld);

    this.rayCaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
    this.rayCaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);

    return this.rayCaster.intersectObjects(this.movableObjects.children);
  }

  intersectObjects() {
    // Do not highlight when already selected
    if (this.controller.userData.selected !== undefined) return;

    const line = this.controller.getObjectByName('line');
    const intersections = this.getIntersections();

    if (intersections.length > 0) {
      const intersection = intersections[0];

      const object = intersection.object;
      object.material.emissive.r = 1;
      this.intersected.push(object);

      line.scale.z = intersection.distance;
    } else {
      line.scale.z = 5;
    }
  }

  cleanIntersected() {
    while (this.intersected.length) {
      const object = this.intersected.pop();
      object.material.emissive.r = 0;
    }
  }

  handle() {
    super.handle()
    this.cleanIntersected()
    this.intersectObjects()
  }
}