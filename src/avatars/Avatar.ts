import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene } from "@babylonjs/core";

// Abstract class
export class Avatar {
    scene: Scene;
    rig: HardwareRig;

    constructor(scene: Scene, rig: HardwareRig) {
        this.scene = scene;
        this.rig = rig;
    }

    static getAvatarType(): string {
        throw new Error("Abstract method not implemented");
    }

    update() {
        throw new Error("Abstract method not implemented");
    }
}
