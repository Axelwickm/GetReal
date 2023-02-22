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

export type XSensData = {
    bonePositions: Array<Vector3>;
    boneRotations: Array<Quaternion>;
    timestamp: number | undefined;
};

export class XSensReader {
    port: number = 9763;
    socket?: dgram.Socket;

    bonePositions: Array<Vector3> = [];
    boneRotations: Array<Quaternion> = [];
    timestamp: number | undefined = undefined;

    /*
     *  0: Pelvis
     *  1: L5
     *  2: L3
     *  3: T12
     *  4: T8
     *  5: Neck
     *  6: Head
     *  7: Right Shoulder
     *  8: Right Upper Arm
     *  9: Right Forearm
     *  10: Right Hand
     *  11: Left Shoulder
     *  12: Left Upper Arm
     *  13: Left Forearm
     *  14: Left Hand
     *  15: Right Upper Leg
     *  16: Right Lower Leg
     *  17: Right Foot
     *  18: Right Toe
     *  19: Left Upper Leg
     *  20: Left Lower Leg
     *  21: Left Foot
     *  22: Left Toe
     *
     */

    constructor(port?: number) {
        this.port = port || this.port;
    }

    hasData(): boolean {
        return this.bonePositions.length > 0;
    }

    getLatestData(): XSensData {
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

        let gotConnection = false;

        this.socket.on("message", (msg, rinfo) => {
            if (!gotConnection) {
                console.log(
                    `[XSensReader] Got connection from ${rinfo.address}:${rinfo.port}`
                );
                gotConnection = true;
            }
            this.handleMessage(msg);
        });

        this.socket.on("close", () => {
            console.log(`[XSensReader] Socket closed`);
            gotConnection = false;
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
                    this.parseAndSetPayload(
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
            // Metadata not currently supported, but we may want to support it in the future?
        } else if (packId === MvnStreamingProtocol.SPMetaScaling) {
            // Use in future?
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

    parseAndSetPayload(msg: Buffer, segmentCount: number): void {
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
                this.boneRotations[i] = [0, 0, 0, 1];
            }
        }

        let cursor = 0;
        for (let i = 0; i < segmentCount; i++) {
            //const segmentId = this.convert32BitInt(
            //    msg.subarray(cursor + 0, cursor + 4)
            //);

            // x, y, z vector3
            {
                const x = this.convert32BitFloat(
                    msg.subarray(cursor + 4, cursor + 8)
                );

                const y = this.convert32BitFloat(
                    msg.subarray(cursor + 8, cursor + 12)
                );

                const z = this.convert32BitFloat(
                    msg.subarray(cursor + 12, cursor + 16)
                );

                // Convert away from MVN's weird coordinate system
                this.bonePositions[i][0] = -y;
                this.bonePositions[i][1] = z;
                this.bonePositions[i][2] = x;
            }

            // w, x, y, z quaternion
            {
                const w = this.convert32BitFloat(
                    msg.subarray(cursor + 16, cursor + 20)
                );
                const x = this.convert32BitFloat(
                    msg.subarray(cursor + 20, cursor + 24)
                );
                const y = this.convert32BitFloat(
                    msg.subarray(cursor + 24, cursor + 28)
                );
                const z = this.convert32BitFloat(
                    msg.subarray(cursor + 28, cursor + 32)
                );

                // Unity Plugin does this, but seems to give incorrect results
                // this.boneRotations[i][0] = y;
                // this.boneRotations[i][1] = -z;
                // this.boneRotations[i][2] = -x;
                // this.boneRotations[i][3] = w;

                // This is works though
                this.boneRotations[i][0] = x;
                this.boneRotations[i][1] = -z;
                this.boneRotations[i][2] = -y;
                this.boneRotations[i][3] = w;
            }

            cursor += 32;
        }
    }

    convert32BitInt(buffer: Buffer): number {
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

    /*   Old code for finding right quaternion conversion. Kept for reference and becuse it's funny.
        // Get epoch time as seconds
        let epochTime = this.timestamp / 1000;
        epochTime = Math.floor(epochTime/10);
        const switches = [
            ["x", "y", "z"],
            ["x", "z", "y"],
            ["y", "x", "z"],
            ["y", "z", "x"],
            ["z", "x", "y"],
            ["z", "y", "x"]
        ];
        const factors = [
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1]
        ];
        const TOTAL_COMBINATIONS = switches.length * factors.length;
        const combination = epochTime % TOTAL_COMBINATIONS;
        // best are : 11, 27
        const switchIndex = Math.floor(combination / factors.length);
        const factorIndex = combination % factors.length;

        const s = switches[switchIndex];
        const f = factors[factorIndex];
        let str = "";
        for (let j = 0; j < 3; j++) {
            if (s[j] === "x") {
                this.boneRotations[i][j] = x * f[j];
                if (f[j] === -1) {
                    str += "-";
                } else {
                    str += "+";
                }
                str += "x";
            } else if (s[j] === "y") {
                this.boneRotations[i][j] = y * f[j];
                if (f[j] === -1) {
                    str += "-";
                } else {
                    str += "+";
                }
                str += "y";
            } else if (s[j] === "z") {
                this.boneRotations[i][j] = z * f[j];
                if (f[j] === -1) {
                    str += "-";
                } else {
                    str += "+";
                }
                str += "z";
            }
            str += " ";
        }
        console.log(combination, str);
    */
}
