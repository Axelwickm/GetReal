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
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MirrorTexture } from "@babylonjs/core/Materials/Textures/mirrorTexture";
import { Plane } from "@babylonjs/core/Maths/math.plane";

class Lobbys extends CustomAsset {
    instantiate(
        assetRef: AssetRef,
        scene: Scene,
        container: AssetContainer,
        finalAsset: CharacterAsset | EnvironmentAsset | SoundAsset
    ): void {
        console.log('Custom Asset "Lobbys" instantiate');

        //Creation of a mirror planes
        const mirror = MeshBuilder.CreatePlane(
            "mirror",
            { width: 2.26, height: 2.24 },
            scene
        );

        mirror.rotation = new Vector3(0, (3 * Math.PI) / 2, 0);
        mirror.position = new Vector3(-1.72847, 1.78803, -0.392012);

        //Ensure working with new values for mirror by computing and obtaining its worldMatrix
        mirror.computeWorldMatrix(true);
        var glass_worldMatrix = mirror.getWorldMatrix();

        //Obtain normals for plane and assign one of them as the normal
        var glass_vertexData = mirror.getVerticesData("normal")!;
        var glassNormal = new Vector3(
            glass_vertexData[0],
            glass_vertexData[1],
            glass_vertexData[2]
        );
        //Use worldMatrix to transform normal into its current value
        glassNormal = Vector3.TransformNormal(glassNormal, glass_worldMatrix);

        //Create reflecting surface for mirror surface
        var reflector = Plane.FromPositionAndNormal(
            mirror.position,
            glassNormal.scale(-1)
        );

        //Create the mirror material
        var mirrorMaterial = new StandardMaterial("mirror_custom_asset", scene);
        const mirrorTexture = new MirrorTexture(
            "mirror_texture_custom_asset",
            1024,
            scene,
            true,
            11
        );
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
