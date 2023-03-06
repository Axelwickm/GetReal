import { Vector3Schema, QuaternionSchema } from "./schema/MathSchemas";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export namespace Conversion {
    export function schemaToBabylonVector3(
        vector3Schema: Vector3Schema
    ): Vector3 {
        return new Vector3(vector3Schema.x, vector3Schema.y, vector3Schema.z);
    }

    export function schemaToBabylonQuaternion(
        quaternionSchema: QuaternionSchema
    ): Quaternion {
        return new Quaternion(
            quaternionSchema.x,
            quaternionSchema.y,
            quaternionSchema.z,
            quaternionSchema.w
        );
    }

    export function babylonToSchemaVector3(vector3: Vector3): Vector3Schema {
        return new Vector3Schema(vector3.x, vector3.y, vector3.z);
    }

    export function babylonToSchemaQuaternion(
        quaternion: Quaternion
    ): QuaternionSchema {
        return new QuaternionSchema(
            quaternion.w,
            quaternion.x,
            quaternion.y,
            quaternion.z
        );
    }

    export function babylonToMessageVector3(
        vector3: Vector3
    ): [number, number, number] {
        return [vector3.x, vector3.y, vector3.z];
    }

    export function babylonToMessageQuaternion(
        quaternion: Quaternion
    ): [number, number, number, number] {
        return [quaternion.w, quaternion.x, quaternion.y, quaternion.z];
    }
}
