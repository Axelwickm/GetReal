import { Avatar } from "./Avatar";
import { AssetManager } from "../AssetManager";
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene, AbstractMesh, Skeleton, TransformNode } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

// Constant map: Name -> index
// Name, index, and parent index
const BONE_ASSIGNMENTS_MAP: Map<string, [number, number | null]> = new Map([
    ["Hips", [0, null]],
    ["L5", [1, 0]],
    ["L3", [2, 1]],
    ["T12", [3, 2]],
    ["T8", [4, 3]],
    ["Neck", [5, 4]],
    ["Head", [6, 5]],
    ["RightShoulder", [7, 4]],
    ["RightUpperArm", [8, 7]],
    ["RightForearm", [9, 8]],
    ["RightHand", [10, 9]],
    ["LeftShoulder", [11, 4]],
    ["LeftUpperArm", [12, 11]],
    ["LeftForearm", [13, 12]],
    ["LeftHand", [14, 13]],
    ["RightUpperLeg", [15, 0]],
    ["RightLowerLeg", [16, 15]],
    ["RightFoot", [17, 16]],
    ["RightToe", [18, 17]],
    ["LeftUpperLeg", [19, 0]],
    ["LeftLowerLeg", [20, 19]],
    ["LeftFoot", [21, 20]],
    ["LeftToe", [22, 21]],
]);

const BONE_ASSIGNMENTS_ARRAY: Array<[string, number, number | null]> = [
    ...BONE_ASSIGNMENTS_MAP,
].map(([name, [index, parentIndex]]) => [name, index, parentIndex]);

export class FullBodyAvatar extends Avatar {
    private skeleton?: Skeleton;
    private armatureBones?: Array<TransformNode>;
    private parentMesh?: AbstractMesh;

    // Same order as BONE_ASSIGNMENTS_ARRAY
    private modelBoneOffsets: Array<Vector3> = [];
    private modelBoneAngles: Array<Quaternion> = [];
    private modelBoneLengths: Array<number> = [];

    public cutenessFactor: number = 0;

    constructor(scene: Scene, rig: HardwareRig, characterName: string) {
        super(scene, rig);

        AssetManager.getInstance()
            .getCharacter(characterName)
            .then((character) => {
                console.log("Spawned full body avatar", character);
                this.parentMesh = character.mesh; // TODO: highly temporary. Should clone or instanciate, but ran into trouble with that.
                if (character.skeleton === null)
                    throw new Error("Skeleton is null");
                this.skeleton = character.skeleton;
                AssetManager.setEnabled(character, true, rig.isMe());
                if (!this.parentMesh) throw new Error("Parent mesh is null");
                if (!this.skeleton) throw new Error("Skeleton is null");
                character.armature.computeWorldMatrix(true);
                this.skeleton.computeAbsoluteTransforms();
                //this.parentMesh.skeleton = this.skeleton;
                // And for the children
                /*for (let i = 0; i < this.parentMesh.getChildren().length; i++) {
                    const child = this.parentMesh.getChildren()[i];
                    if (child instanceof AbstractMesh) {
                        console.log(
                            "Setting skeleton for child",
                            child.skeleton
                        );
                    }
                }*/

                this.armatureBones =
                    character.armature.getChildTransformNodes();
                this.modelBoneOffsets = Array(
                    BONE_ASSIGNMENTS_ARRAY.length
                ).fill(Vector3.Zero());
                this.modelBoneAngles = Array(
                    BONE_ASSIGNMENTS_ARRAY.length
                ).fill(Quaternion.Identity());
                this.modelBoneLengths = Array(
                    BONE_ASSIGNMENTS_ARRAY.length
                ).fill(0);

                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    bone.computeWorldMatrix(true);
                    const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                    if (boneInds) {
                        // Set the bone's rotation to the model's bone rotation
                        this.modelBoneOffsets[boneInds[0]] =
                            bone.position.clone();
                        this.modelBoneAngles[boneInds[0]] =
                            bone.absoluteRotationQuaternion?.clone() ||
                            Quaternion.Identity();
                    }
                }

                for (let i = 0; i < this.skeleton?.bones.length; i++) {
                    const bone = this.skeleton.bones[i];
                    if (bone.parent) {
                        const start = bone.parent
                            .getAbsoluteTransform()
                            .getTranslation();
                        const end = bone
                            .getAbsoluteTransform()
                            .getTranslation();
                        const length = Vector3.Distance(start, end);
                        const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                        if (boneInds)
                            this.modelBoneLengths[boneInds[0]] = length;
                    }
                }

                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    bone.position = Vector3.Zero();
                    bone.rotationQuaternion = Quaternion.Identity();
                }
            });
    }

    destroy() {
        // TODO: we should destory the mesh and skeleton, but right now we're not copying it.
        this.setEnabled(false);
    }

    static getAvatarType(): string {
        return "full_body";
    }

    getAvatarType(): string {
        return FullBodyAvatar.getAvatarType();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.parentMesh?.setEnabled(enabled);
    }

    update() {
        if (this.armatureBones) {
            const globalBoneTransforms = this.rig.getBoneTransforms();
            if (globalBoneTransforms.length === 0) return;

            // For each tranform node child of this.armature
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];

                const boneParent: TransformNode | null =
                    bone.parent as TransformNode;
                const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                if (boneInds && boneParent) {
                    const thisGlobal = globalBoneTransforms[boneInds[0]];
                    if (boneInds[1] !== null) {
                        // Location
                        const parentBoneInv = boneParent
                            .getWorldMatrix()
                            .invert();

                        bone.position = Vector3.TransformCoordinates(
                            thisGlobal[0],
                            parentBoneInv
                        );

                        // Rotation
                        const naturalRotation =
                            this.modelBoneAngles[boneInds[0]];

                        bone.rotationQuaternion =
                            boneParent.absoluteRotationQuaternion.multiply(
                                thisGlobal[1].multiply(naturalRotation)
                            );

                        //this.cutenessFactor = Math.sin(new Date().getTime() / 1000) + 1;

                        // Scale
                        const parentGlobal = globalBoneTransforms[boneInds[1]];
                        const globalDist = Vector3.Distance(
                            thisGlobal[0],
                            parentGlobal[0]
                        );
                        const localDist = this.modelBoneLengths[boneInds[0]];
                        let scale = globalDist / localDist;
                        if (this.cutenessFactor > 0)
                            scale = Math.pow(scale, 1 - this.cutenessFactor);
                        const parentScale = boneParent.absoluteScaling;
                        bone.scaling = new Vector3(
                            scale * parentScale.x,
                            scale * parentScale.y,
                            scale * parentScale.z
                        );

                        bone.computeWorldMatrix(true);
                    } else {
                        bone.position = thisGlobal[0];
                        bone.rotationQuaternion = thisGlobal[1];
                    }
                }
            }
        }
    }

    async calibrate() {}
}
