import { Avatar } from './Avatar';
import { AssetManager } from '../AssetManager';
import { HardwareRig } from "../hardware_rigs/HardwareRig";
import { Scene, AbstractMesh, Skeleton } from "@babylonjs/core";

let fullBodyAvatarCounter = 0;

export class FullBodyAvatar extends Avatar {
    private skeleton?: Skeleton;
    private meshes?: Array<AbstractMesh>;

    constructor(scene: Scene, rig: HardwareRig, characterName: string) {
        super(scene, rig);

        AssetManager.getInstance().getCharacter(characterName)
            .then((character) => {
                console.log("Spawned full body avatar", character);
                // Should contain a skeleton and a bunch of meshes.
                fullBodyAvatarCounter++;

                this.skeleton = character.skeleton.clone("full_body_skeleton_" + fullBodyAvatarCounter);
                // TODO: we maybe be able to get away with instancing the meshes
                this.meshes = character.meshes.map((mesh) => {
                    const clone = mesh;//.clone("full_body_mesh_" + fullBodyAvatarCounter, null, false)!;
                    clone.material = mesh.material;
                    clone.skeleton = this.skeleton ?? null;
                    scene.addMesh(clone);
                    return clone;

                });

                this.meshes?.forEach((mesh) => {
                    mesh.setEnabled(this.enabled);
                });
            });
    }

    static getAvatarType(): string {
        return "full_body";
    }

    setEnabled(enabled: boolean) {
        this.meshes?.forEach((mesh) => {
            mesh.setEnabled(enabled);
        });
    }

    update() {
        // TODO: read from rig and XR
    }
}
