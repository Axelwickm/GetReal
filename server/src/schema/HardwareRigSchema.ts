import { Schema, type } from "@colyseus/schema";
import { Vector3Schema, QuaternionSchema } from "./MathSchemas";

export const HardwareRigUpdateMessageType = "hardwareRigUpdate";
export type HardwareRigUpdateMessage = {
    sessionId: string; // What player should update
    rigType: string;

    headToXRPosition?: [number, number, number];
    headToXRRotation?: [number, number, number, number];
    headToXROffset?: [number, number, number];
    origoToXRPosition?: [number, number, number];
};

export class HardwareRigSchema extends Schema {
    @type("string") rigType: string = "xr"; // default to xr
    @type(Vector3Schema) headToXRPosition: Vector3Schema = new Vector3Schema();
    @type(QuaternionSchema) headToXRRotation: QuaternionSchema =
        new QuaternionSchema();
    @type(Vector3Schema) headToXROffset: Vector3Schema = new Vector3Schema();
    @type(Vector3Schema) origoToXRPosition: Vector3Schema = new Vector3Schema(); 

    updateFromMessage(message: HardwareRigUpdateMessage) {
        this.rigType = message.rigType;
        if (message.headToXRPosition)
            this.headToXRPosition = new Vector3Schema(
                message.headToXRPosition[0],
                message.headToXRPosition[1],
                message.headToXRPosition[2]
            );

        if (message.headToXRRotation)
            this.headToXRRotation = new QuaternionSchema(
                message.headToXRRotation[0],
                message.headToXRRotation[1],
                message.headToXRRotation[2],
                message.headToXRRotation[3]
            );

        if (message.headToXROffset)
            this.headToXROffset = new Vector3Schema(
                message.headToXROffset[0],
                message.headToXROffset[1],
                message.headToXROffset[2]
            );

        if (message.origoToXRPosition)
            this.origoToXRPosition = new Vector3Schema(
                message.origoToXRPosition[0],
                message.origoToXRPosition[1],
                message.origoToXRPosition[2]
            );
    }
}
