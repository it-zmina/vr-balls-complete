import inspect from 'browser-util-inspect'
export class Controller {
  controller
  renderer

  constructor(renderer, index) {
    if (!renderer) {
      throw Error("Invalid renderer value: " + inspect(renderer))
    }
    this.renderer = renderer
    this.controller = this.renderer.xr.getController(index)
  }

  handle() {
    throw Error("abstract method")
  }
}