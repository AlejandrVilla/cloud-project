import { useState, useEffect } from "react";
import axios from 'axios';

const SERVER_URL = `${import.meta.env.VITE_SERVER_URL}/videos`;
// const SERVER_URL = "http://127.0.0.1:5000/videos";

const SearchVideos = ({ setCurrentVideo, setConnectStatus}) => {
    const [videos, setVideos] = useState([]);      // lista de videos en el servidor
    const [loadingCameras, setLoadingCameras] = useState(true);

    useEffect(() => {
        // Cargar lista de videos
        axios.get(SERVER_URL)
            .then(res => setVideos(res.data))
            .catch(err => {
                console.error(`error: ${err}`);
                setVideos([]);
                setCurrentVideo("");
                setConnectStatus(false);
            });
        setLoadingCameras(false);
    }, [loadingCameras]);

    const handleUpdate = () => {
        setLoadingCameras(true);
        setCurrentVideo("");
        setConnectStatus(false);
    }

    const handleVideo = (video) => {
        setCurrentVideo(video);
    }

    return (
        <div>
            <button onClick={handleUpdate}>Actualizar</button>
            {loadingCameras ? (
                <p>loading...</p>
            ) : (
                <div>
                    {videos.length === 0 ? (
                        <p>No hay camaras disponibles</p>
                    ) : (
                        <>
                            <h2>Selecciona una camara:</h2>
                            {videos.map((video, index) => (
                                <button key={index} onClick={() => handleVideo(video)}>{video}</button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchVideos;