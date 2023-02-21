import { Scene, SceneLoader, Skeleton, AbstractMesh } from "@babylonjs/core";

/*
 * Singleton class for loading assets in order of priority, and then storing references to them
 * for other classes to use.
 */

type AssetRef = {
    name: string;
    path: string;
    type: "character"; // TODO: add more types
    defferedResolve?: (value: CharacterAsset) => void;
    defferedReject?: (reason?: any) => void;
};

const CONCURRENT_LOADS = 4;
const ASSETS: Array<AssetRef> = [
    {
        name: "BlueMonsterGirl",
        path: "FullBodyAvatars/BlueMonsterGirl.glb",
        type: "character",
    },
];

export type CharacterAsset = {
    skeleton: Skeleton;
    meshes: Array<AbstractMesh>;
};

export class AssetManager {
    private characters: Map<string, Promise<CharacterAsset>> = new Map();

    private constructor() {
        // Create a promise for each character asset
        // Users will have to wait for these to resolve before they can use the assets
        for (let i = 0; i < ASSETS.length; i++) {
            const assetRef = ASSETS[i];
            if (assetRef.type === "character") {
                this.characters.set(
                    assetRef.name,
                    new Promise((resolve, reject) => {
                        assetRef.defferedResolve = resolve;
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
                    result.meshes.forEach((mesh) => {
                        mesh.setEnabled(false);
                    });

                    result.particleSystems.forEach((ps) => {
                        ps.stop();
                    });

                    if (assetRef.type === "character") {
                        if (result.skeletons.length !== 1) {
                            throw new Error(
                                "Character must have exactly one skeleton, but found " +
                                    result.skeletons.length
                            );
                        }

                        assetRef.defferedResolve!({
                            skeleton: result.skeletons[0],
                            meshes: result.meshes,
                        });
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
}
