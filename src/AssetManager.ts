import {
    Scene,
    SceneLoader,
    AssetContainer,
    AbstractMesh,
    InstantiatedEntries,
} from "@babylonjs/core";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

/*
 * Singleton class for loading assets in order of priority, and then storing references to them
 * for other classes to use.
 */

export type AssetRef = {
    name: string;
    path: string;
    type: "character" | "environment" | "sound";
    parentOffset?: Vector3;
    parentRotation?: Quaternion;
    rhs?: boolean;
    meMask?: Array<string>; // Names of meshes if associated with specific client (ex. to hide inside of head)
    defferedResolve?: (
        value: CharacterAsset | EnvironmentAsset | SoundAsset
    ) => void;
    defferedReject?: (reason?: any) => void;
};

const CONCURRENT_LOADS = 3;
export type EnvironmentAsset = {
    type: "environment";
    name: string;
    container: AssetContainer;
    parent: AbstractMesh;
};

export type CharacterAsset = {
    type: "character";
    name: string;
    container: AssetContainer;
    meMask: Array<string>;
};

export type SoundAsset = {
    type: "sound";
    name: string;
    buffer: AudioBuffer;
};

const isCharacterAsset = (asset: any): asset is CharacterAsset => {
    return asset.type === "character";
};

const isEnvironmentAsset = (asset: any): asset is EnvironmentAsset => {
    return asset.type === "environment";
};

const isSoundAsset = (asset: any): asset is SoundAsset => {
    return asset.type === "sound";
};

export class AssetManager {
    private environments: Map<string, Promise<EnvironmentAsset>> = new Map();
    private characters: Map<string, Promise<CharacterAsset>> = new Map();
    private sounds: Map<string, Promise<SoundAsset>> = new Map();

