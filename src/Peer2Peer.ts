import Peer from "simple-peer";

export class Peer2Peer {
    private peers: Map<string, Peer.Instance> = new Map();
    private bufferedSignals: Array<{
        sourceSessionId: string;
        signalData: string;
    }> = [];
    private mediaStream: Promise<MediaStream>;

    constructor(thisSessionId: string) {
        this.mediaStream = navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        });
    }

    connectToPeer(
        targetSessionId: string,
        initiator: boolean,
        signalCallback: (signalData: string) => void,
        audioStreamCallback: (audioStream: MediaStream) => void
    ) {
        this.mediaStream.then((ownStream) => {
            if (this.peers.has(targetSessionId)) {
                throw new Error("Peer already exists");
            } else {
                console.log("New peer", targetSessionId, initiator);
                const peer = new Peer({
                    initiator: initiator,
                    stream: ownStream,
                });

                this.peers.set(targetSessionId, peer);

                peer.on("connect", () => {
                    console.log("Peer connected");
                });

                peer.on("error", (err) => {
                    console.error("Setting up peer failed: ", err);
                });

                peer.on("stream", (stream) => {
                    if (stream.getAudioTracks().length === 0) {
                        console.error("No audio track in stream");
                    }
                    audioStreamCallback(stream);
                });

                peer.on("signal", (data) => {
                    signalCallback(JSON.stringify(data));
                });

                peer.on("close", () => {
                    console.log("Peer closed");
                });

                try {
                    peer.on("readable", (v: any) => {
                        console.log("Peer readable", v);
                    });
                } catch (e) {
                    console.error("Peer readable error", e);
                }

                peer.on("end", () => {
                    console.log("Peer end");
                });

                peer.on("resume", () => {
                    console.log("Peer resume");
                });

                this.bufferedSignals = this.bufferedSignals.filter((signal) => {
                    if (signal.sourceSessionId === targetSessionId) {
                        peer.signal(JSON.parse(signal.signalData));
                        return false;
                    } else {
                        return true;
                    }
                });
            }
        });
    }

    signalToPeer(sourceSessionId: string, signalData: string) {
        const peer = this.peers.get(sourceSessionId);
        if (!peer) {
            this.bufferedSignals.push({
                sourceSessionId,
                signalData,
            });
        } else {
            peer.signal(JSON.parse(signalData));
        }
    }

    disconnectFromPeer(sessionId: string) {
        const peer = this.peers.get(sessionId);
        if (peer) {
            peer.destroy();
            this.peers.delete(sessionId);
        }
    }
}
