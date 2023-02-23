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
    private armatureBoneOffsets: Array<Vector3> = [];
    private armatureBoneAngleOffsets: Array<Quaternion> = [];

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
                this.parentMesh.setEnabled(this.enabled);
                if (!this.parentMesh) throw new Error("Parent mesh is null");
                if (!this.skeleton) throw new Error("Skeleton is null");
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
                }**/

                this.armatureBones = character.armature.getChildTransformNodes();
                this.modelBoneOffsets = Array(BONE_ASSIGNMENTS_ARRAY.length).fill(
                    Vector3.Zero()
                );
                this.modelBoneAngles = Array(BONE_ASSIGNMENTS_ARRAY.length).fill(
                    Quaternion.Identity()
                );
                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                    if (boneInds) {
                        // Set the bone's rotation to the model's bone rotation
                        this.modelBoneOffsets[boneInds[0]] = bone.position;
                        this.modelBoneAngles[boneInds[0]] = bone.rotationQuaternion!;
                    }
                }

                for (let i = 0; i < BONE_ASSIGNMENTS_ARRAY.length; i++) {
                    // Read model bone angles
                    this.armatureBoneOffsets.push(Vector3.Zero());
                    this.armatureBoneAngleOffsets.push(Quaternion.Identity());
                }
            });
    }

    static getAvatarType(): string {
        return "full_body";
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.parentMesh?.setEnabled(enabled);
    }

    update() {
        if (this.armatureBones) {
            const globalBoneTransforms = this.rig.getBoneTransforms();
            const relativeBoneTransforms =
                this.targetRelativeBoneTransforms(globalBoneTransforms);
            // For each tranform node child of this.armature
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                if (boneInds) {
                    const t = relativeBoneTransforms[boneInds[0]];
                    if (t) {
                        bone.position = t[0];
                        bone.rotationQuaternion = t[1];
                    }
                }
            }
        }
    }

    calibrate() {
        // Here, we assume the user is standing straight with arms to the side (exactly like the character)
        // We then measure the differences in joint angles (TODO: and position/scale?) between the character and the user
        // It is not just a fine tuning thing. For example, the leg bones in the rig point down, while the character's leg bones point forward.
        console.log("Calibrating full body avatar in 3 seconds. Stand straight with arms to the side.");
        setTimeout(() => { console.log("2"); }, 1000);
        setTimeout(() => { console.log("1"); }, 2000);
        setTimeout(() => {
            console.log("Calibrating full body avatar");
            const globalBoneTransforms = this.rig.getBoneTransforms();

            for (let i = 0; i < this.armatureBoneOffsets.length; i++) {
                this.armatureBoneOffsets[i] = Vector3.Zero();
                this.armatureBoneAngleOffsets[i] = Quaternion.Identity();
            }

            const relativeBoneTransforms = this.targetRelativeBoneTransforms(
                globalBoneTransforms
            );

            if (relativeBoneTransforms.length !== this.armatureBoneAngleOffsets.length)
                throw new Error("Invalid length");

            for (let i = 0; i < this.armatureBoneAngleOffsets.length; i++) {
                this.armatureBoneOffsets[i] = 
                    this.modelBoneOffsets[i].subtract(relativeBoneTransforms[i][0].clone());
                this.armatureBoneAngleOffsets[i] = this.modelBoneAngles[i].multiply(
                    Quaternion.Inverse(relativeBoneTransforms[i][1].clone())
                );
            }
        }, 3000);
    }

    targetRelativeBoneTransforms(
        globalTransforms: Array<[Vector3, Quaternion]>
    ): Array<[Vector3, Quaternion]> {
        // Go through BONE_ASSIGNMENTS in order and calculate the relative transform to the parent

        const relativeBoneTransforms: Array<[Vector3, Quaternion]> = [];

        const flipQuaternion = new Quaternion(0, 0, 1, 0);

        for (let i = 0; i < BONE_ASSIGNMENTS_ARRAY.length; i++) {
            const [boneName, boneIndex, parentIndex] =
                BONE_ASSIGNMENTS_ARRAY[i];

            const gT = globalTransforms[boneIndex];
            if (gT === undefined)
                continue;

            if (parentIndex === null) {
                relativeBoneTransforms.push([
                    gT[0],
                    gT[1].multiply(flipQuaternion),
                ]);
            } else {
                const pT = globalTransforms[parentIndex];
                if (pT === undefined)
                    throw new Error(
                        "Bone parent transform not found " +
                            BONE_ASSIGNMENTS_ARRAY[parentIndex][0]
                    );

                let angleDelta = gT[1].multiply(pT[1].clone().invert());
                angleDelta = angleDelta.multiply(this.armatureBoneAngleOffsets[boneIndex]);
                const globalPosDelta = gT[0].subtract(pT[0]);
                //const globalPosDelta = this.modelBoneOffsets[boneIndex];
                const rotatedPosDelta = (new Vector3(0, 1, 0).rotateByQuaternionToRef(
                    angleDelta,
                    new Vector3()
                )).scale(globalPosDelta.length()).add(this.armatureBoneOffsets[boneIndex]);
                const relativeTransform = [
                    rotatedPosDelta,
                    angleDelta
                ] as [Vector3, Quaternion];
                relativeBoneTransforms.push(relativeTransform);
            }
        }

        return relativeBoneTransforms;
    }
}
