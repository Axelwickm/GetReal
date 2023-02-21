import * as dgram from "dgram";

type Vector3 = [number, number, number];
type Quaternion = [number, number, number, number]; // w, x, y, z

const MvnHeaderSize = 24;

enum MvnStreamingProtocol {
    SPPoseEuler = 1,
    SPPoseQuaternion = 2,
    SPPosePositions = 3,
    SPTagPositionsLegacy = 4,
    SPPoseUnity3D = 5,
    SPMetaScalingLegacy = 10,
    SPMetaPropInfoLegacy = 11,
    SPMetaMoreMeta = 12,
    SPMetaScaling = 13,
}

enum MvnMessageType {
    Invalid = 0,
    PoseDataYup = 1,
    PoseDataZup = 2,
    PoseDataMarker = 3,
    MGTag = 4,
    PosDataUnity = 5,
    ScaleInfo = 10,
    PropInfo = 11,
    MetaData = 12,
}

const MvnDefaultSegmentCount = 67;
const MvnBodySegmentCount = 23;
const MvnFingerSegmentCount = 40;
const MvnPropSegmentCount = 4;

/**
 * This class is responsible for reading data from the XSens suit from an UDP socket.
 *
 * It is inspired by the XSens MVN Unity Plugin, but is not a direct port.
 * This has the limitation that only one suit can be connected at a time.
 * In actuality, the MVN Unity Plugin can connect to up to 4 regular actors, and 1 object actor.
 * TODO is to support this here too.
 *
 * Tested on MvnStudio version 2023
 *
 */
export class XSensReader {
    port: number = 9763;
    socket?: dgram.Socket;

    // This can be slimmed down, since we really only care about the hip position
    bonePositions: Array<Vector3> = [];
    boneRotations: Array<Quaternion> = [];
    timestamp: number | undefined = undefined;

    /*
     * Pelvis 0
     * L5 1
     * L3 2
     * T12 3
     * T8 4
     * Neck 5
     * Head 6
     * Right Shoulder 7
     * Right Upper Arm 8
     * Right Forearm 9
     * Right Hand 10
     * Left Shoulder 11
     * Left Upper Arm 12
     * Left Forearm 13
     * Left Hand 14
     * Right Upper Leg 15
     * Right Lower Leg 16
     * Right Foot 17
     * Right Toe 18
     * Left Upper Leg 19
     * Left Lower Leg 20
     * Left Foot 21
     * Left Toe 22
     *
     * */

    constructor(port?: number) {
        this.port = port || this.port;
    }

    hasData(): boolean {
        return this.bonePositions.length > 0;
    }

    getLatestData(): {
        bonePositions: Array<Vector3>;
        boneRotations: Array<Quaternion>;
        timestamp: number | undefined;
    } {
        return {
            bonePositions: this.bonePositions,
            boneRotations: this.boneRotations,
            timestamp: this.timestamp,
        };
    }

    start() {
        if (this.socket) throw new Error("Socket already started");

        this.socket = dgram.createSocket("udp4");

        this.socket.on("listening", () => {
            const address = this.socket.address();
            console.log(
                `[XSensReader] Listening on ${address.address}:${address.port}`
            );
        });

        this.socket.on("message", (msg, rinfo) => {
            this.handleMessage(msg);
        });

        this.socket.on("error", (err) => {
            console.error(`[XSensReader] server error:\n${err.stack}`);
            this.socket?.close();
        });

        this.socket.bind(this.port);
    }

    stop() {
        this.socket?.close();
        this.socket = undefined;
    }

    handleMessage(msg: Buffer) {
        //console.log(`[XSensReader] Got message of length ${msg.length}`);
        if (msg.length < 6) {
            console.warn(`[XSensReader] Message too short`);
            return;
        }

        // Read bytes 4 and 5. TODO: verify that this nonsense is correct
        let result: string = "";
        result += String.fromCharCode(msg[4]);
        result += String.fromCharCode(msg[5]);
        const packId: MvnStreamingProtocol = parseInt(
            result,
            10
        ) as MvnStreamingProtocol;

        if (packId === MvnStreamingProtocol.SPPoseQuaternion) {
            if (msg.length >= 16) {
                //const streamId: number = msg[16];
                //console.log(`[XSensReader] Stream ID: ${streamId}`);
                const header = this.parseHeader(msg);
                //console.log(`[XSensReader] Header: ${JSON.stringify(header)}`);

                if (header["numberOfBodySegments"] !== MvnBodySegmentCount)
                    throw new Error(
                        `[XSensReader] Unexpected number of body segments: ` +
                            `${header["numberOfBodySegments"]}. Cannot handle any other count.`
                    );
                else if (header["numberOfProps"] !== 0)
                    throw new Error("[XSensReader] Cannot handle props");
                else if (header["numberOfFingerSegments"] !== 0)
                    throw new Error("[XSensReader] Cannot handle fingers");

                if (
                    header["messageType"] === MvnMessageType.PoseDataYup ||
                    header["messageType"] === MvnMessageType.PoseDataZup
                ) {
                    this.timestamp = header["timestamp"];
                    const payloadData = msg.subarray(MvnHeaderSize, msg.length);
                    // Stored inplace, for ease and efficiency
                    this.parsePayload(
                        payloadData,
                        header["numberOfBodySegments"]
                    );
                } else
                    throw new Error(
                        `[XSensReader] Unsupported message type ${header["messageType"]}`
                    );
            } else {
                throw new Error(
                    `[XSensReader] Message too short for SPPoseQuaternion`
                );
            }
        } else if (packId === MvnStreamingProtocol.SPMetaMoreMeta) {
            // TODO: Meta data not currently supported, but we may want to support it in the future.
        } else if (packId === MvnStreamingProtocol.SPMetaScaling) {
            // Dont know what this is, but we dont care
        } else {
            // We may want to be able to recover from this since the problem is caused inside of MVN Studio.
            // But for now, we just throw an error.
            throw new Error(`[XSensReader] Unsupported packet type ${packId}`);
        }
    }

