import { Avatar } from "./Avatar";
import { AssetManager } from "../AssetManager";
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene, AbstractMesh, Skeleton, TransformNode } from "@babylonjs/core";
import { Vector3, Quaternion, Matrix } from "@babylonjs/core/Maths/math.vector";

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

    private hwInTPose: Array<[Vector3, Quaternion]> = [];

    // TODO: remove below
    private armatureBoneOffsets: Array<Vector3> = [];
    private armatureBoneAngleOffsets: Array<Quaternion> = [];
    private armatureBoneScales: Array<number> = [];

    private variance = 0.1;

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
                AssetManager.setEnabled(character, true);
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
                }*/

                this.armatureBones =
                    character.armature.getChildTransformNodes();
                this.modelBoneOffsets = Array(
                    BONE_ASSIGNMENTS_ARRAY.length
                ).fill(Vector3.Zero());
                this.modelBoneAngles = Array(
                    BONE_ASSIGNMENTS_ARRAY.length
                ).fill(Quaternion.Identity());

                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                    if (boneInds) {
                        // Set the bone's rotation to the model's bone rotation
                        bone.computeWorldMatrix(true);
                        this.modelBoneOffsets[boneInds[0]] =
                            bone.position.clone();
                        this.modelBoneAngles[boneInds[0]] =
                            bone.rotationQuaternion?.clone() ||
                            Quaternion.Identity();
                        bone.position = Vector3.Zero();
                        bone.rotationQuaternion = Quaternion.Identity();
                    }
                }

                for (let i = 0; i < BONE_ASSIGNMENTS_ARRAY.length; i++) {
                    // Read model bone angles
                    this.hwInTPose.push([
                        Vector3.Zero(),
                        Quaternion.Identity(),
                    ]);

                    this.armatureBoneOffsets.push(Vector3.Zero());
                    this.armatureBoneAngleOffsets.push(Quaternion.Identity());
                    this.armatureBoneScales.push(1);
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
            /*let trialValuesOffsets: Array<typeof this.armatureBoneOffsets> = [];
            let trialValuesAngles: Array<typeof this.armatureBoneAngleOffsets> =
                [];
            let bestError = Infinity;
            let bestTrial = 0;

            for (let trial = 0; trial < 10; trial++) {
                if (trial === 0) {
                    trialValuesOffsets.push([...this.armatureBoneOffsets]);
                    trialValuesAngles.push([...this.armatureBoneAngleOffsets]);
                } else {
                    // Apply noise
                    const whichBone = Math.floor(Math.random() * 24);
                    trialValuesOffsets.push(
                        trialValuesOffsets[0].map((v, i) =>
                            i === whichBone
                                ? v
                                      .clone()
                                      .add(
                                          Vector3.Random().scale(this.variance)
                                      )
                                : v
                        )
                    );

                    trialValuesAngles.push(
                        trialValuesAngles[0].map((v, i) =>
                            i === whichBone
                                ? v
                                      .add(
                                          new Quaternion(
                                              Math.random(),
                                              Math.random(),
                                              Math.random(),
                                              Math.random()
                                          ).scale(this.variance)
                                      )
                                      .normalize()
                                : v
                        )
                    );
                }

                this.armatureBoneOffsets = trialValuesOffsets[trial];
                this.armatureBoneAngleOffsets = trialValuesAngles[trial];

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
                            // Local positions
                            if (i === 16){
                                 t[0] = Vector3.Zero(); // Root bone
                                 t[1] = Quaternion.Identity();
                            }
                            bone.position = t[0];
                            bone.rotationQuaternion = t[1];
                        }
                    }
                }

                this.parentMesh?.computeWorldMatrix(true);
                this.skeleton?.computeAbsoluteTransforms(true);

                const error = this.calculateError(globalBoneTransforms); // Compares with the rig
                console.log("Error", error);
                if (error < bestError) {
                    bestError = error;
                    bestTrial = trial;
                }
            }

            this.variance *= bestTrial === 0 ? 0.999 : 1.01;
            //console.log(bestTrial, bestError, this.variance);

            this.armatureBoneOffsets = trialValuesOffsets[bestTrial];
            this.armatureBoneAngleOffsets = trialValuesAngles[bestTrial];
            if (bestTrial !== 0) {
                console.log("Best trial", bestTrial);
                console.log(
                    this.armatureBoneOffsets[1],
                    this.armatureBoneAngleOffsets[1]
                );
            }*/

            /*const relativeBoneTransforms =
                this.targetRelativeBoneTransforms(globalBoneTransforms);*/

            const globalBoneTransforms = this.rig.getBoneTransforms();

            // For each tranform node child of this.armature
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                if (boneInds && bone.parent) {
                    const thisGlobal = globalBoneTransforms[boneInds[0]];
                    if (boneInds[1] !== null) {
                        // Convert to bones local space
                        const parentBone = bone.parent;
                        const parentBoneInv = parentBone
                            .getWorldMatrix()
                            .invert();

                        bone.position = Vector3.TransformCoordinates(
                            thisGlobal[0],
                            parentBoneInv
                        );

                        // Turn bone by matrix
                        // Parnet inverse matrix, naturalRotation, thisGlobal[1]
                        const naturalRotation =
                            this.modelBoneAngles[boneInds[0]];

                        bone.rotationQuaternion = naturalRotation.multiply(
                            Quaternion.FromRotationMatrix(
                                parentBoneInv
                            ).multiply(thisGlobal[1])
                        );

                        /*bone.rotationQuaternion =
                            thisGlobal[1] // global
                            .multiply(Quaternion.FromRotationMatrix(parentBone.getWorldMatrix()))
                            .multiply(naturalRotation) // local
                            .multiply(Quaternion.FromRotationMatrix(parentBoneInv));**/

                        /*
                        bone.rotationQuaternion = Quaternion.FromRotationMatrix(
                            parentBoneInv
                        ).multiply(naturalRotation).multiply(thisGlobal[1]);

                        bone.rotationQuaternion = Quaternion.FromRotationMatrix(
                            parentBoneInv
                        ).multiply(naturalRotation.multiply(thisGlobal[1]));

                        bone.rotationQuaternion = Quaternion.FromRotationMatrix(
                            parentBoneInv
                        ).multiply(thisGlobal[1]).multiply(naturalRotation);
                        */

                        bone.computeWorldMatrix(true);
                    } else {
                        bone.position = thisGlobal[0];
                        bone.rotationQuaternion = thisGlobal[1];
                    }
                }
            }
        }
    }

    async calibrate() {
        // Here, we assume the user is standing straight with arms to the side (exactly like the character)
        // We then measure the differences in joint angles (TODO: and position/scale?) between the character and the user
        // It is not just a fine tuning thing. For example, the leg bones in the rig point down, while the character's leg bones point forward.
        console.log("Calibrating full body avatar.");
        const globalBoneTransforms = this.rig.getBoneTransforms();
        console.log(JSON.stringify(globalBoneTransforms));
        if (globalBoneTransforms.length === 0)
            return console.warn(
                "No bone transforms gotten from rig. FullBodyAvatar cannot calibrate."
            );

        this.hwInTPose = globalBoneTransforms.map((t) => [
            t[0].clone(),
            t[1].clone(),
        ]);

        /*for (let i = 0; i < this.armatureBoneOffsets.length; i++) {
            this.armatureBoneOffsets[i] = Vector3.Zero();
            this.armatureBoneAngleOffsets[i] = Quaternion.Identity();
            this.armatureBoneScales[i] = 1;
        }

        const relativeBoneTransforms =
            this.targetRelativeBoneTransforms(globalBoneTransforms);

        if (
            relativeBoneTransforms.length !==
            this.armatureBoneAngleOffsets.length
        )
            throw new Error("Invalid length");

        for (let i = 0; i < this.armatureBoneAngleOffsets.length; i++) {
            /*this.armatureBoneOffsets[i] = this.modelBoneOffsets[i].subtract(
                relativeBoneTransforms[i][0].clone()
            );
            this.armatureBoneAngleOffsets[i] = this.modelBoneAngles[i].multiply(
                Quaternion.Inverse(relativeBoneTransforms[i][1].clone())
            );
            this.armatureBoneOffsets[i] = relativeBoneTransforms[i][0].clone();
            this.armatureBoneAngleOffsets[i] =
                relativeBoneTransforms[i][1].clone();
        }*/
        console.log("Full body avatar calibrated.");
    }

    targetRelativeBoneTransforms(
        globalTransforms: Array<[Vector3, Quaternion]>
    ): Array<[Vector3, Quaternion]> {
        // By what do we need to change the armature bone transforms to match the global transforms?

        const relativeBoneTransforms: Array<[Vector3, Quaternion]> = [];

        for (let i = 0; i < BONE_ASSIGNMENTS_ARRAY.length; i++) {
            const [boneName, boneIndex, parentIndex] =
                BONE_ASSIGNMENTS_ARRAY[i];

            const gT = globalTransforms[boneIndex];
            if (gT === undefined) continue;

            if (parentIndex === null) {
                relativeBoneTransforms.push([gT[0], gT[1]]);
            } else {
                const pT = globalTransforms[parentIndex];
                if (pT === undefined)
                    throw new Error(
                        "Bone parent transform not found " +
                            BONE_ASSIGNMENTS_ARRAY[parentIndex][0]
                    );

                /*let angleDelta = gT[1].multiply(pT[1].clone().invert());
                angleDelta = angleDelta.multiply(
                    this.armatureBoneAngleOffsets[boneIndex]
                );*/
                //const globalPosDelta = gT[0].subtract(pT[0]);

                /*const rotatedPosDelta = new Vector3(1, 0, 0)
                    .rotateByQuaternionToRef(angleDelta, new Vector3())
                    .scale(globalPosDelta.length())
                    .add(this.armatureBoneOffsets[boneIndex]);
                    */
                //relativeBoneTransforms.push([rotatedPosDelta, angleDelta]);
            }
        }

        return relativeBoneTransforms;
    }

    calculateError(globalBoneTransforms: Array<[Vector3, Quaternion]>): number {
        // See how close the rig's bone transforms are to the model's bone transforms
        /*if (this.armatureBones) {
            let totalError = 0;
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const boneInds = BONE_ASSIGNMENTS_MAP.get(bone.name);
                if (boneInds) {
                    const target = globalBoneTransforms[boneInds[0]];
                    totalError += bone.absolutePosition
                        .subtract(target[0])
                        .length();
                    const angleDelta = bone.absoluteRotationQuaternion.multiply(
                        target[1].clone().invert()
                    );
                    //totalError += angleDelta.toEulerAngles().length();
                }
            }
            return totalError;
        } else {
            return Infinity;
        }*/
        return 0;
    }
}
