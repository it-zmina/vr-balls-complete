import inspect from 'browser-util-inspect'
import {fetchProfile} from "three/examples/jsm/libs/motion-controllers.module";
import * as THREE from "three";

const DEFAULT_PROFILES_PATH = 'webxr-input-profiles';
const DEFAULT_PROFILE = 'generic-trigger';

export class Controller {
  controller
  renderer
  buttonStates

  constructor(renderer, index) {
    if (!renderer) {
      throw Error("Invalid renderer value: " + inspect(renderer))
    }
    this.renderer = renderer
    this.index = index
    this.controller = this.renderer.xr.getController(index)
    this.elapsedTime = 0
    this.clock = new THREE.Clock()

    const self = this
    this.controller.addEventListener('connected', (event, data) => this.onConnect(event, self))
  }

  handle() {
    const dt = this.clock.getDelta()
    if (this.renderer.xr.isPresenting) {
      this.elapsedTime += dt
      if (this.elapsedTime > 0.3) {
        this.updateGamepadState()
        this.elapsedTime = 0
      }
    }
  }

  /*
    {
        "trigger": {
            "button": 0
        },
        "touchpad": {
            "button": 2,
            "xAxis": 0,
            "yAxis": 1
        },
        "squeeze": {
            "button": 1
        },
        "thumbstick": {
            "button": 3,
            "xAxis": 2,
            "yAxis": 3
        },
        "button": {
            "button": 6
        }
    }
   */
  createButtonStates(components) {
    const buttonStates = {}
    this.gamepadIndices = components
    Object.keys(components).forEach(key => {
      if (key.includes('touchpad') || key.includes('thumbstick')) {
        buttonStates[key] = { button: 0, xAxis: 0, yAxis: 0 }
      } else {
        buttonStates[key] = 0
      }
    })
    this.buttonStates = buttonStates
  }

  updateGamepadState() {
    const session = this.renderer.xr.getSession()
    const inputSource = session.inputSources[this.index]
    if (inputSource && inputSource.gamepad && this.gamepadIndices && this.buttonStates) {
      const gamepad = inputSource.gamepad
      try {
        Object.entries(this.buttonStates).forEach(([key, value]) => {
          const buttonIndex = this.gamepadIndices[key].button
          if (key.includes('touchpad') || key.includes('thumbstick')) {
            const xAxisIndex = this.gamepadIndices[key].xAxis
            const yAxisIndex = this.gamepadIndices[key].yAxis
            this.buttonStates[key].button = gamepad.buttons[buttonIndex].value
            this.buttonStates[key].xAxis = gamepad.axes[xAxisIndex].toFixed(2)
            this.buttonStates[key].yAxis = gamepad.axes[yAxisIndex].toFixed(2)
          } else {
            this.buttonStates[key] = gamepad.buttons[buttonIndex].value
          }
        })
      } catch (e) {
        console.warn("An error occurred setting the ui")
      }
    }
  }

  onConnect( event, self ){
    const info = {};

    fetchProfile(event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE)
    .then(({profile, assetPath}) => {
      // console.log( JSON.stringify(profile));

      info.name = profile.profileId;
      info.targetRayMode = event.data.targetRayMode;

      Object.entries(profile.layouts).forEach(([key, layout]) => {
        const components = {};
        Object.values(layout.components).forEach((component) => {
          components[component.rootNodeName] = component.gamepadIndices;
        });
        info[key] = components;
      });

      if (event.data.handedness === 'left') {
        self.createButtonStates(info.left);
      } else {
        self.createButtonStates(info.right);
      }

      // console.log( JSON.stringify(info) );
    });
  }
}