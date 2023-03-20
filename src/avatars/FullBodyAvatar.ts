import { Avatar } from "./Avatar";
import { AssetManager } from "../AssetManager";
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { MeshPrimitiveGenerator } from "../PrimitiveGenerator";

import { Scene, Skeleton, TransformNode, AbstractMesh } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export class FullBodyAvatar extends Avatar {
    private skeleton?: Skeleton;
    private armatureBones?: Array<TransformNode>;
    private parent?: TransformNode;
    private armature?: TransformNode;
    private eyeIndicator?: AbstractMesh;

    private modelBones: Map<
        string,
        {
            offset: Vector3;
            rotation: Quaternion;
            length: number;
        }
    > = new Map();

    public cutenessFactor: number = 0;

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
                console.log("Creating full body avatar: " + characterName);
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

                // Get initial bone transforms
                this.armature.computeWorldMatrix(true);
                this.skeleton.computeAbsoluteTransforms();

                this.armatureBones = this.armature.getChildTransformNodes();

                for (let i = 0; i < this.armatureBones.length; i++) {
                    const bone = this.armatureBones[i];
                    bone.computeWorldMatrix(true);
                    this.modelBones.set(bone.name, {
                        offset: bone.position.clone(),
                        rotation:
                            bone.absoluteRotationQuaternion?.clone() ||
                            Quaternion.Identity(),
                        length: 0,
                    });

                    if (bone.name === "Head" && this.rig.isMe()) {
                        this.eyeIndicator =
                            MeshPrimitiveGenerator.eyeIndicator(scene);
                        // Set the eye indicator to the head
                        this.eyeIndicator.parent = bone;
                        this.eyeIndicator.position = new Vector3(0, 0.0, 1.0);
                        this.eyeIndicator.setEnabled(this.enabled);
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
                        const boneNode = this.modelBones.get(bone.name);
                        if (boneNode) boneNode.length = length;
                    }
                }
            });
    }

    destroy() {
        this.parent?.dispose();
    }

    static getAvatarType(): string {
        return "full_body";
    }

    getAvatarType(): string {
        return FullBodyAvatar.getAvatarType();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.parent?.setEnabled(enabled);
        this.eyeIndicator?.setEnabled(enabled);
    }

    update() {
        if (this.armatureBones) {
            let origin: Vector3 | undefined = undefined;
            // For each tranform node child of this.armature
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const hwRigBone = this.rig.getBone(bone.name);
                const modelBone = this.modelBones.get(bone.name);

                const boneParent: TransformNode | null =
                    bone.parent as TransformNode;
                const parentHw = this.rig.getBone(boneParent.name);
                if (hwRigBone && modelBone) {
                    if (boneParent !== null && parentHw !== null) {
                        // Location
                        const parentBoneInv = boneParent
                            .getWorldMatrix()
                            .invert();

                        bone.position = Vector3.TransformCoordinates(
                            hwRigBone.position,
                            parentBoneInv
                        );

                        // Rotation
                        bone.rotationQuaternion =
                            boneParent.absoluteRotationQuaternion.multiply(
                                hwRigBone.rotation.multiply(modelBone.rotation)
                            );

                        //this.cutenessFactor = Math.sin(new Date().getTime() / 1000) + 1;

                        // Scale
                        const globalDist = Vector3.Distance(
                            hwRigBone.position,
                            parentHw.position
                        );
                        const localDist = modelBone.length;
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
                        bone.position = hwRigBone.position;
                        bone.rotationQuaternion = hwRigBone.rotation;
                        origin = hwRigBone.position;
                    }
                }
            }

            const meshes = this.parent?.getChildMeshes();
            if (meshes && origin) {
                for (let i = 0; i < meshes.length; i++) {
                    const boundingInfo = meshes[i].getBoundingInfo();
                    // TODO: scale this based on the size of the avatar
                    boundingInfo.centerOn(origin, new Vector3(0.6, 2.0, 0.6));
                }
            }
        }
    }

    async calibrate() {}
}
