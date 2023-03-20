import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AssetRef } from "./AssetManager";

export const GetRealAssets: Array<AssetRef> = [
    {
        type: "character",
        name: "Nao",
        path: "Avatars/Nao.glb",
        meMask: ["Body"],
        rhs: false,
        physicsImpostorsCb: (
            scene: Scene,
            parent: AbstractMesh,
            container: AssetContainer
        ) => {
            const box = MeshBuilder.CreateBox(
                "collider",
                { width: 0.5, height: 0.5, depth: 0.4 },
                scene
            );
            box.parent = parent;
            box.isVisible = false;
            return [
                new PhysicsImpostor(
                    box,
                    PhysicsImpostor.BoxImpostor,
                    { mass: 1, restitution: 0.9, ignoreParent: true },
                    scene
                ),
            ];
        },
    },
    {
        type: "environment",
        name: "Lobbys",
        path: "Environments/Lobbys.glb",
        rhs: true,
        parentOffset: new Vector3(0, 0, 0),
        physicsImpostorsCb: (
            scene: Scene,
            parent: AbstractMesh,
            container: AssetContainer
        ) => {
            const box = MeshBuilder.CreateBox(
                "collider",
                { width: 3.71, height: 3.14, depth: 4.39 },
                scene
            );
            box.position = new Vector3(0, 3.14 / 2, 0);
            box.isVisible = false;
            box.parent = parent;

            return [
                new PhysicsImpostor(
                    box,
                    PhysicsImpostor.BoxImpostor,
                    { mass: 0, restitution: 0.9, ignoreParent: true },
                    scene
                ),
            ];
        },
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
        parentOffset: new Vector3(-85, 7.5, 97),
        rhs: true,
    },
    {
        type: "character",
        name: "BlueMonsterGirl",
        path: "Avatars/BlueMonsterGirl.glb",
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
    {
        type: "sound",
        name: "HeavenlySlowDance",
        path: "Sound/HeavenlySlowDance.mp3",
    },
];
