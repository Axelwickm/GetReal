import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
    AssetRef,
    CustomAsset,
    CharacterAsset,
    EnvironmentAsset,
    SoundAsset,
} from "./AssetManager";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MirrorTexture } from "@babylonjs/core/Materials/Textures/mirrorTexture";
import { Plane } from "@babylonjs/core/Maths/math.plane";

class Lobbys extends CustomAsset {
    scene?: Scene;
    mirrorTexture?: MirrorTexture;
    mirror?: AbstractMesh;

    constructor() {
        super();
    }

    instantiate(
        assetRef: AssetRef,
        scene: Scene,
        container: AssetContainer,
        finalAsset: CharacterAsset | EnvironmentAsset | SoundAsset
    ): void {
        console.log('Custom Asset "Lobbys" instantiate');
        this.scene = scene;

        //Creation of a mirror planes
        const mirror = MeshBuilder.CreatePlane(
            "mirror",
            { width: 2.26, height: 2.24 },
            scene
        );

        mirror.rotation = new Vector3(0, (3 * Math.PI) / 2, 0);
        mirror.position = new Vector3(0, 0, 0);
        this.mirror = mirror;

        //Ensure working with new values for mirror by computing and obtaining its worldMatrix
        mirror.computeWorldMatrix(true);
        const glass_worldMatrix = mirror.getWorldMatrix();

        //Obtain normals for plane and assign one of them as the normal
        const glass_vertexData = mirror.getVerticesData("normal")!;
        let glassNormal = new Vector3(
            glass_vertexData[0],
            glass_vertexData[1],
            glass_vertexData[2]
        );
        //Use worldMatrix to transform normal into its current value
        glassNormal = Vector3.TransformNormal(glassNormal, glass_worldMatrix);

        //Create reflecting surface for mirror surface
        const reflector = Plane.FromPositionAndNormal(
            mirror.absolutePosition,
            glassNormal.scale(-1)
        );

        //Create the mirror material
        const mirrorMaterial = new StandardMaterial(
            "mirror_custom_asset",
            scene
        );
        const mirrorTexture = new MirrorTexture(
            "mirror_texture_custom_asset",
            1024,
            scene,
            true,
            11
        );

        this.mirrorTexture = mirrorTexture;
        mirrorMaterial.reflectionTexture = mirrorTexture;
        mirrorTexture.mirrorPlane = reflector;
        mirrorTexture.renderList = container.meshes.filter(
            (m) => m.name !== "colliders"
        );
        mirrorMaterial.reflectionTexture.level = 1;

        mirrorMaterial.disableLighting = true;

        mirror.material = mirrorMaterial;

        const mirrorTransformNode = container.transformNodes.find(
            (t) => t.name === "Mirror"
        );

        if (mirrorTransformNode) {
            console.log("Found mirror transform node. Setting mirror parent");
            mirror.parent = mirrorTransformNode;
        }
        mirror.setAbsolutePosition(new Vector3(-1.72847, 1.78803, -0.392012));

        this.transformUpdate();
    }

    transformUpdate() {
        console.log("Lobbys transform update");
        // Abolute position not updating in time.

        // And I dont have time to figure out why. Panik.
        setTimeout(() => {
            const reflector = Plane.FromPositionAndNormal(
                this.mirror!.absolutePosition,
                this.mirror!.getDirection(new Vector3(0, 0, 1))
            );

            this.mirrorTexture!.mirrorPlane = reflector;
        }, 1000);
    }

    hasSpawnPoints(): boolean {
        return true;
    }

    getSpawnPoint(index: number): Vector3 {
        let x = (index % 5) * 4 - 6;
        let z = Math.floor(index / 5) * 3 - 5;
        if (index === 13) z += 2.5;
        return new Vector3(x, 0, z);
    }
}

export const GetRealAssets: Array<AssetRef> = [
    {
        type: "character",
        name: "Nao",
        path: "Avatars/Nao.glb",
        // meMask: ["Body"], TODO: Make this work with mirrors and add back in
        rhs: false,
    },
    {
        type: "environment",
        name: "Lobbys",
        path: "Environments/Lobbys.glb",
        rhs: true,
        parentOffset: new Vector3(0, 0, 0),
        customAsset: new Lobbys(),
    },
    {
        type: "environment",
        name: "Warehouse",
        path: "Environments/Warehouse.glb",
        rhs: true,
        parentOffset: new Vector3(16, 0, 0),
    },
    {
        type: "environment",
        name: "MountainsDance",
        path: "Environments/MountainsDance.glb",
        parentOffset: new Vector3(-85.44, 7.3, 97.44),
        rhs: true,
    },
    {
        type: "character",
        name: "BlueMonsterGirl",
        path: "Avatars/BlueMonsterGirl.glb",
        meMask: [
            "EyeLeft_LOD0",
            "EyeRight_LOD0",
            "Wolf3D_Teeth_LOD0",
            "Wolf3D_Head_LOD0",
            "Wolf3D_Hair_LOD0",
            "Wolf3D_Outfit_Top_LOD0",
        ],
        rhs: false, // Actually, this currenly is, but this messes with the rigging. TODO: convert to LHS properly
    },
    {
        type: "sound",
        name: "HeavenlySlowDance",
        path: "Sound/HeavenlySlowDance.mp3",
    },
];
