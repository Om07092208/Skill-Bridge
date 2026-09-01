import {
  useState,
  useEffect,
  useRef,
} from "react";

import { io } from "socket.io-client";

import Peer from "simple-peer";

import {
  Copy,
  Check,
  Users,
  ArrowRight,
  MessageCircle,
  User,
  Mic,
  Clock,
  Square,
  CheckCircle,
  MicOff,
} from "lucide-react";

import "./GD.css";


// ==========================================
// SOCKET SERVER
// ==========================================

const socket = io(
  "http://localhost:3001"
);


function GD() {

  const [screen, setScreen] =
    useState("home");

  const [roomId, setRoomId] =
    useState("");

  const [joinId, setJoinId] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [playerCount, setPlayerCount] =
    useState(1);

  const [connectionStatus, setConnectionStatus] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [gdTopic, setGdTopic] =
    useState("");

  const [currentTurn, setCurrentTurn] =
    useState(0);

  const [speaking, setSpeaking] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState(60);

  const [myPlayerNumber, setMyPlayerNumber] =
    useState(null);

  const [micEnabled, setMicEnabled] =
    useState(false);


  const localStream =
    useRef(null);

  const peers =
    useRef({});


  // ==========================================
  // CREATE WEBRTC PEER
  // ==========================================

  const createPeer = (
    targetSocketId,
    stream
  ) => {

    if (
      peers.current[targetSocketId]
    ) {
      return;
    }


    console.log(
      "Creating WebRTC peer:",
      targetSocketId
    );


    const peer =
      new Peer({
        initiator: true,

        trickle: false,

        stream: stream,
      });


    peer.on(
      "signal",
      (signal) => {

        console.log(
          "Sending WebRTC signal to:",
          targetSocketId
        );


        socket.emit(
          "webrtc-signal",
          {
            targetSocketId,

            signal,
          }
        );

      }
    );


    peer.on(
      "stream",
      (remoteStream) => {

        console.log(
          "Remote stream received:",
          targetSocketId
        );


        playRemoteAudio(
          remoteStream,
          targetSocketId
        );

      }
    );


    peer.on(
      "connect",
      () => {

        console.log(
          "WebRTC connected:",
          targetSocketId
        );

      }
    );


    peer.on(
      "error",
      (error) => {

        console.error(
          "WebRTC error:",
          error
        );

      }
    );


    peer.on(
      "close",
      () => {

        console.log(
          "WebRTC peer closed:",
          targetSocketId
        );

        delete peers.current[
          targetSocketId
        ];

      }
    );


    peers.current[
      targetSocketId
    ] = peer;

  };


  // ==========================================
  // RECEIVE WEBRTC SIGNAL
  // ==========================================

  const handleSignal = ({
    senderSocketId,
    signal,
  }) => {

    let peer =
      peers.current[
        senderSocketId
      ];


    // ========================================
    // CREATE RECEIVER
    // ========================================

    if (!peer) {

      console.log(
        "Creating WebRTC receiver:",
        senderSocketId
      );


      peer =
        new Peer({
          initiator: false,

          trickle: false,
        });


      peer.on(
        "signal",
        (answerSignal) => {

          console.log(
            "Sending WebRTC answer to:",
            senderSocketId
          );


          socket.emit(
            "webrtc-signal",
            {
              targetSocketId:
                senderSocketId,

              signal:
                answerSignal,
            }
          );

        }
      );


      peer.on(
        "stream",
        (remoteStream) => {

          console.log(
            "Remote voice received from:",
            senderSocketId
          );


          playRemoteAudio(
            remoteStream,
            senderSocketId
          );

        }
      );


      peer.on(
        "connect",
        () => {

          console.log(
            "Receiver WebRTC connected:",
            senderSocketId
          );

        }
      );


      peer.on(
        "error",
        (error) => {

          console.error(
            "Receiver WebRTC error:",
            error
          );

        }
      );


      peer.on(
        "close",
        () => {

          console.log(
            "Receiver WebRTC closed:",
            senderSocketId
          );


          delete peers.current[
            senderSocketId
          ];

        }
      );


      peers.current[
        senderSocketId
      ] = peer;

    }


    // ========================================
    // PROCESS SIGNAL
    // ========================================

    try {

      peer.signal(
        signal
      );

    } catch (error) {

      console.error(
        "Signal processing error:",
        error
      );

    }

  };


  // ==========================================
  // PLAY REMOTE AUDIO
  // ==========================================

  const playRemoteAudio = (
    stream,
    socketId
  ) => {

    let audio =
      document.getElementById(
        `gd-audio-${socketId}`
      );


    if (!audio) {

      audio =
        document.createElement(
          "audio"
        );


      audio.id =
        `gd-audio-${socketId}`;


      audio.autoplay =
        true;


      audio.playsInline =
        true;


      audio.controls =
        false;


      audio.volume =
        1.0;


      document.body.appendChild(
        audio
      );

    }


    audio.srcObject =
      stream;


    console.log(
      "Attempting to play remote audio:",
      socketId
    );


    audio.play()
      .then(() => {

        console.log(
          "Remote audio playing:",
          socketId
        );

      })
      .catch((error) => {

        console.error(
          "Browser blocked remote audio:",
          error
        );

      });

  };


  // ==========================================
  // START MICROPHONE
  // ==========================================

  const startMicrophone =
    async () => {

      try {

        console.log(
          "Requesting microphone..."
        );


        if (
          localStream.current
        ) {

          return true;

        }


        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({

              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,

                autoGainControl:
                  true,
              },

              video: false,

            });


        console.log(
          "Microphone permission granted"
        );


        localStream.current =
          stream;


        setMicEnabled(
          true
        );


        // ====================================
        // GET OTHER PLAYERS
        // ====================================

        socket.emit(
          "request-room-peers",
          roomId
        );


        return true;

      } catch (error) {

        console.error(
          "Microphone error:",
          error
        );


        setErrorMessage(
          "Please allow microphone permission."
        );


        return false;

      }

    };


  // ==========================================
  // STOP MICROPHONE
  // ==========================================

  const stopMicrophone =
    () => {

      console.log(
        "Stopping microphone..."
      );


      if (
        localStream.current
      ) {

        localStream.current
          .getTracks()
          .forEach(
            (track) => {

              console.log(
                "Stopping microphone track:",
                track.kind
              );


              track.stop();

            }
          );


        localStream.current =
          null;

      }


      // ======================================
      // CLOSE LOCAL WEBRTC PEERS
      // ======================================

      Object.values(
        peers.current
      ).forEach(
        (peer) => {

          try {

            peer.destroy();

          } catch (error) {

            console.log(
              "Peer close error:",
              error
            );

          }

        }
      );


      peers.current =
        {};


      // ======================================
      // REMOVE AUDIO ELEMENTS
      // ======================================

      document
        .querySelectorAll(
          'audio[id^="gd-audio-"]'
        )
        .forEach(
          (audio) => {

            audio.pause();

            audio.srcObject =
              null;

            audio.remove();

          }
        );


      setMicEnabled(
        false
      );


      console.log(
        "Microphone completely stopped"
      );

    };


  // ==========================================
  // SOCKET EVENTS
  // ==========================================

  useEffect(() => {


    // ========================================
    // CONNECT
    // ========================================

    const handleConnect =
      () => {

        console.log(
          "Socket connected:",
          socket.id
        );


        setConnectionStatus(
          true
        );

      };


    // ========================================
    // DISCONNECT
    // ========================================

    const handleDisconnect =
      () => {

        console.log(
          "Socket disconnected"
        );


        setConnectionStatus(
          false
        );

      };


    // ========================================
    // PLAYER COUNT
    // ========================================

    const handlePlayerCount =
      (count) => {

        console.log(
          "Player count:",
          count
        );


        setPlayerCount(
          count
        );

      };


    // ========================================
    // PLAYER ASSIGNED
    // ========================================

    const handlePlayerAssigned =
      (data) => {

        console.log(
          "I am User:",
          data.playerNumber
        );


        setMyPlayerNumber(
          data.playerNumber
        );

      };


    // ========================================
    // GD STATE
    // ========================================

    const handleGDState =
      (data) => {

        console.log(
          "GD STATE:",
          data
        );


        // ====================================
        // IMPORTANT:
        // Stop local microphone when turn ends
        // ====================================

        if (
          data.speaking === false &&
          localStream.current
        ) {

          console.log(
            "Turn ended - stopping local microphone"
          );


          stopMicrophone();

        }


        setGdTopic(
          data.topic || ""
        );


        setCurrentTurn(
          data.currentTurn ?? 0
        );


        setSpeaking(
          data.speaking || false
        );


        setTimeLeft(
          data.timeLeft ?? 60
        );


        // ====================================
        // SHOW GD SCREEN
        // ====================================

        if (
          data.status === "ready" ||
          data.status === "speaking"
        ) {

          setScreen(
            "gd"
          );

        }


        // ====================================
        // COMPLETED
        // ====================================

        if (
          data.status ===
          "completed"
        ) {

          stopMicrophone();


          setScreen(
            "completed"
          );

        }

      };


    // ========================================
    // EXISTING PEER
    // ========================================

    const handleExistingPeer =
      ({ socketId }) => {

        console.log(
          "Existing peer received:",
          socketId
        );


        if (
          !localStream.current
        ) {

          console.log(
            "No microphone stream available."
          );


          return;

        }


        createPeer(
          socketId,
          localStream.current
        );

      };


    // ========================================
    // PLAYER LEFT
    // ========================================

    const handlePlayerLeft =
      ({ socketId }) => {

        console.log(
          "Player left:",
          socketId
        );


        const peer =
          peers.current[
            socketId
          ];


        if (peer) {

          try {

            peer.destroy();

          } catch (error) {}

        }


        delete peers.current[
          socketId
        ];


        const audio =
          document.getElementById(
            `gd-audio-${socketId}`
          );


        if (audio) {

          audio.pause();

          audio.srcObject =
            null;

          audio.remove();

        }

      };


    // ========================================
    // ROOM NOT FOUND
    // ========================================

    const handleRoomNotFound =
      () => {

        setErrorMessage(
          "Room not found."
        );


        setScreen(
          "home"
        );

      };


    // ========================================
    // ROOM FULL
    // ========================================

    const handleRoomFull =
      () => {

        setErrorMessage(
          "This room already has 4 players."
        );


        setScreen(
          "home"
        );

      };


    // ========================================
    // REGISTER EVENTS
    // ========================================

    socket.on(
      "connect",
      handleConnect
    );


    socket.on(
      "disconnect",
      handleDisconnect
    );


    socket.on(
      "player-count",
      handlePlayerCount
    );


    socket.on(
      "player-assigned",
      handlePlayerAssigned
    );


    socket.on(
      "gd-state",
      handleGDState
    );


    socket.on(
      "existing-peer",
      handleExistingPeer
    );


    socket.on(
      "webrtc-signal",
      handleSignal
    );


    socket.on(
      "player-left",
      handlePlayerLeft
    );


    socket.on(
      "room-not-found",
      handleRoomNotFound
    );


    socket.on(
      "room-full",
      handleRoomFull
    );


    // ========================================
    // CLEANUP
    // ========================================

    return () => {

      socket.off(
        "connect",
        handleConnect
      );


      socket.off(
        "disconnect",
        handleDisconnect
      );


      socket.off(
        "player-count",
        handlePlayerCount
      );


      socket.off(
        "player-assigned",
        handlePlayerAssigned
      );


      socket.off(
        "gd-state",
        handleGDState
      );


      socket.off(
        "existing-peer",
        handleExistingPeer
      );


      socket.off(
        "webrtc-signal",
        handleSignal
      );


      socket.off(
        "player-left",
        handlePlayerLeft
      );


      socket.off(
        "room-not-found",
        handleRoomNotFound
      );


      socket.off(
        "room-full",
        handleRoomFull
      );

    };

  }, []);


  // ==========================================
  // GENERATE ROOM ID
  // ==========================================

  const generateRoomId =
    () => {

      const id =
        Math.floor(
          10000000 +
          Math.random() *
          90000000
        ).toString();


      setRoomId(
        id
      );


      setPlayerCount(
        1
      );


      setGdTopic(
        ""
      );


      setErrorMessage(
        ""
      );


      socket.emit(
        "create-room",
        id
      );


      setScreen(
        "waiting"
      );

    };


  // ==========================================
  // COPY ROOM ID
  // ==========================================

  const copyRoomId =
    async () => {

      try {

        await navigator
          .clipboard
          .writeText(
            roomId
          );


        setCopied(
          true
        );


        setTimeout(
          () => {

            setCopied(
              false
            );

          },
          2000
        );

      } catch (error) {

        console.log(
          "Copy failed"
        );

      }

    };


  // ==========================================
  // JOIN ROOM
  // ==========================================

  const handleJoinRoom =
    () => {

      if (
        joinId.length !== 8
      ) {

        setErrorMessage(
          "Please enter an 8-digit Room ID."
        );


        return;

      }


      setRoomId(
        joinId
      );


      setPlayerCount(
        1
      );


      setErrorMessage(
        ""
      );


      socket.emit(
        "join-room",
        joinId
      );


      setScreen(
        "waiting"
      );

    };


  // ==========================================
  // START SPEAKING
  // ==========================================

  const startSpeaking =
    async () => {

      console.log(
        "Start Speaking clicked"
      );


      setErrorMessage(
        ""
      );


      const microphoneStarted =
        await startMicrophone();


      if (
        !microphoneStarted
      ) {

        console.log(
          "Microphone could not start"
        );


        return;

      }


      console.log(
        "Sending start-speaking to server"
      );


      socket.emit(
        "start-speaking",
        roomId
      );

    };


  // ==========================================
  // FINISH SPEAKING
  // ==========================================

  const finishSpeaking =
    () => {

      console.log(
        "Finish Speaking clicked"
      );


      // Stop microphone immediately

      stopMicrophone();


      // Tell server to move to next user

      socket.emit(
        "finish-speaking",
        roomId
      );

    };


  // ==========================================
  // COMPLETED SCREEN
  // ==========================================

  if (
    screen === "completed"
  ) {

    return (

      <div className="gd-page">

        <div className="completed-card">

          <div className="completed-icon">

            <CheckCircle
              size={55}
            />

          </div>


          <span className="gd-badge">

            GROUP DISCUSSION

          </span>


          <h1>

            GD Completed

          </h1>


          <p>

            All four players have
            completed their speaking turns.

          </p>


          <div className="completed-topic">

            <span>

              DISCUSSION TOPIC

            </span>


            <strong>

              {gdTopic}

            </strong>

          </div>


          <div className="completed-players">

            <Users size={18} />

            4 Players Completed

          </div>

        </div>

      </div>

    );

  }


  // ==========================================
  // GD SCREEN
  // ==========================================

  if (
    screen === "gd"
  ) {

    const myTurn =
      Number(myPlayerNumber) ===
      Number(currentTurn + 1);


    const currentUser =
      `User ${currentTurn + 1}`;


    return (

      <div className="gd-page">

        <div className="gd-session-header">

          <div>

            <span className="gd-badge">

              LIVE GROUP DISCUSSION

            </span>


            <h1>

              Group Discussion

            </h1>

          </div>


          <div className="live-indicator">

            <span></span>

            LIVE

          </div>

        </div>


        <div className="gd-topic-card">

          <div className="topic-icon">

            <MessageCircle
              size={24}
            />

          </div>


          <div>

            <span>

              DISCUSSION TOPIC

            </span>


            <h2>

              {gdTopic}

            </h2>

          </div>

        </div>


        <div className="gd-room">

          <div
            className={`gd-player player-top ${
              currentTurn === 0
                ? "active-player"
                : ""
            }`}
          >

            <div className="player-seat">

              <User size={22} />

            </div>


            <div className="player-name">

              User 1

              {myPlayerNumber === 1
                ? " (You)"
                : ""}

            </div>

          </div>


          <div
            className={`gd-player player-right ${
              currentTurn === 1
                ? "active-player"
                : ""
            }`}
          >

            <div className="player-seat">

              <User size={22} />

            </div>


            <div className="player-name">

              User 2

              {myPlayerNumber === 2
                ? " (You)"
                : ""}

            </div>

          </div>


          <div
            className={`gd-player player-bottom ${
              currentTurn === 2
                ? "active-player"
                : ""
            }`}
          >

            <div className="player-seat">

              <User size={22} />

            </div>


            <div className="player-name">

              User 3

              {myPlayerNumber === 3
                ? " (You)"
                : ""}

            </div>

          </div>


          <div
            className={`gd-player player-left ${
              currentTurn === 3
                ? "active-player"
                : ""
            }`}
          >

            <div className="player-seat">

              <User size={22} />

            </div>


            <div className="player-name">

              User 4

              {myPlayerNumber === 4
                ? " (You)"
                : ""}

            </div>

          </div>


          <div className="discussion-table">

            <div className="table-inner">

              <MessageCircle
                size={38}
              />

              <span>

                GD ROOM

              </span>


              <small>

                Discuss respectfully

              </small>

            </div>

          </div>

        </div>


        <div className="turn-panel">

          <div className="turn-icon">

            {speaking ? (

              <Mic size={21} />

            ) : (

              <MicOff size={21} />

            )}

          </div>


          <div className="turn-info">

            <span>

              {myTurn
                ? "YOUR TURN"
                : "CURRENT TURN"}

            </span>


            <strong>

              {myTurn
                ? "Your Turn"
                : `${currentUser}'s Turn`}

            </strong>

          </div>


          <div className="turn-timer">

            <Clock size={19} />


            <strong>

              {String(
                Math.floor(
                  timeLeft / 60
                )
              ).padStart(
                2,
                "0"
              )}

              :

              {String(
                timeLeft % 60
              ).padStart(
                2,
                "0"
              )}

            </strong>

          </div>

        </div>


        <div className="speaking-action">

          {!speaking && (

            <>

              <p>

                {myTurn
                  ? "It's your turn. Click below when you're ready to speak."
                  : `${currentUser} has the turn. Wait until it is your turn.`}

              </p>


              <button
                className="start-speaking-btn"
                onClick={
                  startSpeaking
                }
                disabled={
                  !myTurn
                }
              >

                <Mic size={19} />


                {myTurn
                  ? "Start Speaking"
                  : `Waiting for ${currentUser}`}

              </button>

            </>

          )}


          {speaking && (

            <>

              <p className="speaking-now">

                <span className="speaking-dot"></span>


                {myTurn
                  ? "You are speaking..."
                  : `${currentUser} is speaking...`}

              </p>


              {myTurn && (

                <button
                  className="finish-speaking-btn"
                  onClick={
                    finishSpeaking
                  }
                >

                  <Square
                    size={17}
                  />

                  Finish Speaking

                </button>

              )}

            </>

          )}

        </div>


        <div className="gd-session-info">

          <span>

            <Users size={16} />

            4 Players

          </span>


          <span>

            Turn{" "}
            {currentTurn + 1}
            {" "}
            of 4

          </span>


          <span>

            {micEnabled
              ? "🎤 Microphone ON"
              : "Microphone OFF"}

          </span>

        </div>

      </div>

    );

  }


  // ==========================================
  // WAITING ROOM
  // ==========================================

  if (
    screen === "waiting"
  ) {

    return (

      <div className="gd-page">

        <div className="waiting-room">

          <div className="waiting-header">

            <span className="gd-badge">

              GROUP DISCUSSION

            </span>


            <h1>

              Waiting for players

            </h1>


            <p>

              Your GD will begin
              automatically when
              4 players have joined.

            </p>

          </div>


          <div className="waiting-content">

            <div className="gd-visual">

              <div className="visual-circle circle-one">

                <User size={26} />

              </div>


              <div className="visual-circle circle-two">

                <User size={26} />

              </div>


              <div className="visual-circle circle-three">

                <User size={26} />

              </div>


              <div className="visual-circle circle-four">

                <User size={26} />

              </div>


              <div className="visual-center">

                <MessageCircle
                  size={40}
                />

              </div>

            </div>


            <div className="waiting-panel">

              <div className="room-info">

                <span>

                  ROOM ID

                </span>


                <div className="room-id-display">

                  <strong>

                    {roomId}

                  </strong>


                  <button
                    className="copy-btn"
                    onClick={
                      copyRoomId
                    }
                  >

                    {copied ? (

                      <Check size={18} />

                    ) : (

                      <Copy size={18} />

                    )}

                  </button>

                </div>


                <small>

                  Share this ID with
                  the other players.

                </small>

              </div>


              <div className="player-count">

                <div className="player-count-title">

                  <Users size={20} />

                  <span>

                    Players Joined

                  </span>

                </div>


                <div className="player-number">

                  {playerCount}

                  <span>

                    {" "}/ 4

                  </span>

                </div>

              </div>


              <div className="player-slots">

                {[0, 1, 2, 3].map(
                  (index) => {

                    const joined =
                      index <
                      playerCount;


                    return (

                      <div
                        className={`player-slot ${
                          joined
                            ? "joined"
                            : ""
                        }`}
                        key={index}
                      >

                        <div
                          className={`slot-avatar ${
                            joined
                              ? ""
                              : "empty"
                          }`}
                        >

                          <User
                            size={17}
                          />

                        </div>


                        <span>

                          {joined
                            ? `Player ${
                                index + 1
                              }`
                            : "Waiting..."}

                        </span>


                        {joined && (

                          <Check
                            size={17}
                          />

                        )}

                      </div>

                    );

                  }
                )}

              </div>


              <div className="waiting-status">

                <span className="pulse-dot"></span>


                <span>

                  {playerCount < 4
                    ? `Waiting for ${
                        4 -
                        playerCount
                      } more player${
                        4 -
                          playerCount ===
                        1
                          ? ""
                          : "s"
                      }...`
                    : "All players joined! Starting GD..."}

                </span>

              </div>


              <div
                style={{
                  marginTop:
                    "12px",

                  fontSize:
                    "11px",

                  color:
                    connectionStatus
                      ? "#63dda6"
                      : "#ff7777",
                }}
              >

                {connectionStatus
                  ? "● Server connected"
                  : "● Server disconnected"}

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  }


  // ==========================================
  // HOME
  // ==========================================

  return (

    <div className="gd-page">

      <div className="gd-header">

        <span className="gd-badge">

          GROUP DISCUSSION

        </span>


        <h1>

          GD Room

        </h1>


        <p>

          Practice, discuss,
          and build confidence
          with other students.

        </p>

      </div>


      <div className="gd-options">

        <div className="gd-card">

          <div className="gd-card-icon">

            <Users size={25} />

          </div>


          <h2>

            Create a GD Room

          </h2>


          <p>

            Create a room and invite
            other students using the
            generated 8-digit room ID.

          </p>


          <button
            className="gd-primary-btn"
            onClick={
              generateRoomId
            }
          >

            Generate Room ID

            <ArrowRight size={17} />

          </button>

        </div>


        <div className="gd-or">

          OR

        </div>


        <div className="gd-card">

          <div className="gd-card-icon">

            <ArrowRight size={25} />

          </div>


          <h2>

            Enter a GD Room

          </h2>


          <p>

            Already have a room ID?
            Enter it below to join
            the discussion.

          </p>


          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 8-digit Room ID"
            maxLength="8"
            value={joinId}
            onChange={(e) => {

              const value =
                e.target.value
                  .replace(
                    /\D/g,
                    ""
                  )
                  .slice(
                    0,
                    8
                  );


              setJoinId(
                value
              );


              setErrorMessage(
                ""
              );

            }}
          />


          <button
            className="gd-primary-btn"
            onClick={
              handleJoinRoom
            }
            disabled={
              joinId.length !== 8
            }
          >

            Join Room

            <ArrowRight size={17} />

          </button>


          {errorMessage && (

            <p
              style={{
                color:
                  "#ff7777",

                marginTop:
                  "10px",

                fontSize:
                  "12px",
              }}
            >

              {errorMessage}

            </p>

          )}

        </div>

      </div>

    </div>

  );

}


export default GD;