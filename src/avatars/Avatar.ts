import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene } from "@babylonjs/core";

// Abstract class
export class Avatar {
    scene: Scene;
    rig: HardwareRig;
    enabled: boolean;

    constructor(scene: Scene, rig: HardwareRig) {
        this.scene = scene;
        this.rig = rig;
        this.enabled = true;
    }

    destroy() {
        throw new Error("Abstract method not implemented");
    }

    setRig(rig: HardwareRig) {
        this.rig = rig;
    }

    getAvatarType(): string {
        throw new Error("Abstract method not implemented");
    }

    static getAvatarType(): string {
        throw new Error("Abstract method not implemented");
    }

    update() {
        throw new Error("Abstract method not implemented");
    }

    getEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    async calibrate() {
        throw new Error("Abstract method not implemented");
    }
}
