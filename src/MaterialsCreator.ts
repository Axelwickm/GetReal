import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MirrorTexture } from "@babylonjs/core/Materials/Textures/mirrorTexture";

export namespace MaterialsGenerator {
    export function addMaterialsToScene(scene: Scene) {
        scene.materials.push(singleColor(scene, "red", [1, 0, 0]));
        scene.materials.push(singleColor(scene, "black", [0, 0, 0]));
        scene.materials.push(wireframe(scene));
        scene.materials.push(mirror(scene));
    }

    export function singleColor(
        scene: Scene,
        name: string,
        color: [number, number, number]
    ) {
        const material = new StandardMaterial(name, scene);
        material.diffuseColor.set(color[0], color[1], color[2]);
        return material;
    }

    export function wireframe(scene: Scene) {
        const wireframe = new StandardMaterial("wireframe", scene);
        wireframe.wireframe = true;
        wireframe.alpha = 0.5;
        return wireframe;
    }

    export function mirror(scene: Scene) {
        const mirror = new StandardMaterial("mirror", scene);
        mirror.reflectionTexture = new MirrorTexture(
            "mirror",
            1024,
            scene,
            true
        );
        return mirror;
    }
}
