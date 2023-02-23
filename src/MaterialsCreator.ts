import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export namespace MaterialsGenerator {
    export function addMaterialsToScene(scene: Scene) {
        scene.materials.push(singleColor(scene, "red", [1, 0, 0]));
        scene.materials.push(singleColor(scene, "black", [0, 0, 0]));
        scene.materials.push(wireframe(scene));
    }

    export function singleColor(scene: Scene, name: string, color: [number, number, number]) {
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
}

