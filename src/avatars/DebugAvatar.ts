import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";

import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class DebugAvatar extends Avatar {
    cube: Mesh;

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);

        this.cube = MeshBuilder.CreateBox("box", {}, scene);
        this.cube.scaling = new Vector3(0.2, 0.1, 0.1);
        this.cube.material = this.scene.getMaterialByName("red")!;

    }

    destroy() {
        this.cube.dispose();
    }

    static getAvatarType(): string {
        return "debug";
    }

    update() {
        //const cameraTransform = this.rig.getCameraTransform();
        const hipTransform = this.rig.getHipTransform();
        const boneRotations = this.rig.getBoneRotations();

        this.cube.position = hipTransform.position;
        this.cube.rotationQuaternion = hipTransform.rotation;

    }
}
