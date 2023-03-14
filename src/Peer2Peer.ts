import { Peer, MediaConnection } from "peerjs";

export class Peer2Peer {
    private peer: Peer;
    private peers: Map<string, MediaConnection> = new Map();
    private peerId: string;

    constructor(peerId: string) {
        this.peerId = peerId;
        const host = window.location.hostname;
        this.peer = new Peer(peerId, {
            host: host,
            port: 9000,
            path: "/peerjs",
            secure: true,
        });
        const peer = this.peer;
        peer.on("call", function (call) {
            // @ts-ignore
            navigator.getUserMedia(
                { video: false, audio: true },
                function (stream: any) {
                    console.log("Answering call");
                    call.answer(stream); // Answer the call with an Audio stream
                    call.on("stream", function (remoteStream) {
                        // Play audio stream
                        var audio = document.createElement("audio");
                        audio.srcObject = remoteStream;
                        audio.play();
                    });
                },
                function (err: any) {
                    console.log("Failed to get local stream", err);
                }
            );
        });
    }

    connectToPeer(otherPeerId: string) {
        console.log("Connecting to peer", otherPeerId);

        // If otherPeerId comes last in the alphabet, we call them
        if (otherPeerId < this.peerId) return;

        const peer = this.peer;
        // Typscript doesn't know about navigator.getUserMedia so we have to
        // @ts-ignore
        navigator.getUserMedia(
            { video: false, audio: true },
            function (stream: any) {
                console.log("Calling peer");
                var call = peer.call(otherPeerId, stream);
                call.on("stream", function (remoteStream) {
                    // Play audio stream
                    var audio = document.createElement("audio");
                    audio.srcObject = remoteStream;
                    audio.play();
                });
            },
            function (err: any) {
                console.log("Failed to get local stream", err);
            }
        );
    }

    disconnectFromPeer(peerId: string) {
        const conn = this.peers.get(peerId);
        if (!conn) return;
        conn.close();
        this.peers.delete(peerId);
    }
}
