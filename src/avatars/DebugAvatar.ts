import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";

import { Scene, Mesh, MeshBuilder, TransformNode } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { MeshPrimitiveGenerator } from "../PrimitiveGenerator";

export class DebugAvatar extends Avatar {
    parent?: TransformNode;
    cameraCube?: Mesh;
    cameraAxis?: Mesh;
    hipCube?: Mesh;

    boxParent?: TransformNode;
    boneCubes: Array<Mesh> = []; 

    created: boolean = false;

    constructor(scene: Scene, rig: HardwareRig) {
        super(scene, rig);
    }

    create() {
        this.created = true;

        this.parent = new TransformNode("debugParent", this.scene); // Always at 0,0,0
        this.parent.setEnabled(false);

        this.cameraCube = MeshPrimitiveGenerator.camera(this.scene);
        this.cameraCube.setEnabled(!this.rig.isMe());
        this.cameraCube.parent = this.parent;

        this.cameraAxis = MeshPrimitiveGenerator.axes(this.scene);
        this.cameraAxis.parent = this.parent;

        this.hipCube = MeshBuilder.CreateBox("box", {}, this.scene);
        this.hipCube.scaling = new Vector3(0.2, 0.1, 0.1);
        this.hipCube.material = this.scene.getMaterialByName("red")!;
        this.hipCube.parent = this.parent;

        this.boxParent = new TransformNode("boxParent", this.scene);
        this.boxParent.parent = this.parent;
    }

    destroy() {
        this.parent?.dispose();

    }

    static getAvatarType(): string {
        return "debug";
    }

    getAvatarType(): string {
        return DebugAvatar.getAvatarType();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!this.created && enabled) {
            this.create();
        }
    }

    update() {
        if (!this.enabled) return;
        const cameraTransform = this.rig.getCameraTransform();
        this.cameraCube!.position = cameraTransform[0].add(
            Vector3.Forward().rotateByQuaternionToRef(cameraTransform[1], Vector3.Zero()).scale(0.5)
        );
        this.cameraCube!.rotationQuaternion = cameraTransform[1].clone().multiply(
            Quaternion.RotationAxis(Vector3.Right(), -Math.PI / 2)
        ).multiply(Quaternion.RotationAxis(Vector3.Up(), Math.PI / 4));

        this.cameraAxis!.position = cameraTransform[0];
        this.cameraAxis!.rotationQuaternion = cameraTransform[1];

        const boneTransforms = this.rig.getBoneTransforms();

        // Create number of boxes needed
        for (let i = 0; i < boneTransforms.length - this.boneCubes.length; i++) {
            const boneCube = MeshBuilder.CreateBox("box", {}, this.scene);
            boneCube.parent = this.boxParent!;
            boneCube.scaling = new Vector3(0.06, 0.03, 0.03);
            boneCube.material = this.scene.getMaterialByName("black")!;
            let cubeAxis = MeshPrimitiveGenerator.axes(this.scene);
            cubeAxis.parent = boneCube;
            cubeAxis.scaling = new Vector3(2, 2, 2);
            this.boneCubes.push(boneCube);
        }

        // Remove extra boxes
        for (let i = 0; i < this.boneCubes.length - boneTransforms.length; i++) {
            this.boneCubes.pop()!.dispose();
        }

        if (boneTransforms.length === 0 && this.hipCube?.isEnabled()) {
            this.hipCube!.setEnabled(false);
         }
        else if (boneTransforms.length !== 0 && !this.hipCube?.isEnabled()) {
            this.hipCube!.setEnabled(true);
        }

        // Transform poxes
        if (boneTransforms.length !== 0) {
            this.hipCube!.position = boneTransforms[0][0];
            this.hipCube!.rotationQuaternion = boneTransforms[0][1];

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
