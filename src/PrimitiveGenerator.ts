import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core";

export namespace MeshPrimitiveGenerator {
    export function camera(scene: Scene) {
        // Square pyramid
        const camera = MeshBuilder.CreateCylinder(
            "camera",
            {
                height: 1,
                diameterTop: 0.0,
                diameterBottom: 0.5,
                tessellation: 4,
            },
            scene
        );

        // Wireframe only for now
        const material = scene.getMaterialByName("wireframe");
        if (material) {
            camera.material = material;
        } else {
            throw new Error("Material not found: wireframe");
        }

        return camera;
    }

    export function axes(scene: Scene) {
        const x = MeshBuilder.CreateLines(
            "x",
            {
                points: [new Vector3(0, 0, 0), new Vector3(1, 0, 0)],
                colors: [new Color4(1, 0, 0, 1), new Color4(1, 0, 0, 1)],
            },
            scene
        );

        const y = MeshBuilder.CreateLines(
            "y",
            {
                points: [new Vector3(0, 0, 0), new Vector3(0, 1, 0)],
                colors: [new Color4(0, 1, 0, 1), new Color4(0, 1, 0, 1)],
            },
            scene
        );

        const z = MeshBuilder.CreateLines(
            "z",
            {
                points: [new Vector3(0, 0, 0), new Vector3(0, 0, 1)],
                colors: [new Color4(0, 0, 1, 1), new Color4(0, 0, 1, 1)],
            },
            scene
        );

        const container = new Mesh("axes", scene);
        x.parent = container;
        y.parent = container;
        z.parent = container;

        return container;
    }

    export function eyeIndicator(scene: Scene) {
        const eye = MeshBuilder.CreateSphere(
            "eye",
            {
                segments: 6,
                diameter: 0.01,
            },
            scene
        );

        const material = scene.getMaterialByName("red");
        if (material) {
            eye.material = material;
        } else {
            throw new Error("Material not found: red");
        }

        eye.renderingGroupId = 2;

        return eye;
    }
}
