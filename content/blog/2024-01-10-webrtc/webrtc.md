---
title: "WebRTC guide"
permalink: "/blog/webrtc-intro/"
excerpt: "A guide to using WebRTC in browsers for p2p connections. Explains STUN and TURN servers as well as ICE protocol."
date: 2024-01-10 12:00:00
image: "./p2p-intro.png"
draft: false
---



WebRTC can be used to establish [peer-to-peer](https://en.wikipedia.org/wiki/Peer-to-peer) (p2p) connection between 2 browsers. On the surface, if you have ever used WebSockets, you might not think much about p2p. WebSockets are banal, what could be so complicated in p2p? But riddle me this: how does one host know the IP of the other host? How would the connection change if both users were on the same network? And what if they are on different continents? How do you handle mobile users switching between the networks? Many mechanisms from the familiar client-server model do not have a corresponding term in peer-to-peer.

Let's dive into a world of STUN and TURN servers. Let's look at the flow of the ICE protocol. A lot of what you will see should bring back some magic into the old boring request sending. You can find the complete code at my GitHub: [WebRTC-p2p-text-chat](https://github.com/Scthe/WebRTC-p2p-text-chat).




## Finding the peer

We start from a blank slate. Neither peer knows about the other. The only thing in common - they want to use our app to exchange data. The final connection will be [peer-to-peer](https://en.wikipedia.org/wiki/Peer-to-peer). Our role - to facilitate the direct transmission between them.

Let's look through a few tools used to enable unmediated connection between 2 peers on the internet.


<Figure>
  <BlogImage
    src="./p2p-intro.png"
    alt="Two peers, each in it's own local network talk through the internet."
  />
  <Figcaption>

Finding the peer on the Internet could be challenging. We can't just exchange addresses and expect things to work.

  </Figcaption>
</Figure>




### STUN server - Session Traversal Utilities for NAT

Specification:  [RFC 5389](https://datatracker.ietf.org/doc/html/rfc5389) or newer [RFC 8489](https://datatracker.ietf.org/doc/html/rfc8489)

The basic question when using WebRTC is: "How do I find the other user?". If we asked them for their IP, they would just respond with something like `10.0.0.1`. But this is only their IP inside a private network. To send a packet to them we need their internet-facing IP (and also a port and protocol). This packet would reach their router (under the internet-facing IP), that in turn would use some additional data to forward the package to the final device. This is known as network address translation (NAT).


<Figure>
  <BlogImage
    src="./stun-flow.png"
    alt="Client sends the request to STUN server. It goes through NAT. STUN server sends in the response address of the NAT."
  />
  <Figcaption>

Simple flow of requests to STUN server. It notes what was the address of the request source and puts it into a reponse.

  </Figcaption>
</Figure>


Providing internet-facing address (IP, port) for clients is a role of  STUN servers. There are even a few public STUN servers that we can use for free. You can test it for yourself using [https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/). Add `stun:stun.l.google.com:19302` and `stun:openrelay.metered.ca:80` then click "Gather candidates". Entries with type `srflx` will contain your public IP.


<Figure>
  <BlogImage
    src="./stun-real-life-test.png"
    alt="Instruction for 'WebRTC samples Trickle ICE' website. Fill the STUN/TURN server url, click 'Add Server' and execute test with 'Gather candidates'."
  />
  <Figcaption>

Testing STUN and TURN servers using "WebRTC samples Trickle ICE" tool.

  </Figcaption>
</Figure>


> Peer-to-peer is also used for BitTorrent protocol. Popular site [iknowwhatyoudownload.com](https://iknowwhatyoudownload.com/en/peer/) reports recent torrent files requested by your public IP.

 Once we know our public address, we can share it with other users. This solution is simple, low-maintenance and not always reliable. With certain network architectures and NAT devices you will need `TURN` and `ICE`. This often happens for [symmetric NATs](https://networkengineering.stackexchange.com/questions/67218/why-is-symmetric-nat-called-symmetric) . In that case, the internet-facing port changes based on the packet destination (different for STUN server and peer connection).


### TURN server - Traversal Using Relays around NAT

Specification: [RFC 5766](https://datatracker.ietf.org/doc/html/rfc5766)

Traversal Using Relays around NAT (`TURN`) server acts as an intermediary between 2 peers. If we cannot reach the 2nd device, we can send the data to the known 3rd party that forwards the packets for us. All that's needed is for both peers to agree on this method. We will see the negotiation process when discussing the ICE protocol. As you can imagine, this procedure is much more complicated than a STUN server.  Very often both STUN and TURN servers are running on the same machine.


<Figure>
  <BlogImage
    src="./turn-flow.png"
    alt="Host A cannot reach Host B directly. There is a TURN server between them that acts as an intermediary."
  />
  <Figcaption>

TURN servers are used when the direct communication between peers is not possible.

  </Figcaption>
</Figure>


TURN servers usually offer UDP, TCP and TLS protocols. While in WebRTC you can provide addresses for many TURN servers, usually you will only provide 3 entries to same server - one for each protocol. It is possible to select physically closest server based on geolocation of 2 peers.

There is a lot of traffic going through TURN server. It's not cheap. You will not find one for free. Or rather, you **do not want** to use one that is free. For simple tests, [Open Relay](https://www.metered.ca/tools/openrelay/) might be enough. In production, your choice is between using managed Communications Platform-as-a-Service (CPaaS) or [rolling your own](https://www.rtcsec.com/article/slack-webrtc-turn-compromise-and-bug-bounty/). Popular open source implementation are [coturn](https://github.com/coturn/coturn) and [Janus](https://janus.conf.meetecho.com/index.html).

If possible, we want to avoid resorting to TURN servers during the connections. Often, the address retrieved from STUN server will just work. And sometimes we can even use local addresses if devices are on same network. This is where `Interactive Connectivity Establishment (ICE)` comes in.



### ICE - Interactive Connectivity Establishment

Specification: [RFC 5245](https://datatracker.ietf.org/doc/html/rfc5245.)

> It's not [that kind of ICE](https://williamgibson.fandom.com/wiki/ICE).


To establish the connection, ICE will create a list of possible/candidate addresses:

1. Using local interface (`HOST CANDIDATE`).  This solution includes e.g. ethernet, WiFi or VPN. Creates  candidate per IP address in case the host is [multihomed](https://en.wikipedia.org/wiki/Multihoming). 
1. `SERVER REFLEXIVE CANDIDATES` based on the information from STUN servers.
1. `RELAYED CANDIDATES` that use TURN servers.
2. `PEER REFLEXIVE CANDIDATE` actually generated later during ICE process for [specific NAT configurations (e.g. symmetric NAT)](https://stackoverflow.com/questions/19905239/under-what-scenarios-does-server-reflexive-and-peer-reflexive-addresses-candidat).

Device A will then send the list to the device B. This is known as an **offer**. The device B will then create own candidates list (an **answer**) and send it to device A. You may ask, how is the list transmitted, if we have yet to establish peer-to-peer connection? We have to do it manually using other means that p2p. Usually both clients open a socket connection to your app's server. These connections are then used as the intermediary for the offer-answer exchange. The lists are encoded using [Session Description Protocol (SDP)](https://datatracker.ietf.org/doc/html/rfc4566) text protocol. This way, each device has a list of both its candidates and its peer's candidates. `CANDIDATE PAIRS` are  created, sorted by priority and checked. Both device A and B will send and confirm each pair. For a pair to pass the check, it requires 4 successful transmissions:
   
* Pair checked by Device A:
	* (1) Device A sends a request to Device B
	* (2) Device B responds to Device A
* Same pair checked by Device B:
	* (3) Device B sends a request to Device A
	* (4) Device A responds to Device B

One of the devices is nominated as a `CONTROLLING AGENT` and the other as a `CONTROLLED AGENT`. The `CONTROLLING AGENT` gets to decide which `CANDIDATE PAIR` that passed the check is selected as a communication method. It can even end the process early.


<Figure>
  <BlogImage
    src="./ice-offer-answer.png"
    alt="Example text for ICE offer and answer."
  />
  <Figcaption>

Examples of ICE offer and answer in firefox. ICE specification describes the grammar for both. Offer and answer can contain candidate attribute, but in this case, trickle ICE is used.

  </Figcaption>
</Figure>


This whole process might take a while. There exists [Trickle ICE](https://datatracker.ietf.org/doc/html/rfc8838) that does not wait to collect all candidates beforehand. New candidates are exchanged as they are discovered. Useful when waiting for initial STUN/TURN server response.

I recommend Tsahi Levent-Levi's ["We TURNed to see a STUNning view of the ICE"](https://bloggeek.me/we-turned-to-see-a-stunning-view-of-the-ice/) as a useful list of guidelines. Use [https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) for tests. Of course, if you have 2 devices on same local network, the ICE will probably select `HOST CANDIDATE`. Remember checking that UDP, TCP and TLS are configured correctly on the TURN server. ICE tends to prefer UDP, which is often blocked on firewalls. Disable UDP during testing.


## WebRTC flow in web browsers

Let's look how a sample flow looks for a simple peer-to-peer text chat room. While WebRTC can be used for more advanced scenarios than text messages, you will inevitably have to implement this functionality too. Concepts like 'chat room' are just too universal in multi user usages. 

When creating the new chatroom:

1. **User A** establishes a socket connection with the **socket server**. `userId_A` is generated.
2. **User A** sends a `create-room` socket message.
3. **Socket server** responds to **User A** with `room-created(roomId)`.
5. **User A** sends `roomId` (or a fancy 'join me' link) to someone by email or SMS, etc.
6. **User A** waits for someone to join so it can establish WebRTC connection with them.

After some time, **User B** will want to join **User A**:

1. **User B** clicks on the 'join me' link from **User A's** email/SMS.
2. **User B** establishes socket connection with the **socket server**, `userId_B` is generated.
3. **User B** sends a `join-room(roomId)` socket message.
4. **Socket server** sends message to **User A**: `new-user-joined(userId_B)`. This message is broadcasted to all other users in the chat room too.
5. **User A** starts ICE process to establish peer-to-peer connection to **User B**:
	1. **User A** [creates RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection) object providing a list of STUN and/or TURN server urls. Each url will be used to create ICE candidates. You should also set [icecandidate event handler](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event) for when the ICE finds suitable transport method.
	2. **User A** [creates data channel](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel) for text messages. If you call `createDataChannel()` later, it will trigger renegotiation. The peer that creates and offer is usually one that creates a data channel.
	3. **User A** creates an `offer` using [RTCPeerConnection: createOffer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer) method. It sets it as a [localDescription](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription),
	4. **User A** sends a `rtc-offer(userId_B, offer)` socket message to the **socket server**.
6. **Socket server** forwards offer message to **User B**: `rtc-offer(userId_A, offer)`.
7. **User B** receives the `rtc-offer(userId_A, offer)` from the  **socket server**. It creates ICE answer and sends it (through the **socket server**) to **User A**:
	1. **User B** [creates RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection) object similar to as **User A** has done it.
	2. **User B** adds a handler for [datachannel event](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event).
	3. **User B** creates an `answer` using [RTCPeerConnection: createAnswer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer) method.
	4. **User B** sends a `rtc-answer(userId_A, answer)` socket message to the **socket server**.
	5. **User B** [updates local description](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription) to `answer` and [remote description](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription) to `offer`. This is asynchronous and returns a promise.
8. **Socket server** forwards answer message to **User A**: `rtc-answer(userId_B, answer)`.
9. **User A** receives the `rtc-answer(userId_B, answer)` from the  **socket server**. It [updates remote description](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription) to `answer`. This fields are reversed when compared to `USER B`. This is asynchronous and returns a promise.
10. ICE protocol has all required information to create `CANDIDATE PAIRS`. It starts testing them.
11. ICE `icecandidate` event handler is called for both **User A** and **User B** multiple times. It should be forwarded to the other peer using `ice-candidate(userId__<otherPeer>, candidate)`. 
12. **Socket server** forwards answer message to the other peer: `ice-candidate(userId__<originalPeer>, candidate)`. 
13. Other peer receives `ice-candidate(userId__<originalPeer>, candidate)`. Calls [RTCPeerConnection: addIceCandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate).
14. Shortly after, the connection should [change state](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event) to `"connected"`. The data channel ["open" event](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/open_event) can be used to exchange the first p2p message.
17. **User A** and **User B** use [RTCDataChannel: send() method](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/send) and [message event](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/message_event) to communicate.

> If you want, you can make **User B** send the **offers** to all existing users in the chat room. It does not matter who sends an **offer** and who sends an **answer**.


<Figure>
  <BlogImage
    src="./ice-flow.png"
    alt="Complex diagram of the ICE protocol flow."
  />
  <Figcaption>

It might be easier to visualize the ICE protocol flow using a diagram.

  </Figcaption>
</Figure>


In total we have following socket messages:

* `create-room` from **User A** to the **socket server**.
* `room-created(roomId)` from **socket server** to **User A**.
* `join-room(roomId)` from **User B** to **socket server**. You might have to handle situation where room with such id does not exist.
* `new-user-joined(userId_B)` from **socket server** to **User A**. It should trigger the start of ICE process.
* `rtc-offer(userId_B, offer)` from **User A** to **socket server**. Forwarded to **User B** as `rtc-offer(userId_A, offer)`
* `rtc-answer(userId_A, answer)` from **User B** to **socket server**. Forwarded to **User A** as `rtc-answer(userId_B, offer)`
* `ice-candidate(userId_<otherPeer>, candidate)` from one of the users. Forwarded to the other peer as `ice-candidate(userId_<originalPeer>, candidate)`.

This simple example focuses only on 2 users. If there are more, you will have to create separate peer-to-peer connections between all of them. Each such connection requires an individual ICE process. The cause is simple - different connection conditions can exist between each 2 peers. E.g. half of the users can be in the same local network (`HOST CANDIDATE`), while the rest joins remotely from their homes ( `SERVER REFLEXIVE CANDIDATES` with STUN, or `RELAYED CANDIDATES` for TURN servers).

### Multiple ICE candidates

After you set [icecandidate event handler](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event) , you will receive **a lot** of valid candidates.  Each generated, non-null value should be exchanged with the other peer. Empty string acts as an end-of-candidates notification. It should also be exchanged. You can add a handler for [icegatheringstatechange event](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event) if you are interested in the current state.

> In my [WebRTC-p2p-text-chat](https://github.com/Scthe/WebRTC-p2p-text-chat) each ICE candidate is printed to the user. Often this takes half of the visible chat space.


## Coding WebRTC using JavaScript


Let's code this process in JavaScript. I will focus on the browser part, as server-side is just a simple socket message forwarding. Full app can be found on GitHub: [WebRTC-p2p-text-chat](https://github.com/Scthe/WebRTC-p2p-text-chat/tree/main). I will use `socket` to denote a Socket.IO connection to **socket server**.

First we declare ICE server address constants (urls for STUN and TURN servers). I will be then provided to `RTCPeerConnection` constructor.

```js
const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:openrelay.metered.ca:80', 'stun:stun.l.google.com:19302'] },
  ],
};
```

We will also store all current p2p connections in a [Map&lt;peerId, RTCPeerConnection&gt;](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map). The main use case of the app is to send some data to each peer. So, naturally, you need to store the list of all peers somewhere. It also simplifies later code.

```js
// Map<peerId, RTCPeerConnection>
const peerConnectionsRepo = new Map();
```

Let's also declare a util to create a new `RTCPeerConnection` that automatically registers it in `peerConnectionsRepo`:

```js
const createPeerConnection = (socket, peerId) => {
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);
  peerConnectionsRepo.set(peerId, peerConnection);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate !== null) {
      socket.emit('ice-candidate', peerId, event.candidate);
    }
  };

  return peerConnection;
};
```

We are now ready to execute the ICE flow. Receiving `"new-user-joined"` event, **User A** will send a ICE offer. In response, **User B** will send the ICE answer. Once **User A** calls `RTCPeerConnection: setRemoteDescription`, `CANDIDATE PAIRS` will be tested. For each candidate, the peer emits `"ice-candidate"` socket event (see utility function above). The other peer will receive it and call  `RTCPeerConnection: addIceCandidate`.

```js
/** (ICE step 1. Executed by "User A")
 * New user joined the chat room. Establish p2p connection with them (send ICE offer)
 */
socket.on('new-user-joined', async (newUserId) => {
  const peerConnection = createPeerConnection(socket, newUserId);
  
  const channel = peerConnection.createDataChannel('my-rtc-chat'); // TODO add handlers etc.

  const offer = await peerConnection.createOffer();
  peerConnection.setLocalDescription(offer);
  socket.emit('rtc-offer', newUserId, offer);
});
  
/** (ICE step 2, Executed by "User B")
 * After we joined a room we will receive ICE offers. Respond with ICE answer
 */
socket.on('rtc-offer', async (offerUserId, offer) => {
  const peerConnection = createPeerConnection(socket, offerUserId);
  peerConnection.setRemoteDescription(offer);
  
  peerConnection.ondatachannel = (event) => {
    const channel = event.channel; // TODO add handlers etc.
  };

  const answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  socket.emit('rtc-answer', offerUserId, answer);
});

/** (ICE step 3, Executed by "User A")
 * Handle answer response to our offer. After this,
 * ICE can start testing CANDIDATE PAIRS
 */
socket.on('rtc-answer', async (answerUserId, answer) => {
  const connection = peerConnectionsRepo.get(answerUserId);
  connection.setRemoteDescription(answer);
});

/** (ICE step 5, Executed by both "User A" and "User B")
 * In 'createPeerConnection' util we added a handler to 'icecandidate'.
 * It (ICE step 4) emits "ice-candidate" socket message.
 *
 * In the handler we just need to call "addIceCandidate" to signal ICE
 * that a working transport method was found.
 */
socket.on('ice-candidate', async (peerUserId, candidate) => {
  const connection = peerConnectionsRepo.get(peerUserId);
  await connection.addIceCandidate(candidate);
});
```

You can add a handler to [RTCPeerConnection: connectionstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event) event to detect when the connection changes state to `"connected"`. [RTCDataChannel open event](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/open_event) also works. In the code above, there are 2 `channel` variables representing [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) object. It can be used like so:

```js
channel.onopen = (_event) => {
  channel.send("Hi!");
};

channel.onmessage = (event) => console.log(event.data);

channel.onclose = () => {
  console.log("RTCDataChannel closed")
};

// trigger send message from the UI
document.getElementById("magic-btn").onclick = () => {
  channel.send("My user has clicked the button! Click it too!");
}
```

### Closing the WebRTC connection

Peer-to-peer connection is closed once the user refreshes or closes the tab. You can close it manually using [RTCPeerConnection: close](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close). You should also delete the `RTCPeerConnection` object just in case.

The other peer can detect this event by:
- Listening for [RTCPeerConnection: connectionstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event) to `disconnected`. For some reason, this does not always happen on firefox.
- Listening for  [RTCDataChannel: close event](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/close_event). In my experience, this is more reliable than `connectionstatechange`.
- Receiving the message from socket server. If the user refreshes/closes the tab, it's socket connection will be reset too. Broadcast it to the entire chat room. This way you are less dependent on the whims of the browser API.

### Things to watch for

You would assume that writing correct ICE flow is complicated. Fortunately, the browsers handle it for us. The bigger problem is code readability. All the events might seem arcane to developers not familiar with the ICE protocol. To prevent this, you can e.g. make the event names more readable like `socket.on('received-ice-answer, ...)`. Alternatively, add comments for each step. I often slap a "preamble" comment at the top of the file with useful notes. It also contains links to tickets that reported related bugs. This makes it easier to prevent regressions. And testing p2p is not trivial in itself.

The other problem is idempotency / state management. As we have discussed above, there are usually at least 3 ways to detect that user has disconnected. Yet you should inform the user about this only once. Sometimes you should ignore such events. In p2p video chat app it's OK if the user turns off their camera or microphone.

The deployment and testing process depends a lot on our app. It differs if you use CPaaS or deploy your own. It would be a separate article in itself to describe it.


<Figure>
  <BlogImage
    src="./sdparta.png"
    alt="Firefox offer that contains a magic string 'THIS_IS_SDPARTA'."
  />
  <Figcaption>

A little joke [left by firefox developers](https://stackoverflow.com/questions/52581525/what-does-sdparta-stand-for-in-a-firefox-webrtc-session-description).

  </Figcaption>
</Figure>



## References
 
* https://bloggeek.me/webrtcglossary/
* https://webrtc.github.io/samples/
* https://www.stackfive.io/work/webrtc/the-beginners-guide-to-understanding-webrtc
* https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
* https://www.viagenie.ca/publications/2008-08-cluecon-stun-turn-ice.pdf
* https://stackoverflow.com/questions/21069983/what-are-ice-candidates-and-how-do-the-peer-connection-choose-between-them
* https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
* https://www.3cx.com/blog/voip-howto/stun-details/
* https://stackoverflow.com/questions/52581525/what-does-sdparta-stand-for-in-a-firefox-webrtc-session-description


