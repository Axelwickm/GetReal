import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { AssetManager } from "../AssetManager";

import { AbstractMesh, Scene, Skeleton, TransformNode } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { MeshPrimitiveGenerator } from "../PrimitiveGenerator";

export class SimpleAvatar extends Avatar {
    private skeleton?: Skeleton;
    private parent?: TransformNode;
    private armature?: TransformNode;

    private modelBoneAngles: Map<string, Quaternion> = new Map();
    private armatureBones?: Array<TransformNode>;

    constructor(
        scene: Scene,
        rig: HardwareRig,
        characterName: string,
        id: string
    ) {
        super(scene, rig);

        AssetManager.getInstance()
            .getCharacter(characterName)
            .then((character) => {
                console.log("Creating simple avatar: " + characterName);
                const instances = AssetManager.addAssetToScene(character, id);
                if (!instances) throw new Error("No instances found");

                if (rig.isMe())
                    AssetManager.applyMeMask(character, instances, true);

                this.parent = instances.rootNodes[0];
                this.skeleton = instances.skeletons[0]; // TODO: might be multiple
                if (!this.skeleton) throw new Error("Skeleton is null");

                this.armature = this.parent?.getChildTransformNodes(
                    false,
                    (node) => node.name === "Armature"
                )[0];
                if (!this.armature) throw new Error("Armature is null");

                this.parent.setEnabled(true);

                this.armatureBones = this.armature.getChildTransformNodes();

                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    bone.computeWorldMatrix(true);

                    // Set the bone's rotation to the model's bone rotation
                    this.modelBoneAngles.set(
                        bone.name,
                        bone.absoluteRotationQuaternion?.clone() ||
                            Quaternion.Identity()
                    );
                }
            });
    }

    destroy() {
        this.parent?.dispose();
    }

    static getAvatarType(): string {
        return "simple";
    }

    getAvatarType(): string {
        return SimpleAvatar.getAvatarType();
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.parent?.setEnabled(enabled);
    }

    update() {
        if (this.armatureBones) {
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const hwRigBone = this.rig.getBone(bone.name);

                if (hwRigBone !== null) {
                    const naturalRotation = this.modelBoneAngles.get(
                        bone.name
                    )!;
                    bone.position = hwRigBone.position;
                    bone.rotationQuaternion =
                        hwRigBone.rotation.multiply(naturalRotation);
                    bone.computeWorldMatrix(true);
                } else if (bone.name === "Torso") {
                    /*const globalTorso = Quaternion.Slerp(
                        bone.absoluteRotationQuaternion,
                        Quaternion.FromEulerAngles(
                            0,
                            0,
                            0
                        ),
                        0.2
                    );

                    // Convert to local rotation
                    const parentRotation = (bone.parent as TransformNode)
                        ?.absoluteRotationQuaternion.invert();
                    if (parentRotation) {
                        bone.rotationQuaternion =
                            globalTorso.multiply(parentRotation);
                    }*/
                }
            }
        }
    }
}
