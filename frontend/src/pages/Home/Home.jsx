import React, { useState, useEffect } from 'react';
import Video from './components/Video.jsx'
import { io } from 'socket.io-client';
import SearchVideos from './components/SearchVideos.jsx';
import UploadVideo from './components/UploadVideo.jsx';

function Home() {
  const [currentVideo, setCurrentVideo] = useState();   // video a revisar
  const [socketInstance, setSocketInstance] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState(false);

  const handleConnect = () => {
    setConnectStatus(!connectStatus);
  }

  useEffect(() => {
    if (connectStatus === true) {
      const socket = io("localhost:5000/", {
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

  return (
    <div className="App">
      <UploadVideo />
      <SearchVideos
        setCurrentVideo={setCurrentVideo}
        setConnectStatus={setConnectStatus}/>
      {currentVideo ? (
        <>
          {!connectStatus ? (
            <button onClick={handleConnect}>Conectar a la camara {currentVideo}</button>
          ) : (
            <>
              <button onClick={handleConnect}>Desconectar del servidor</button>
              {!loading && <Video socket={socketInstance} video={currentVideo} />}
            </>
          )}
        </>
      ) : (
        <p>no video seleccionado</p>
      )}
    </div>
  );
}

export default Home;
