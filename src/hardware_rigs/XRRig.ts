import {
    PlayerSchema,
    PlayerTransformUpdateMessageType,
    PlayerTransformUpdateMessage,
} from "../schema/PlayerSchema";
import { HardwareRig } from "./HardwareRig";

import { Room } from "colyseus.js";
import {
    WebXRDefaultExperience,
    Mesh,
    PhysicsImpostor,
    MeshBuilder,
    Scene,
} from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Conversion } from "../Conversion";

const UPDATE_RATE = 1000 / 30;

export class XRRig extends HardwareRig {
    boneTransforms: Map<string, { position: Vector3; rotation: Quaternion }> =
        new Map();
    timeSinceLastUpdate: number = Infinity;

    collisionMesh: Mesh;
    collisionImpostor: PhysicsImpostor;

    constructor(xr: WebXRDefaultExperience, scene: Scene) {
        super(xr);
        console.log("Create XRRig");
        this.boneTransforms.set("Head", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });

        this.boneTransforms.set("LeftHand", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });

        this.boneTransforms.set("RightHand", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });

        this.collisionMesh = MeshBuilder.CreateSphere(
            "meCollisionMesh",
            { diameter: 0.2 },
            scene
        );
        this.collisionMesh.isVisible = false;
        this.collisionMesh.isPickable = false;

        this.collisionImpostor = new PhysicsImpostor(
            this.collisionMesh,
            PhysicsImpostor.SphereImpostor,
            {
                mass: 1,
                restitution: 0.9,
            },
            scene
        );

        this.collisionImpostor.registerBeforePhysicsStep(() => {
            this.shouldBlackout = false;
        });

        this.collisionImpostor.registerOnPhysicsCollide(
            this.collisionImpostor,
            (collider, collidedWith) => {
                this.resolveCollision();
            }
        );
    }

    destroy() {
        this.collisionMesh.dispose();
        this.collisionImpostor.dispose();
    }

    static getRigType(): string {
        return "xr";
    }

    getRigType(): string {
        return XRRig.getRigType();
    }

    isMe(): boolean {
        return true;
    }

    getCameraTransform(): [Vector3, Quaternion] {
        const camera = this.xr.baseExperience.camera;
        return [camera.position, camera.rotationQuaternion];
    }

    getBone(name: string): { position: Vector3; rotation: Quaternion } | null {
        const bone = this.boneTransforms.get(name);
        if (bone) {
            return {
                position: bone.position,
                rotation: bone.rotation,
            };
        }
        return null;
    }

    getAllBones(): Map<string, { position: Vector3; rotation: Quaternion }> {
        return this.boneTransforms;
    }

    async calibrate(room: Room) {}

    resolveCollision() {
        // Reset position if we collide with something
        const camera = this.xr.baseExperience.camera;
        camera.position = new Vector3(
            this.collisionMesh.position.x,
            camera.position.y,
            this.collisionMesh.position.z
        );

        // Black out screen
        this.shouldBlackout = true;
    }

    networkUpdate(playerState: PlayerSchema, room: Room, deltaTime: number) {}

    update(playerState: PlayerSchema, room: Room, deltaTime: number) {
        super.networkUpdate(playerState, room, deltaTime);

        const camera = this.xr.baseExperience.camera;
        this.boneTransforms.set("Head", {
            position: camera.position,
            rotation: camera.rotationQuaternion,
        });

        if (this.leftControllerPosition && this.leftControllerRotation) {
            this.boneTransforms.set("LeftHand", {
                position: this.leftControllerPosition,
                rotation: this.leftControllerRotation,
            });
        }

        if (this.rightControllerPosition && this.rightControllerRotation) {
            this.boneTransforms.set("RightHand", {
                position: this.rightControllerPosition,
                rotation: this.rightControllerRotation,
            });
        }

        //this.collisionMesh.setAbsolutePosition(this.testObject.position);
        this.collisionMesh.position = camera.position;
        this.collisionImpostor.setLinearVelocity(Vector3.Zero());

        this.timeSinceLastUpdate += deltaTime;
        if (UPDATE_RATE < this.timeSinceLastUpdate) {
            // Sync camera position to server
            const message: PlayerTransformUpdateMessage = {
                sessionId: room.sessionId,
                bonePositions: {
                    Head: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("Head")!.position
                    ),
                    LeftHand: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("LeftHand")!.position
                    ),
                    RightHand: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("RightHand")!.position
                    ),
                },
                boneRotations: {
                    Head: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("Head")!.rotation
                    ),
                    LeftHand: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("LeftHand")!.rotation
                    ),
                    RightHand: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("RightHand")!.rotation
                    ),
                },
            };
            room.send(PlayerTransformUpdateMessageType, message);
            this.timeSinceLastUpdate = 0;
        }
    }
}
