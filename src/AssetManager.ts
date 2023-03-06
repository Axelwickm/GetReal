import {
    Scene,
    SceneLoader,
    Skeleton,
    AbstractMesh,
    TransformNode,
} from "@babylonjs/core";

/*
 * Singleton class for loading assets in order of priority, and then storing references to them
 * for other classes to use.
 */

type AssetRef = {
    name: string;
    path: string;
    type: "character" | "environment";
    defferedResolve?: (value: CharacterAsset | EnvironmentAsset) => void;
    defferedReject?: (reason?: any) => void;
};

const CONCURRENT_LOADS = 4;
const ASSETS: Array<AssetRef> = [
    {
        name: "Lobbys",
        path: "Environments/Lobbys.glb",
        type: "environment",
    },
    {
        name: "Warehouse",
        path: "Environments/Warehouse.glb",
        type: "environment",
    },
    {
        name: "BlueMonsterGirl",
        path: "FullBodyAvatars/BlueMonsterGirl.glb",
        type: "character",
    },
];

export type EnvironmentAsset = {
    meshes: Array<AbstractMesh>;
};

export type CharacterAsset = {
    skeleton: Skeleton;
    armature: TransformNode; // For some reason, this is what we need to change
    mesh: AbstractMesh;
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
                    if (assetRef.type === "environment") {
                        const environmentAsset : EnvironmentAsset = {
                            meshes: result.meshes,
                        }
                        AssetManager.setEnabled(environmentAsset, false);
                        assetRef.defferedResolve!(environmentAsset);
                    } else if (assetRef.type === "character") {
                        result.particleSystems.forEach((ps) => {
                            ps.stop();
                        });

                        // Put in one parent mesh
                        const parent = new AbstractMesh(assetRef.name, scene);
                        result.meshes.forEach((mesh) => {
                            mesh.parent = parent;
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

                        const characterAsset : CharacterAsset = {
                            skeleton: result.skeletons[0],
                            armature: armature,
                            mesh: parent,
                        }

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

    static setEnabled(asset: CharacterAsset | EnvironmentAsset, enabled: boolean) {
        if ("meshes" in asset) {
            asset.meshes.forEach((mesh) => {
                mesh.setEnabled(enabled);
            });
        }

        if ("mesh" in asset) {
            asset.mesh.setEnabled(enabled);
        }

        if ("skeleton" in asset) {

        }

        if ("armature" in asset) {
            asset.armature.setEnabled(enabled);
        }
    }
}
