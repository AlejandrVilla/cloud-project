import { useState, useEffect } from "react";
import axios from 'axios';
import "./searchVideo.scss";

const SERVER_URL = `http://${import.meta.env.VITE_SERVER_URL}/videos`;
// const SERVER_URL = `http://${import.meta.env.VITE_DEV_SERVER_URL}:5001/videos`;

const SearchVideos = ({ setCurrentOption, setCurrentVideo, setConnectStatus }) => {
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
        setCurrentOption("");
    }

    const handleVideo = (video) => {
        setConnectStatus(false);
        setCurrentVideo(video);
        setCurrentOption("");
    }

    return (
        <div className="search-video">
            <button onClick={handleUpdate}>Actualizar</button>
            {loadingCameras ? (
                <p>loading...</p>
            ) : (
                <div className="video-list">
                    {videos.length === 0 ? (
                        <p>No hay camaras disponibles</p>
                    ) : (
                        <>
                            <h2>Selecciona una camara</h2>
                            <div className="video-list-content">
                                {videos.map((video, index) => (
                                    <button key={index} onClick={() => handleVideo(video)}>{video}</button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchVideos;