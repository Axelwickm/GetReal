import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PlayerSchema } from "../schema/PlayerSchema";

import { Room } from "colyseus.js";

import { WebXRDefaultExperience, WebXRState } from "@babylonjs/core";

// Abstract class
export abstract class HardwareRig {
    public globalPosition?: Vector3 = Vector3.Zero();
    public globalPositionMask?: Vector3 = Vector3.Zero();

    public leftController?: XRInputSource;
    public leftControllerPosition?: Vector3;
    public leftControllerRotation?: Quaternion;
    private leftRotate = Quaternion.FromEulerAngles(
        -Math.PI / 2,
        -Math.PI / 2,
        0
    );

    public rightController?: XRInputSource;
    public rightControllerPosition?: Vector3;
    public rightControllerRotation?: Quaternion;
    private rightRotate = Quaternion.FromEulerAngles(
        -Math.PI / 2,
        Math.PI / 2,
        0
    );

    public aPressed: boolean = false;
    public aTriggered: boolean = false;

    public bPressed: boolean = false;
    public bTriggered: boolean = false;

    public shouldBlackout: boolean = false;

    public xr: WebXRDefaultExperience;

    constructor(xr: WebXRDefaultExperience) {
        this.xr = xr;
    }

    static getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    isMe(): boolean {
        throw new Error("Abstract method not implemented");
    }

    update(state: PlayerSchema, room: Room, deltaTime: number) {
        if (this.isMe()) {
            if (
                this.globalPosition &&
                this.xr.baseExperience.state === WebXRState.IN_XR
            ) {
                const inverseMask = new Vector3(
                    1 - this.globalPositionMask!.x,
                    1 - this.globalPositionMask!.y,
                    1 - this.globalPositionMask!.z
                );

                this.xr.baseExperience.camera.position =
                    this.xr.baseExperience.camera.position
                        .multiply(inverseMask)
                        .add(
                            this.globalPosition.multiply(
                                this.globalPositionMask!
                            )
                        );

                this.globalPosition = undefined;
                this.globalPositionMask = undefined;
            }
        }
    }

    networkUpdate(state: PlayerSchema, room: Room, deltaTime: number) {
        // This is called from Player, so no need to add own listeners
        this.checkXRInput();
    }

    getBone(name: string): { position: Vector3; rotation: Quaternion } | null {
        throw new Error("Abstract method not implemented");
    }

    getAllBones(): Map<string, { position: Vector3; rotation: Quaternion }> {
        throw new Error("Abstract method not implemented");
    }

    setControllerVisibility(value: boolean) {
        for (const controller of this.xr.input.controllers) {
            controller.grip?.setEnabled(value);
        }
    }

    setPosition(position: Vector3, mask: Vector3) {
        this.globalPosition = position;
        this.globalPositionMask = mask;
    }

    // TODO: controller states (transforms + actions)

    checkXRInput() {
        this.xr.input.controllers.forEach((controller) => {
            if (controller.inputSource.handedness === "left") {
                if (!this.leftController)
                    this.leftController = controller.inputSource;
                this.leftControllerPosition = controller.grip?.position.clone();
                this.leftControllerRotation =
                    controller.grip?.rotationQuaternion?.clone() ?? undefined;
                if (this.leftControllerRotation)
                    this.leftControllerRotation.multiplyInPlace(
                        this.rightRotate
                    );
            } else if (controller.inputSource.handedness === "right") {
                if (!this.rightController)
                    this.rightController = controller.inputSource;
                this.rightControllerPosition =
                    controller.grip?.position.clone();
                this.rightControllerRotation =
                    controller.grip?.rotationQuaternion?.clone() ?? undefined;

                if (this.rightControllerRotation)
                    this.rightControllerRotation.multiplyInPlace(
                        this.leftRotate
                    );

                //   https://www.w3.org/TR/webxr-gamepads-module-1/
                const a =
                    controller.inputSource.gamepad?.buttons[4]?.pressed ??
                    false;
                this.aTriggered = a && !this.aPressed;
                this.aPressed = a ?? false;

                const b =
                    controller.inputSource.gamepad?.buttons[5]?.pressed ??
                    false;
                this.bTriggered = b && !this.bPressed;
                this.bPressed = b ?? false;
            }
        });
    }

    async calibrate(room: Room) {
        throw new Error("Abstract method not implemented");
    }
}
