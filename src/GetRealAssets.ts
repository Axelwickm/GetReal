import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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
    },
    {
        type: "environment",
        name: "Warehouse",
        path: "Environments/Warehouse.glb",
        parentOffset: new Vector3(16, 0, 0),
        rhs: true,
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
