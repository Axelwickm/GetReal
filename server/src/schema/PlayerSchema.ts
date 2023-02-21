import { ArraySchema, Schema, type, } from "@colyseus/schema";
import { Vector3Schema, QuaternionSchema } from "./MathSchema";

export class PlayerSchema extends Schema {
    @type("string") name: string = "unknown";
    @type("string") avatarType: string = "unknown";
    @type("number") performerId: number = -1;


    // Relative to world space
    @type(Vector3Schema) cameraPosition = new Vector3Schema();
    @type(QuaternionSchema) cameraRotation = new QuaternionSchema();

    // Below is relative to the camera space above
    @type(Vector3Schema) leftHandPosition = new Vector3Schema();
    @type(QuaternionSchema) leftHandRotation = new QuaternionSchema();
    // TODO: hand state

    @type(Vector3Schema) rightHandPosition = new Vector3Schema();
    @type(QuaternionSchema) rightHandRotation = new QuaternionSchema();
    // TODO: hand state

    @type(Vector3Schema) hipPosition = new Vector3Schema();
    @type(QuaternionSchema) hipRotation = new QuaternionSchema();

    // Relative to the hip rotation
    @type([Vector3Schema]) bonePositions = new ArraySchema<Vector3Schema>();
    @type([QuaternionSchema]) boneRotations = new ArraySchema<QuaternionSchema>();

}
