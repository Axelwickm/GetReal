import { Avatar } from './Avatar';
import { HardwareRig } from "../hardware_rigs/HardwareRig";

import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";

export class DebugAvatar extends Avatar {

    sphere : Mesh;

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);

        this.sphere = MeshBuilder.CreateSphere(
            "sphere",
            { diameter: 1 },
            scene
        );

    }

    destroy() {
        this.sphere.dispose();
    }

    static getAvatarType(): string {
        return "debug";
    }

    update() {
        //const cameraTransform = this.rig.getCameraTransform();
        const hipTransform = this.rig.getHipTransform();
        //const boneRotations = this.rig.getBoneRotations();
        
        this.sphere.position = hipTransform.position;
    }
}
