import {
    Scene,
    SceneLoader,
    Skeleton,
    AbstractMesh,
    TransformNode,
    AnimationGroup,
} from "@babylonjs/core";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

/*
 * Singleton class for loading assets in order of priority, and then storing references to them
 * for other classes to use.
 */

type AssetRef = {
    name: string;
    path: string;
    type: "character" | "environment";
    parentOffset?: Vector3;
    parentRotation?: Quaternion;
    rhs: boolean;
    meMask?: Array<string>; // Names of meshes if associated with specific client (ex. to hide inside of head)
    defferedResolve?: (value: CharacterAsset | EnvironmentAsset) => void;
    defferedReject?: (reason?: any) => void;
};

const CONCURRENT_LOADS = 4;
const ASSETS: Array<AssetRef> = [
    {
        name: "Lobbys",
        path: "Environments/Lobbys.glb",
        type: "environment",
        rhs: true,
    },
    {
        name: "Warehouse",
        path: "Environments/Warehouse.glb",
        parentOffset: new Vector3(15, 0, 0),
        type: "environment",
        rhs: true,
    },    {
        name: "BlueMonsterGirl",
        path: "FullBodyAvatars/BlueMonsterGirl.glb",
        type: "character",
        meMask: [
            "EyeLeft",
            "EyeRight",
            "Wolf3D_Teeth",
            "Wolf3D_Head",
            "Wolf3D_Hair",
            "Wolf3D_Outfit_Top",
        ],
        rhs: false, // Actually, this currenly is, but this messes with the rigging. TODO: convert to LHS properly
    },
];

export type EnvironmentAsset = {
    meshes: Array<AbstractMesh>;
};

export type CharacterAsset = {
    skeleton: Skeleton;
    armature: TransformNode; // For some reason, this is what we need to change
    mesh: AbstractMesh;
    meMask: Array<string>;
    animationGroups: Array<AnimationGroup>;
};

const isCharacterAsset = (asset: any): asset is CharacterAsset => {
    return asset.skeleton !== undefined;
};

const isEnvironmentAsset = (asset: any): asset is EnvironmentAsset => {
    // Not character and has meshes
    return !isCharacterAsset(asset) && asset.meshes !== undefined;
};

export class AssetManager {
    private environments: Map<string, Promise<EnvironmentAsset>> = new Map();
    private characters: Map<string, Promise<CharacterAsset>> = new Map();

    private constructor() {
        // Create a promise for each character asset
        // Users will have to wait for these to resolve before they can use the assets
        for (let i = 0; i < ASSETS.length; i++) {
            const assetRef = ASSETS[i];
            if (assetRef.type === "environment") {
                this.environments.set(
                    assetRef.name,
                    new Promise((resolve, reject) => {
                        assetRef.defferedResolve =
                            resolve as typeof assetRef.defferedResolve;
                        assetRef.defferedReject = reject;
                    })
                );
            } else if (assetRef.type === "character") {
                this.characters.set(
                    assetRef.name,
                    new Promise((resolve, reject) => {
                        assetRef.defferedResolve =
                            resolve as typeof assetRef.defferedResolve;
                        assetRef.defferedReject = reject;
                    })
                );
            }
        }
    }

    static instance: AssetManager;