    private constructor() {
        // Create a promise for each character asset
        // Users will have to wait for these to resolve before they can use the assets
        for (let i = 0; i < AssetManager.assetsRefs.length; i++) {
            const assetRef = AssetManager.assetsRefs[i];
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
            } else if (assetRef.type === "sound") {
                this.sounds.set(
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
    // Not a great pattern to be honest
    static assetsRefs: Array<AssetRef> = [];

    static setAssetRefs(assetsRefs: Array<AssetRef>) {
        AssetManager.assetsRefs = assetsRefs;
    }

    static getInstance(): AssetManager {
        if (!AssetManager.assetsRefs)
            throw new Error("Must set assetsRefs before calling getInstance");

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

    getSoundOptions(): Array<string> {
        return Array.from(this.sounds.keys());
    }

    async getSound(name: string): Promise<SoundAsset> {
        const sound = this.sounds.get(name);
        if (!sound) {
            throw new Error("Sound not found: " + name);
        }
        return sound;
    }

    async loadAssets(scene: Scene) {
        const startTime = Date.now();

        const promises: Promise<boolean>[] = [];
        const unfinishedPromiseCount = () => promises.filter((p) => !p).length;

        for (let i = 0; i < AssetManager.assetsRefs.length; i++) {
            while (unfinishedPromiseCount() >= CONCURRENT_LOADS) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const assetRef = AssetManager.assetsRefs[i];

            if (
                assetRef.type === "environment" ||
                assetRef.type === "character"
            ) {
                const promise = SceneLoader.LoadAssetContainerAsync(
                    assetRef.path,
                    "",
                    scene
                )
                    .then((result) => {
                        //const parent = new AbstractMesh(assetRef.name, scene);
                        const parent = result.createRootMesh();
                        parent.name = assetRef.name;

                        // Find and destroy __root__
                        const root = result.meshes.find((mesh) => {
                            return mesh.name === "__root__";
                        });

                        if (root) {
                            console.log(
                                "Destroy __root__ for " + assetRef.name
                            );

                            // Lift all children up to the root level
                            root.getChildren().forEach((child) => {
                                child.parent = parent;
                            });
                            root.getChildTransformNodes().forEach((child) => {
                                child.parent = parent;
                            });
                            root.dispose();

                            if (assetRef?.rhs) {
                                // Flip z scale to -1
                                parent.scaling.z *= -1;
                            }

                            if (assetRef.parentOffset) {
                                parent.position = assetRef.parentOffset;
                            }

                            if (assetRef.parentRotation) {
                                parent.rotationQuaternion =
                                    assetRef.parentRotation;
                            }
                        }

                        if (assetRef.type === "environment") {
                            result.animationGroups.forEach((ag) => {
                                console.log("Stop animation group " + ag.name);
                                ag.stop();
                            });

                            result.addAllToScene();

                            const environmentAsset: EnvironmentAsset = {
                                type: "environment",
                                name: assetRef.name,
                                container: result,
                                parent,
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

                            // Disable occlusion culling for all meshes
                            result.meshes.forEach((mesh) => {
                                //mesh.occlusionQueryAlgorithmType = 0;
                                //mesh.alwaysSelectAsActiveMesh = true;
                                //mesh.showBoundingBox = true;
                                //mesh.showSubMeshesBoundingBox = true;
                            });

                            const characterAsset: CharacterAsset = {
                                type: "character",
                                name: assetRef.name,
                                container: result,
                                meMask: assetRef.meMask || [],
                            };

                            assetRef.defferedResolve!(characterAsset);
                        } else {
                            throw new Error(
                                "Unknown asset type: " + assetRef.type
                            );
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
            } else if (assetRef.type === "sound") {
                const promise = new Promise<boolean>((resolve, reject) => {
                    // Fetch array buffer
                    fetch(assetRef.path)
                        .then((response) => response.arrayBuffer())
                        .then((arrayBuffer) => {
                            // Decode audio data
                            const audioContext = new AudioContext();
                            audioContext.decodeAudioData(
                                arrayBuffer,
                                (buffer) => {
                                    const soundAsset: SoundAsset = {
                                        type: "sound",
                                        name: assetRef.name,
                                        buffer: buffer,
                                    };
                                    assetRef.defferedResolve!(soundAsset);
                                    resolve(true);
                                }
                            );
                        })
                        .catch((error) => {
                            console.error(
                                "Error loading sound: " + assetRef.name
                            );
                            console.error(error);
                            assetRef.defferedReject!(error);
                            resolve(false);
                        });
                });
                promises.push(promise);
            } else {
                throw new Error("Unknown asset type: " + assetRef.type);
            }
        }

        // Wait for all the meshes to load
        await Promise.all(promises);

        const timeToLoad = (Date.now() - startTime) / 1000;
        console.log("Loaded all assets in " + timeToLoad + " seconds");
    }

    static addAssetToScene(
        asset: CharacterAsset | EnvironmentAsset,
        id?: string
    ): null | InstantiatedEntries {
        if (isEnvironmentAsset(asset)) {
            asset.container.addAllToScene();
            return null;
        } else if (isCharacterAsset(asset)) {
            if (id)
                return asset.container.instantiateModelsToScene((name) =>
                    name === asset.name ? name + "_" + id : name
                );
            else throw new Error("Must provide id for character");
        } else {
            throw new Error("Unknown asset type");
        }
    }

    static setEnabled(
        asset: CharacterAsset | EnvironmentAsset,
        enabled: boolean
    ) {
        if (isEnvironmentAsset(asset)) {
            asset.parent.setEnabled(enabled);
        } else if (isCharacterAsset(asset)) {
            throw new Error("Not implemented");
        }
    }

    static applyMeMask(
        asset: CharacterAsset,
        instances: InstantiatedEntries,
        value: boolean
    ) {
        const parent = instances.rootNodes[0];
        parent
            .getChildren((node) => asset.meMask.includes(node.name), false)
            .forEach((node) => {
                // Invert, since we're applying the mask
                node.setEnabled(!value);
            });
    }
}
