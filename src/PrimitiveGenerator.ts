import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";


export namespace MeshPrimitiveGenerator {
    export function camera(scene: Scene) {
        // Square pyramid
        const camera = MeshBuilder.CreateCylinder("camera", {
            height: 1,
            diameterTop: 0.0,
            diameterBottom: 0.5,
            tessellation: 4,
        }, scene);
        
        // Wireframe only for now 
        const material = scene.getMaterialByName("wireframe");
        if (material) {
            camera.material = material;
        } else {
            throw new Error("Material not found: wireframe");
        }

        return camera;
    }
}


