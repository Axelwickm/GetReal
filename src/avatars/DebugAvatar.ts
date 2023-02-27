import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";

import { Scene, Mesh, MeshBuilder } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { MeshPrimitiveGenerator } from "../PrimitiveGenerator";

export class DebugAvatar extends Avatar {
    cameraCube: Mesh;
    hipCube: Mesh;

    boneCubes: Array<Mesh> = [];

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);

        this.cameraCube = MeshPrimitiveGenerator.camera(scene);
        this.cameraCube.setEnabled(!this.rig.isMe());

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

    getAvatarType(): string {
        return "debug";
    }

    static getAvatarType(): string {
        return "debug";
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;

        if (!this.rig.isMe())
            this.cameraCube.setEnabled(enabled);

        this.hipCube.setEnabled(enabled);
        for (let i = 0; i < this.boneCubes.length; i++) {
            this.boneCubes[i].setEnabled(enabled);
        }
    }

    update() {
        const cameraTransform = this.rig.getCameraTransform();
        this.cameraCube.position = cameraTransform[0];
        this.cameraCube.rotationQuaternion = cameraTransform[1].multiply(
            Quaternion.RotationAxis(Vector3.Right(), -Math.PI / 2)
        ).multiply(Quaternion.RotationAxis(Vector3.Up(), Math.PI / 4));

        const boneTransforms = this.rig.getBoneTransforms();
        if (boneTransforms.length !== 0) {
            this.hipCube.position = boneTransforms[0][0];
            this.hipCube.rotationQuaternion = boneTransforms[0][1];

            if (boneTransforms.length > this.boneCubes.length)
                throw new Error("Too many bone transforms!");

            for (let i = 0; i < boneTransforms.length; i++) {
                this.boneCubes[i].position = boneTransforms[i][0];
                this.boneCubes[i].rotationQuaternion = boneTransforms[i][1];
            }
        }
    }

    async calibrate() {}
}
