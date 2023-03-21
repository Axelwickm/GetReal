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
            /*const box = MeshBuilder.CreateBox(
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
            ];*/

            const planes = [
                MeshBuilder.CreatePlane(
                    "ground",
                    { width: 3.71, height: 4.39 },
                    scene
                ),
                MeshBuilder.CreatePlane(
                    "wall1",
                    { width: 3.71, height: 4.39 },
                    scene
                ),
            ];
            planes[0].rotation = new Vector3(Math.PI / 2, 0, 0);
            planes[0].position = new Vector3(0, 0, 0);
            planes[1].rotation = new Vector3(0, Math.PI / 2, Math.PI / 2);
            planes[1].position = new Vector3(3.71 / 2, 3.14 / 2, 0);

            //ground.position = new Vector3(0, 0, 0);
            //ground.isVisible = false;

            return planes.map((plane) => {
                plane.parent = parent;
                return new PhysicsImpostor(
                    plane,
                    PhysicsImpostor.PlaneImpostor,
                    { mass: 0, restitution: 0.9, ignoreParent: true },
                    scene
                );
            });
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
