export class InputController {
  constructor() {
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      Space: false,
    };
    this.moveVector = { x: 0, z: 0 };
    this.aimVector = { x: 0, z: 0 };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  onKeyDown = (event) => {
    if (this.keys[event.code] !== undefined) {
      this.keys[event.code] = true;
    }
  };

  onKeyUp = (event) => {
    if (this.keys[event.code] !== undefined) {
      this.keys[event.code] = false;
    }
  };

  setMoveVector(x, z) {
    this.moveVector.x = x;
    this.moveVector.z = z;
  }

  setAimVector(x, z) {
    this.aimVector.x = x;
    this.aimVector.z = z;
  }

  tapKey(code, holdMs = 90) {
    if (this.keys[code] === undefined) {
      return;
    }
    this.keys[code] = true;
    setTimeout(() => {
      this.keys[code] = false;
    }, holdMs);
  }
}
