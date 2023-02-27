import { Avatar } from './Avatar';
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene } from "@babylonjs/core";


export class SimpleAvatar extends Avatar {

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);
    }

    getAvatarType(): string {
        return "simple";
    }

    static getAvatarType(): string {
        return "simple";
    }
}