    parseHeader(msg: Buffer) {
        // Mvn Datagram header identifier
        const headerIdentifier = "MXTP"; // Mvn Xsens Transfer Protocol
        if (headerIdentifier !== msg.subarray(0, 4).toString()) {
            throw new Error(
                `[XSensReader] Invalid MVN ID. Was ${msg.subarray(
                    0,
                    4
                )}, expected ${headerIdentifier}`
            );
        }

        const messageType = this.convertMessageType(msg.subarray(4, 6));
        const sampleCounter = this.convert32BitInt(msg.subarray(6, 10));
        const datagramCounter = msg[10];
        const numberOfItems = msg[11];
        const timestamp = this.convert32BitInt(msg.subarray(12, 16));
        const avatarId = msg[16];
        const numberOfBodySegments = msg[17];
        const numberOfProps = msg[18];
        const numberOfFingerSegments = msg[19];

        return {
            messageType,
            sampleCounter,
            datagramCounter,
            numberOfItems,
            timestamp,
            avatarId,
            numberOfBodySegments,
            numberOfProps,
            numberOfFingerSegments,
        };
    }

    convertMessageType(buffer: Buffer): MvnMessageType {
        if (buffer.length !== 2) {
            throw new Error(
                `[XSensReader] Invalid buffer length for convertMessageType`
            );
        }

        const t = (buffer[0] - 0x30) * 10 + (buffer[1] - 0x30);
        return t as MvnMessageType;
    }

    parsePayload(msg: Buffer, segmentCount: number): number[] {
        // Prepare arrays
        if (this.bonePositions.length !== segmentCount) {
            this.bonePositions = new Array<Vector3>(segmentCount);
            for (let i = 0; i < segmentCount; i++) {
                this.bonePositions[i] = [0, 0, 0];
            }
        }

        if (this.boneRotations.length !== segmentCount) {
            this.boneRotations = new Array<Quaternion>(segmentCount);
            for (let i = 0; i < segmentCount; i++) {
                this.boneRotations[i] = [1, 0, 0, 1];
            }
        }

        const payloadData = new Array<number>(segmentCount * 8);
        let cursor = 0;

        for (let i = 0; i < segmentCount; i++) {
            //const segmentId = this.convert32BitInt(
            //    msg.subarray(cursor + 0, cursor + 4)
            //);

            // x, y, z vector3
            // TODO: maybe convert to more standard format (see plugin)
            this.bonePositions[i][0] = this.convert32BitFloat(
                msg.subarray(cursor + 4, cursor + 8)
            );

            this.bonePositions[i][1] = this.convert32BitFloat(
                msg.subarray(cursor + 8, cursor + 12)
            );

            this.bonePositions[i][2] = this.convert32BitFloat(
                msg.subarray(cursor + 12, cursor + 16)
            );

            // w, x, y, z quaternion
            // TODO: maybe convert to more standard format (see plugin)
            this.boneRotations[i][0] = this.convert32BitFloat(
                msg.subarray(cursor + 16, cursor + 20)
            );
            this.boneRotations[i][1] = this.convert32BitFloat(
                msg.subarray(cursor + 20, cursor + 24)
            );
            this.boneRotations[i][2] = this.convert32BitFloat(
                msg.subarray(cursor + 24, cursor + 28)
            );
            this.boneRotations[i][3] = this.convert32BitFloat(
                msg.subarray(cursor + 28, cursor + 32)
            );

            cursor += 32;
        }

        return payloadData;
    }

    convert32BitInt(buffer: Buffer): int {
        if (buffer.length !== 4) {
            throw new Error(
                `[XSensReader] Invalid buffer length for convert32BitInt: ${buffer.length}`
            );
        }

        const temp = Buffer.alloc(4);
        temp[0] = buffer[3];
        temp[1] = buffer[2];
        temp[2] = buffer[1];
        temp[3] = buffer[0];

        return temp.readInt32LE(0);
    }

    convert32BitFloat(buffer: Buffer): number {
        if (buffer.length !== 4) {
            throw new Error(
                `[XSensReader] Invalid buffer length for convert32BitFloat: ${buffer.length}`
            );
        }

        const temp = Buffer.alloc(4);
        temp[0] = buffer[3];
        temp[1] = buffer[2];
        temp[2] = buffer[1];
        temp[3] = buffer[0];

        return temp.readFloatLE(0);
    }
}