    static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }

        return AssetManager.instance;
    }

    getCharacterOptions(): Array<string> {
        return Array.from(this.characters.keys());
    }

    async getCharacter(name: string): Promise<CharacterAsset> {
        const character = this.characters.get(name);
        if (!character) {
            throw new Error("Character not found: " + name);
        }
        return character;
    }

    getEnvironmentOptions(): Array<string> {
        return Array.from(this.environments.keys());
    }

    async getEnvironment(name: string): Promise<EnvironmentAsset> {
        const environment = this.environments.get(name);
        if (!environment) {
            throw new Error("Environment not found: " + name);
        }
        return environment;
    }

    async loadAssets(scene: Scene) {
        const startTime = Date.now();

        const promises: Promise<boolean>[] = [];
        const unfinishedPromiseCount = () => promises.filter((p) => !p).length;

        for (let i = 0; i < ASSETS.length; i++) {
            while (unfinishedPromiseCount() >= CONCURRENT_LOADS) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const assetRef = ASSETS[i];
            const promise = SceneLoader.ImportMeshAsync(
                "",
                "/",
                assetRef.path,
                scene
            )
                .then((result) => {
                    const parent = new AbstractMesh(assetRef.name, scene);

                    // Find and destroy __root__
                    const root = result.meshes.find((mesh) => {
                        return mesh.name === "__root__";
                    });
                    if (root) {
                        console.log("Destroy __root__");
                        // Lift all children up to the root level
                        root.getChildren().forEach((child) => {
                            child.parent = parent;
                        });
                        root.getChildTransformNodes().forEach((child) => {
                            child.parent = parent;
                        });
                        root.dispose();

                        if (assetRef.rhs) {
                            // Flip z scale to -1
                            parent.scaling.z *= -1;
                        }

                        if (assetRef.parentOffset) {
                            parent.position = assetRef.parentOffset;
                        }

                        if (assetRef.parentRotation) {
                            parent.rotationQuaternion = assetRef.parentRotation;
                        }
                    }

                    if (assetRef.type === "environment") {
                        const environmentAsset: EnvironmentAsset = {
                            meshes: result.meshes,
                        };
                        AssetManager.setEnabled(environmentAsset, false);
                        assetRef.defferedResolve!(environmentAsset);
                    } else if (assetRef.type === "character") {
                        result.particleSystems.forEach((ps) => {
                            ps.stop();
                        });

                        result.skeletons.forEach((skeleton) => {
                            skeleton.name = assetRef.name;
                        });

                        // Find transform node of name Armature
                        const armature = parent
                            .getChildTransformNodes()
                            .find((node) => {
                                return node.name === "Armature";
                            });
                        if (!armature) {
                            throw new Error(
                                'No armature with name "Armature" found'
                            );
                        }
                        if (result.skeletons.length !== 1) {
                            throw new Error(
                                "Character must have exactly one skeleton, but found " +
                                    result.skeletons.length
                            );
                        }

                        // Print all animations
                        result.animationGroups.forEach((ag) => {
                            ag.stop();
                        });

                        const characterAsset: CharacterAsset = {
                            skeleton: result.skeletons[0],
                            armature: armature,
                            mesh: parent,
                            meMask: assetRef.meMask || [],
                            animationGroups: result.animationGroups,
                        };

                        AssetManager.setEnabled(characterAsset, false);
                        assetRef.defferedResolve!(characterAsset);
                    } else {
                        throw new Error("Unknown asset type: " + assetRef.type);
                    }

                    return true;
                })
                .catch((error) => {
                    console.error("Error loading mesh: " + assetRef.name);
                    console.error(error);
                    assetRef.defferedReject!(error);
                    return false;
                });

            promises.push(promise);
        }

        // Wait for all the meshes to load
        await Promise.all(promises);

        const timeToLoad = (Date.now() - startTime) / 1000;
        console.log("Loaded all assets in " + timeToLoad + " seconds");
    }

    static setEnabled(
        asset: CharacterAsset | EnvironmentAsset,
        enabled: boolean,
        isMe: boolean = false
    ) {
        if ("meshes" in asset) {
            asset.meshes.forEach((mesh) => {
                mesh.setEnabled(enabled);
                console.log(
                    "Set enabled: " + enabled + " on mesh: " + mesh.name
                );
            });
        }

        if ("mesh" in asset) {
            asset.mesh.setEnabled(enabled);
            console.log(
                "Set enabled: " + enabled + " on mesh: " + asset.mesh.name
            );
        }

        if ("skeleton" in asset) {
        }

        if ("armature" in asset) {
            asset.armature.setEnabled(enabled);
            console.log(
                "Set enabled: " +
                    enabled +
                    " on armature: " +
                    asset.armature.name
            );
        }

        if (isMe && isCharacterAsset(asset)) {
            // Recursively disable all meshes that are in the meMask
            const disableMeshes = (mesh: AbstractMesh) => {
                if (asset.meMask.includes(mesh.name)) {
                    mesh.setEnabled(!enabled);
                    console.log(
                        "Set enabled: " + !enabled + " on mesh: " + mesh.name + " (meMask)"
                    );
                }
            };

            const childMeshes = asset.mesh.getChildMeshes();
            childMeshes.forEach(disableMeshes);
        }
    }
}
