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

        this.parent?.setEnabled(enabled);
    }

    update() {
        if (!this.enabled) return;
        const cameraTransform = this.rig.getBone("Head");
        if (cameraTransform) {
            this.cameraCube!.position = cameraTransform.position.add(
                Vector3.Forward()
                    .rotateByQuaternionToRef(
                        cameraTransform.rotation,
                        Vector3.Zero()
                    )
                    .scale(0.5)
            );
            this.cameraCube!.rotationQuaternion = cameraTransform.rotation
                .clone()
                .multiply(
                    Quaternion.RotationAxis(Vector3.Right(), -Math.PI / 2)
                )
                .multiply(Quaternion.RotationAxis(Vector3.Up(), Math.PI / 4));

            this.cameraAxis!.position = cameraTransform.position;
            this.cameraAxis!.rotationQuaternion = cameraTransform.rotation;
        }

        const boneTransforms = this.rig.getAllBones();
        if (boneTransforms) {
            // Create number of boxes needed
            while (this.boneCubes.length < boneTransforms.size) {
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
            for (
                let i = 0;
                i < this.boneCubes.length - boneTransforms.size;
                i++
            ) {
                this.boneCubes.pop()!.dispose();
            }

            if (boneTransforms.size === 0 && this.hipCube?.isEnabled()) {
                this.hipCube!.setEnabled(false);
            } else if (
                boneTransforms.size !== 0 &&
                !this.hipCube?.isEnabled()
            ) {
                this.hipCube!.setEnabled(true);
            }

            // Transform poxes
            if (boneTransforms.size !== 0) {
                const hips = boneTransforms.get("Hips");
                if (hips) {
                    this.hipCube!.position = hips.position;
                    this.hipCube!.rotationQuaternion = hips.rotation;
                }

                if (boneTransforms.size > this.boneCubes.length)
                    throw new Error("Too many bone transforms!");

                let i = 0;
                for (let [_key, value] of boneTransforms) {
                    this.boneCubes[i].position = value.position;
                    this.boneCubes[i].rotationQuaternion = value.rotation;
                    i++;
                }
            }
        }
    }

    async calibrate() {}
}
