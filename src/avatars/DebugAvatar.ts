import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";

import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class DebugAvatar extends Avatar {
    hipCube: Mesh;

    boneCubes: Array<Mesh> = [];

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);

        this.hipCube = MeshBuilder.CreateBox("box", {}, scene);
        this.hipCube.scaling = new Vector3(0.2, 0.1, 0.1);
        this.hipCube.material = this.scene.getMaterialByName("red")!;

        for (let i = 0; i < 23; i++) {
            const boneCube = MeshBuilder.CreateBox("box", {}, scene);
            boneCube.scaling = new Vector3(0.06, 0.03, 0.03);
            boneCube.material = this.scene.getMaterialByName("black")!;
            this.boneCubes.push(boneCube);
        }

    }

    destroy() {
        this.hipCube.dispose();
    }

    static getAvatarType(): string {
        return "debug";
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.hipCube.setEnabled(enabled);
        for (let i = 0; i < this.boneCubes.length; i++) {
            this.boneCubes[i].setEnabled(enabled);
        }
    }

    update() {
        //const cameraTransform = this.rig.getCameraTransform();
        const hipTransform = this.rig.getHipTransform();
        const boneTransforms = this.rig.getBoneTransforms();

        this.hipCube.position = hipTransform.position;
        this.hipCube.rotationQuaternion = hipTransform.rotation;

        if (boneTransforms.length > this.boneCubes.length)
            throw new Error("Too many bone transforms!");

        for (let i = 0; i < boneTransforms.length; i++) {
            this.boneCubes[i].position = boneTransforms[i][0];
            this.boneCubes[i].rotationQuaternion = boneTransforms[i][1];
        }
    }

    calibrate() {

    }

}
