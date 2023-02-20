import * as dgram from 'dgram';

type Vector3 = [number, number, number];
type Quaternion = [number, number, number, number]; // TODO: check w, x, y, z


enum MvnStreamingProtocol {
    SPPoseEuler = 1,
    SPPoseQuaternion = 2,
    SPPosePositions = 3,
    SPTagPositionsLegacy = 4,
    SPPoseUnity3D = 5,
    SPMetaScalingLegacy = 10,
    SPMetaPropInfoLegacy = 11,
    SPMetaMoreMeta = 12,
    SPMetaScaling = 13
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
 * Test on MvnStudio version 2023
 *
 */
export class XSensReader {
    port: number = 9763;
    socket?: dgram.Socket;

    // This can be slimmed down, since we really only care about the hip position
    bonePositions: Array<Vector3> = [];
    boneOrientations: Array<Quaternion> = [];
    timestamp: number | undefined = undefined;

    constructor(port?: number) {
        this.port = port || this.port;
    }


    hasData(): boolean {
        return this.bonePositions.length > 0;
    }
    
    getLatestData(): { bonePositions: Array<Vector3>, boneOrientations: Array<Quaternion>, timestamp: number | undefined } {
        return { bonePositions: this.bonePositions, boneOrientations: this.boneOrientations, timestamp: this.timestamp };
    }

    start() {
        if (this.socket)
            throw new Error('Socket already started');

        this.socket = dgram.createSocket('udp4');

        this.socket.on('listening', () => {
            const address = this.socket.address();
            console.log(`[XSensReader] Listening on ${address.address}:${address.port}`);
        });

        this.socket.on('message', (msg, rinfo) => {
            this.handleMessage(msg);
        });

        this.socket.on('error', (err) => {
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
        console.log(`[XSensReader] Got message of length ${msg.length}`);
        if (msg.length < 6){
            console.warn(`[XSensReader] Message too short`);
            return;
        }

        // Read bytes 4 and 5. TODO: verify that this nonsense is correct
        let result: string = "";
        result += String.fromCharCode(msg[4]);
        result += String.fromCharCode(msg[5]);
        const packId: MvnStreamingProtocol = parseInt(result, 10) as MvnStreamingProtocol;

        if (packId === MvnStreamingProtocol.SPPoseQuaternion) {
            if (msg.length >= 16){
                const streamId : int = msg[16];
                console.log(`[XSensReader] Stream ID: ${streamId}`);
                const segmentCount = msg.length / 32; // this makes no sense to me, but it's what the MVN Unity Plugin does
                console.log(`[XSensReader] Segment count: ${segmentCount}`);
                if (segmentCount !== 0) {
                    
                }
            } else {
                throw new Error(`[XSensReader] Message too short for SPPoseQuaternion`);
            }
        } else {
            // We may want to be able to recover from this since the problem is caused inside of MVN Studio.
            // But for now, we just throw an error.
            throw new Error(`[XSensReader] Unsupported packet type ${packId}`);
        }

    }

}





