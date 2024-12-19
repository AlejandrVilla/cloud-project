import React, { useState, useEffect } from 'react';
import Video from './components/Video.jsx'
import { io } from 'socket.io-client';
import SearchVideos from './components/SearchVideos.jsx';
import UploadVideo from './components/UploadVideo.jsx';
import SearchFrame from './components/SearchFrame.jsx';
import "./home.scss";

const SERVER_URL = `ws://${import.meta.env.VITE_SERVER_URL}/`;
// const SERVER_URL = `ws://${import.meta.env.VITE_DEV_SERVER_URL}:5000/`;

function Home() {
  const [currentVideo, setCurrentVideo] = useState();   // video a revisar
  const [socketInstance, setSocketInstance] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState(false);
  const [currentOption, setCurrentOption] = useState("");

  const handleConnect = () => {
    setConnectStatus(!connectStatus);
  }

  useEffect(() => {
    if (connectStatus === true) {
      const socket = io(SERVER_URL, {
        transports: ["websocket"],
        cors: {
          origin: "*",
        },
      });

      setSocketInstance(socket);

      socket.on("succes_connect", (data) => {
        console.log("connected to server");
        console.log(data);
      })

      setLoading(false);

      socket.on("disconnect", (data) => {
        console.log("disconnected from server")
        console.log(data);
      })

      return function cleanup() {
        socket.disconnect();
      };
    }
  }, [connectStatus]);

  let option = <></>
  if (currentOption === "video") {
    option = <div
      className={`option-video${currentOption === "video" ? " active" : ""}`}>
      {!connectStatus ? (
        <>
          <button onClick={handleConnect}>Conectar al servidor ({currentVideo})</button>
        </>
      ) : (
        <>
          <button onClick={handleConnect}>Desconectar del servidor</button>
          {!loading && <Video socket={socketInstance} video={currentVideo} />}
        </>
      )}
    </div>
  }
  else if (currentOption === "frame") {
    option = <div
              className={`option-search-frame${currentOption === "frame" ? " active" : ""}`}>
              <SearchFrame currentVideo={currentVideo} />
            </div>
  }

  return (
    <div className="home">
      <UploadVideo />
      <div className='home-content'>
        <SearchVideos
          setCurrentOption={setCurrentOption}
          setCurrentVideo={setCurrentVideo}
          setConnectStatus={setConnectStatus} />
        <div className='home-display'>
          {currentVideo ? (
            <>
              <div className='home-buttons'>
                <button onClick={() => setCurrentOption("video")}>video</button>
                <button onClick={() => setCurrentOption("frame")}>frame</button>
              </div>
              {option}
            </>
          ) : (
            <h2>no video seleccionado</h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
