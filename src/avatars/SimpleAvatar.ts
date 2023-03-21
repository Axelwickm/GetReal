import { Avatar } from "./Avatar";
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { AssetManager } from "../AssetManager";

import { Scene, Skeleton, TransformNode, MirrorTexture } from "@babylonjs/core";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

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

                // Get mirror_texture_custom_asset and add to render_list
                const mirrorTexture = scene
                    .getMaterialByName("mirror_custom_asset")
                    ?.getActiveTextures()[0] as MirrorTexture | undefined;
                if (mirrorTexture) {
                    for (let i = 0; i < instances.rootNodes.length; i++) {
                        const node = instances.rootNodes[i];
                        node.getChildMeshes().forEach((mesh) => {
                            mirrorTexture.renderList?.push(mesh);
                        });
                    }
                }

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
        if (this.armatureBones && this.armature) {
            let origin: Vector3 | undefined = undefined;
            for (let i = 0; i < this.armatureBones.length; i++) {
                const bone = this.armatureBones[i];
                const hwRigBone = this.rig.getBone(bone.name);

                if (hwRigBone !== null) {
                    const naturalRotation = this.modelBoneAngles.get(
                        bone.name
                    )!;
                    /*console.log(
                        "Set bone position: " +
                            bone.name +
                            " " +
                            hwRigBone.position
                    );*/
                    bone.rotationQuaternion =
                        hwRigBone.rotation.multiply(naturalRotation);
                    if (bone.name === "Head") {
                        const offset = new Vector3(0, -0.13, -0.1);
                        bone.position = hwRigBone.position.add(
                            offset.rotateByQuaternionToRef(
                                hwRigBone.rotation,
                                new Vector3()
                            )
                        );
                    } else {
                        bone.position = hwRigBone.position;
                    }
                    bone.computeWorldMatrix(true);

                    if (!origin) origin = bone.getAbsolutePosition();
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
            // For child meshes update bounding box
            const meshes = this.parent?.getChildMeshes();
            if (meshes && origin) {
                for (let i = 0; i < meshes.length; i++) {
                    const boundingInfo = meshes[i].getBoundingInfo();
                    boundingInfo.centerOn(origin, new Vector3(0.5, 0.5, 0.5));
                }
            }
        }
    }
}
