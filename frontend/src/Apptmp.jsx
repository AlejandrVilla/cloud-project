import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');

function App() {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);

    useEffect(() => {
        // Cargar lista de videos
        axios.get('http://localhost:5000/videos')
            .then(res => setVideos(res.data))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        socket.on("connect", (data) => {
            console.log("connected to server");
            // console.log(data);
        })

        // socket.on("disconnect", (data) => {
        //     console.log(data);
        // })

        // Recibir frames desde el servidor
        socket.on('frame', (frame) => {
            const base64Frame = `data:image/jpeg;base64,${btoa(
                new Uint8Array(frame).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )}`;
            setCurrentFrame(base64Frame); // Actualiza el frame actual
        });

        socket.on('end_of_video', () => {
            alert('Video completo');
        });

        return () => {
            socket.off('frame');
            socket.off('end_of_video');
        };
    }, []);

    const handlePlayVideo = (video) => {
        setSelectedVideo(video);
        setCurrentFrame(null); // Reinicia el frame actual
        socket.emit('process_video', { filename: video });
    };

    return (
        <div className="App">
            <h1>Videos de Cámaras de Seguridad</h1>
            <div>
                <h2>Selecciona un video:</h2>
                {videos.map(video => (
                    <button key={video} onClick={() => handlePlayVideo(video)}>
                        {video}
                    </button>
                ))}
            </div>
            {selectedVideo && (
                <div>
                    <h2>Reproduciendo: {selectedVideo}</h2>
                    <div>
                        {currentFrame ? (
                            <img src={currentFrame} alt="Current Frame" style={{ width: '100%' }} />
                        ) : (
                            <p>Cargando...</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
